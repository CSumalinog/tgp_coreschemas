// src/hooks/useRequestAssistant.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRequestAssistant(request) {
  const [checks, setChecks] = useState(null);

  useEffect(() => {
    if (!request) {
      setChecks(null);
      return;
    }
    runChecks();
  }, [request?.id]);

  const runChecks = async () => {
    const results = {
      lateSubmission: checkLateSubmission(request),
      incomplete: checkIncomplete(request),
      newsworthiness: checkNewsworthiness(request),
      conflict: null,
      loading: true,
    };

    setChecks({ ...results });

    const conflict = await checkConflict(request);
    setChecks({ ...results, conflict, loading: false });
  };

  return checks;
}

// ── 1. Late Submission ─────────────────────────────────────────────────────
function checkLateSubmission(request) {
  if (!request.event_date || !request.submitted_at) return null;

  const eventDate   = new Date(request.event_date);
  const submittedAt = new Date(request.submitted_at);

  eventDate.setHours(0, 0, 0, 0);
  submittedAt.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (eventDate - submittedAt) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 1)
    return { type: "error", message: "Submitted on the same day as the event or after." };
  if (diffDays < 2)
    return { type: "warning", message: `Submitted only ${diffDays} day before the event. Minimum is 2 days.` };
  return { type: "success", message: `Submitted ${diffDays} days before the event. ✓` };
}

// ── 2. Incomplete Request ──────────────────────────────────────────────────
function checkIncomplete(request) {
  const issues = [];

  if (!request.file_url)
    issues.push("No program flow (PDF) attached.");
  if (!request.description || request.description.trim().length < 20)
    issues.push("Description is too short or vague.");
  if (!request.contact_person || !request.contact_info)
    issues.push("Missing contact information.");

  const totalPax = Object.values(request.services || {}).reduce((sum, v) => sum + v, 0);
  if (totalPax === 0)
    issues.push("No services requested.");

  if (issues.length === 0)
    return { type: "success", message: "Request appears complete. ✓" };

  return { type: issues.length >= 2 ? "error" : "warning", issues };
}

// ── 3. Scheduling Conflict ─────────────────────────────────────────────────
async function checkConflict(request) {
  if (!request.event_date) return null;

  try {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, from_time, to_time, status")
      .eq("event_date", request.event_date)
      .in("status", ["Approved", "Ongoing", "Forwarded"])
      .neq("id", request.id);

    if (error) return null;
    if (!data || data.length === 0)
      return { type: "success", message: "No scheduling conflicts found. ✓" };

    return {
      type: "warning",
      message: `${data.length} other coverage(s) scheduled on this date:`,
      conflicts: data.map((r) => ({
        title:  r.title,
        time:   r.from_time && r.to_time ? `${r.from_time} - ${r.to_time}` : "Time TBD",
        status: r.status,
      })),
    };
  } catch {
    return null;
  }
}

// ── 4. Newsworthiness (3-Filter System) ───────────────────────────────────
function checkNewsworthiness(request) {
  const text       = `${request.title || ""} ${request.description || ""}`.toLowerCase();
  const clientType = request.client_type?.name?.toLowerCase() || "";
  const totalPax   = Object.values(request.services || {}).reduce((s, v) => s + v, 0);
  const serviceCount = Object.values(request.services || {}).filter((v) => v > 0).length;

  let filtersPassed = 0;
  const reasons = [];

  // ── FILTER 1: RELEVANCE ──
  const universityWide = [
    "university", "college", "csu", "caraga state",
    "student affairs", "registrar", "vpaa", "vpaf",
    "student council", "ssg", "supreme", "central",
  ];
  const departmentLevel = [
    "department", "college of", "faculty", "institute",
    "school of", "office of",
  ];
  const lowRelevance = [
    "birthday", "despedida", "farewell", "party",
    "outing", "fellowship", "get together", "acquaintance",
  ];

  const isLowRelevance    = lowRelevance.some((k) => text.includes(k));
  const isUniversityWide  = universityWide.some((k) => clientType.includes(k) || text.includes(k));
  const isDepartmentLevel = departmentLevel.some((k) => clientType.includes(k) || text.includes(k));

  if (isLowRelevance) {
    reasons.push("Low public relevance — primarily personal or social in nature.");
  } else if (isUniversityWide) {
    filtersPassed++;
    reasons.push("University-wide relevance — affects the broader student community.");
  } else if (isDepartmentLevel) {
    filtersPassed++;
    reasons.push("Department-level relevance — meaningful to a specific college or office.");
  } else {
    filtersPassed++;
    reasons.push("Organization-level relevance — serves a recognized campus community.");
  }

  // ── FILTER 2: NEWSWORTHINESS TYPE ──
  const criticalEvents = [
    "graduation", "commencement", "convocation", "recognition",
    "awarding", "press conference", "presscon", "policy",
    "enrollment", "opening ceremony", "inauguration", "conferment",
    "foundation day", "anniversary", "general assembly", "summit",
    "forum", "symposium", "seminar", "congress", "convention",
  ];
  const goodStories = [
    "competition", "contest", "sportsfest", "cultural",
    "exhibit", "showcase", "performance", "talent",
    "volunteer", "outreach", "extension", "campaign",
  ];
  const routineEvents = [
    "meeting", "orientation", "training", "workshop",
    "team building", "planning", "coordination",
  ];

  const isCritical  = criticalEvents.some((k) => text.includes(k));
  const isGoodStory = goodStories.some((k) => text.includes(k));
  const isRoutine   = routineEvents.some((k) => text.includes(k));

  if (isCritical) {
    filtersPassed++;
    reasons.push("High-impact event type — strong publishable story.");
  } else if (isGoodStory) {
    filtersPassed++;
    reasons.push("Good human interest story — worth covering for campus community.");
  } else if (isRoutine && !isCritical) {
    reasons.push("Routine event — limited story potential unless outcomes are significant.");
  } else {
    filtersPassed += 0.5;
    reasons.push("Moderate story potential — outcome depends on event significance.");
  }

  // ── FILTER 3: RESOURCE JUSTIFICATION ──
  if (totalPax >= 5 || serviceCount >= 3) {
    filtersPassed++;
    reasons.push("Significant resource investment justified by event scale.");
  } else if (totalPax >= 2 || serviceCount >= 2) {
    filtersPassed += 0.5;
    reasons.push("Moderate resource request — manageable coverage load.");
  } else {
    reasons.push("Minimal coverage requested — may not require full team deployment.");
  }

  // ── Score mapping ──
  let score;
  if (filtersPassed >= 3)        score = 5;
  else if (filtersPassed >= 2.5) score = 4;
  else if (filtersPassed >= 2)   score = 3;
  else if (filtersPassed >= 1)   score = 2;
  else                           score = 1;

  const labels = { 1: "Low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very High" };
  const recommendations = {
    1: "Decline",
    2: "Consider declining",
    3: "Forward with note",
    4: "Forward immediately",
    5: "Forward immediately",
  };

  return {
    type:           "ai",
    score,
    label:          labels[score],
    reasoning:      reasons.join(" "),
    recommendation: recommendations[score],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone exports for use outside the hook (e.g. reschedule flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check for scheduling conflicts on a specific date.
 * @param {string} eventDate  - "YYYY-MM-DD"
 * @param {string} excludeId  - request ID to exclude from results
 */
export async function checkConflictForDate(eventDate, excludeId) {
  if (!eventDate) return null;
  try {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, from_time, to_time, status")
      .eq("event_date", eventDate)
      .in("status", ["Approved", "Ongoing", "Forwarded"])
      .neq("id", excludeId);

    if (error) return null;
    if (!data || data.length === 0)
      return { type: "success", message: "No scheduling conflicts on the new date. ✓" };

    return {
      type:    "warning",
      message: `${data.length} other coverage(s) already scheduled on this date:`,
      conflicts: data.map((r) => ({
        title:  r.title,
        time:   r.from_time && r.to_time ? `${r.from_time} - ${r.to_time}` : "Time TBD",
        status: r.status,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Check if a new event date is too close to today.
 * @param {string} eventDate - "YYYY-MM-DD"
 */
export function checkLateSubmissionForDate(eventDate) {
  if (!eventDate) return null;

  const event = new Date(eventDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((event - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 1)
    return { type: "error", message: "New date is today or in the past." };
  if (diffDays < 2)
    return { type: "warning", message: `New date is only ${diffDays} day away. Minimum lead time is 2 days.` };
  return { type: "success", message: `New date is ${diffDays} days from today. ✓` };
}
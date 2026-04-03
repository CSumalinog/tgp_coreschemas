// src/components/admin/ReportGenerator.jsx
// Requires: npm install jspdf jspdf-autotable
//
// Usage in Dashboard:
//   <ReportGenerator selectedSemester={selectedSemester} isAllTime={isAllTime} />

import React, { useState } from "react";
import {
  Box, Typography, Button, CircularProgress, Alert, Divider, Chip, useTheme,
} from "@mui/material";
import DownloadOutlinedIcon           from "@mui/icons-material/DownloadOutlined";
import AssignmentOutlinedIcon         from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon             from "@mui/icons-material/CancelOutlined";
import TrendingUpOutlinedIcon         from "@mui/icons-material/TrendingUpOutlined";
import AccessTimeOutlinedIcon         from "@mui/icons-material/AccessTimeOutlined";
import { supabase }                   from "../../lib/supabaseClient";

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTION_COLORS = {
  News:            { bg: "#e3f2fd", color: "#1565c0" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toEndOfDay(dateStr) {
  return new Date(dateStr).toISOString().split("T")[0] + "T23:59:59";
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── PDF helpers ───────────────────────────────────────────────────────────────
const PAGE_H = 297;
const MARGIN  = 14;

function addPageIfNeeded(doc, y, needed = 20) {
  if (y + needed > PAGE_H - 16) { doc.addPage(); return 20; }
  return y;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReportGenerator({ selectedSemester, isAllTime }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [fetching,   setFetching]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState("");
  const [preview,    setPreview]    = useState(null);

  // ── Fetch & compute all report data ──────────────────────────────────────────
  async function fetchReportData() {
    setFetching(true); setError(""); setPreview(null);
    try {
      let reqQuery = supabase
        .from("coverage_requests")
        .select("id, title, status, event_date, venue, submitted_at, approved_at, entity:entity_id(name)")
        .is("archived_at", null)
        .is("trashed_at", null);
      if (!isAllTime && selectedSemester) {
        reqQuery = reqQuery
          .gte("submitted_at", selectedSemester.start_date)
          .lte("submitted_at", toEndOfDay(selectedSemester.end_date));
      }
      const { data: requests, error: reqErr } = await reqQuery.order("submitted_at", { ascending: false });
      if (reqErr) throw reqErr;

      let assignQuery = supabase
        .from("coverage_assignments")
        .select(`
          section, status, assigned_at, assigned_to,
          profiles:assigned_to(full_name),
          coverage_requests:request_id(title, event_date, venue, entity:entity_id(name))
        `);
      if (!isAllTime && selectedSemester) {
        assignQuery = assignQuery
          .gte("assigned_at", selectedSemester.start_date)
          .lte("assigned_at", toEndOfDay(selectedSemester.end_date));
      }
      const { data: assignments } = await assignQuery;

      const total     = requests?.length || 0;
      const approved  = (requests || []).filter((r) => r.status === "Approved").length;
      const declined  = (requests || []).filter((r) => r.status === "Declined").length;
      const covered   = (requests || []).filter((r) => ["Coverage Complete", "Approved"].includes(r.status)).length;
      const assigned  = (requests || []).filter((r) => ["Assigned", "Coverage Complete", "Approved"].includes(r.status)).length;
      const pending   = (requests || []).filter((r) => r.status === "Pending").length;
      const forwarded = (requests || []).filter((r) => r.status === "Forwarded").length;
      const declineRate    = total > 0    ? ((declined / total)    * 100).toFixed(1) : "0.0";
      const completionRate = assigned > 0 ? ((covered  / assigned) * 100).toFixed(1) : "0.0";
      const turnaroundDays = (requests || []).filter((r) => r.approved_at && r.submitted_at).map((r) => (new Date(r.approved_at) - new Date(r.submitted_at)) / (1000 * 60 * 60 * 24));
      const avgTurnaround  = turnaroundDays.length > 0 ? (turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length).toFixed(1) : null;

      const sectionMap = { News: { pending: 0, completed: 0, total: 0 }, Photojournalism: { pending: 0, completed: 0, total: 0 }, Videojournalism: { pending: 0, completed: 0, total: 0 } };
      (assignments || []).forEach((a) => {
        if (!sectionMap[a.section]) return;
        sectionMap[a.section].total++;
        if (a.status === "Pending")   sectionMap[a.section].pending++;
        if (a.status === "Completed") sectionMap[a.section].completed++;
      });
      const sectionWorkload = Object.entries(sectionMap).map(([section, d]) => ({ section, ...d }));

      const stafferMap = {};
      (assignments || []).forEach((a) => {
        if (!a.assigned_to) return;
        const name = a.profiles?.full_name || a.assigned_to;
        if (!stafferMap[a.assigned_to]) stafferMap[a.assigned_to] = { name, section: a.section, count: 0, events: [] };
        stafferMap[a.assigned_to].count++;
        stafferMap[a.assigned_to].events.push({ title: a.coverage_requests?.title || "—", eventDate: fmtDate(a.coverage_requests?.event_date), venue: a.coverage_requests?.venue || "—", client: a.coverage_requests?.entity?.name || "—", status: a.status });
      });
      Object.values(stafferMap).forEach((s) => { s.events.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)); });
      const stafferList = Object.values(stafferMap).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      const approvedRequests = (requests || []).filter((r) => r.status === "Approved").map((r) => ({ title: r.title, client: r.entity?.name || "—", eventDate: fmtDate(r.event_date), submittedAt: fmtDate(r.submitted_at), venue: r.venue || "—" }));
      const declinedRequests = (requests || []).filter((r) => r.status === "Declined").map((r) => ({ title: r.title, client: r.entity?.name || "—", eventDate: fmtDate(r.event_date), submittedAt: fmtDate(r.submitted_at) }));
      const pendingRequests  = (requests || []).filter((r) => ["Pending", "Forwarded", "Assigned"].includes(r.status)).map((r) => ({ title: r.title, client: r.entity?.name || "—", eventDate: fmtDate(r.event_date), status: r.status, submittedAt: fmtDate(r.submitted_at) }));

      const assignedRequestIds = new Set((assignments || []).map((a) => a.coverage_requests?.title));
      const unassignedEvents = (requests || []).filter((r) => r.status === "Forwarded" && !assignedRequestIds.has(r.title)).map((r) => ({ title: r.title, client: r.entity?.name || "—", eventDate: fmtDate(r.event_date), venue: r.venue || "—" }));

      const clientMap = {};
      (requests || []).forEach((r) => {
        const name = r.entity?.name || "Unknown";
        if (!clientMap[name]) clientMap[name] = { total: 0, approved: 0, declined: 0, pending: 0 };
        clientMap[name].total++;
        if (r.status === "Approved") clientMap[name].approved++;
        if (r.status === "Declined") clientMap[name].declined++;
        if (["Pending", "Forwarded", "Assigned"].includes(r.status)) clientMap[name].pending++;
      });
      const clientList = Object.entries(clientMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total);

      setPreview({
        period: isAllTime ? "All Time" : selectedSemester?.name,
        generatedAt: new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        stats: { total, approved, declined, covered, pending, forwarded, declineRate, completionRate, avgTurnaround },
        sectionWorkload, stafferList, approvedRequests, declinedRequests, pendingRequests, unassignedEvents, clientList,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  // ── Generate & download PDF ───────────────────────────────────────────────────
  async function generatePDF() {
    if (!preview) return;
    setGenerating(true);
    try {
      // ✅ Dynamically imported — jsPDF is NOT bundled into the main chunk
      const { default: jsPDF }     = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W   = doc.internal.pageSize.getWidth();
      let y     = 0;

      const sectionHeading = (label) => {
        y = addPageIfNeeded(doc, y, 12);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        doc.text(label.toUpperCase(), MARGIN, y);
        doc.setDrawColor(220, 220, 220); doc.line(MARGIN, y + 1.5, W - MARGIN, y + 1.5);
        y += 7;
      };

      const addTable = (opts) => {
        autoTable(doc, { ...opts, startY: y, styles: { fontSize: 8, cellPadding: 2.5, font: "helvetica", overflow: "linebreak" }, headStyles: { fillColor: [245, 197, 43], textColor: [33, 33, 33], fontStyle: "bold", fontSize: 8 }, alternateRowStyles: { fillColor: [249, 249, 249] }, margin: { left: MARGIN, right: MARGIN }, tableWidth: W - MARGIN * 2, didDrawPage: (data) => { drawFooter(doc, W); } });
        y = doc.lastAutoTable.finalY + 8;
      };

      const drawFooter = (d, w) => {
        const pageCount   = d.internal.getNumberOfPages();
        const currentPage = d.internal.getCurrentPageInfo().pageNumber;
        d.setFont("helvetica", "normal"); d.setFontSize(7); d.setTextColor(180, 180, 180);
        d.text(`Page ${currentPage} of ${pageCount}`, w - MARGIN, PAGE_H - 8, { align: "right" });
        d.text("Coverage Operations Report — Confidential", MARGIN, PAGE_H - 8);
      };

      doc.setFillColor(245, 197, 43); doc.rect(0, 0, W, 32, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(33, 33, 33);
      doc.text("Coverage Operations Report", MARGIN, 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      doc.text(`Period: ${preview.period}`, MARGIN, 21);
      doc.text(`Generated: ${preview.generatedAt}`, MARGIN, 27);
      y = 42;

      sectionHeading("Summary");
      const stats = [
        { label: "Total Submitted", value: String(preview.stats.total) },
        { label: "Approved",        value: String(preview.stats.approved) },
        { label: "Declined",        value: `${preview.stats.declined} (${preview.stats.declineRate}%)` },
        { label: "Completion Rate", value: `${preview.stats.completionRate}%` },
        { label: "Avg Turnaround",  value: preview.stats.avgTurnaround ? `${preview.stats.avgTurnaround} days` : "—" },
        { label: "Still Pending",   value: String(preview.stats.pending) },
        { label: "Forwarded",       value: String(preview.stats.forwarded) },
        { label: "Total Covered",   value: String(preview.stats.covered) },
      ];
      const colW = (W - MARGIN * 2 - 4) / 2;
      stats.forEach((s, i) => {
        const col = i % 2;
        const x   = MARGIN + col * (colW + 4);
        doc.setFillColor(249, 249, 249); doc.roundedRect(x, y, colW, 14, 2, 2, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.text(s.label, x + 4, y + 5);
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(33, 33, 33); doc.text(s.value, x + 4, y + 12);
        if (col === 1) y += 17;
      });
      if (stats.length % 2 !== 0) y += 17;
      y += 4;

      sectionHeading("Section Workload");
      addTable({ head: [["Section", "Total Assignments", "Pending", "Completed"]], body: preview.sectionWorkload.map((s) => [s.section, s.total, s.pending, s.completed]), columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 }, 3: { cellWidth: 32 } } });

      sectionHeading("Coverage by Client / Entity");
      addTable({ head: [["Client", "Total", "Approved", "Declined", "Pending"]], body: preview.clientList.map((c) => [c.name, c.total, c.approved, c.declined, c.pending]), columnStyles: { 0: { cellWidth: 80 } } });

      if (preview.stafferList.length > 0) {
        y = addPageIfNeeded(doc, y, 30);
        sectionHeading("Staffer Workload — Full Detail");
        preview.stafferList.forEach((staffer) => {
          y = addPageIfNeeded(doc, y, 24);
          doc.setFillColor(255, 253, 231); doc.roundedRect(MARGIN, y, W - MARGIN * 2, 10, 1.5, 1.5, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(33, 33, 33); doc.text(staffer.name, MARGIN + 4, y + 7);
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
          doc.text(`${staffer.section}  ·  ${staffer.count} assignment${staffer.count !== 1 ? "s" : ""}`, W - MARGIN - 4, y + 7, { align: "right" });
          y += 13;
          if (staffer.events.length === 0) {
            doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
            doc.text("No events found.", MARGIN + 4, y); y += 8;
          } else {
            addTable({ head: [["Event Title", "Client", "Event Date", "Venue", "Status"]], body: staffer.events.map((e) => [e.title, e.client, e.eventDate, e.venue, e.status]), columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 40 }, 4: { cellWidth: 25 } } });
          }
        });
      }

      if (preview.approvedRequests.length > 0) {
        y = addPageIfNeeded(doc, y, 20); sectionHeading("Approved Coverage Requests");
        addTable({ head: [["Event Title", "Client", "Event Date", "Venue", "Submitted"]], body: preview.approvedRequests.map((r) => [r.title, r.client, r.eventDate, r.venue, r.submittedAt]), columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 40 }, 4: { cellWidth: 25 } } });
      }

      if (preview.declinedRequests.length > 0) {
        y = addPageIfNeeded(doc, y, 20); sectionHeading("Declined Requests");
        addTable({ head: [["Event Title", "Client", "Event Date", "Submitted"]], body: preview.declinedRequests.map((r) => [r.title, r.client, r.eventDate, r.submittedAt]), columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 }, 3: { cellWidth: 32 } } });
      }

      if (preview.pendingRequests.length > 0) {
        y = addPageIfNeeded(doc, y, 20); sectionHeading("Pending / Unresolved Requests");
        addTable({ head: [["Event Title", "Client", "Event Date", "Status", "Submitted"]], body: preview.pendingRequests.map((r) => [r.title, r.client, r.eventDate, r.status, r.submittedAt]), columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 28 }, 4: { cellWidth: 25 } } });
      }

      if (preview.unassignedEvents.length > 0) {
        y = addPageIfNeeded(doc, y, 20); sectionHeading("Forwarded Events with No Staffer Assigned");
        addTable({ head: [["Event Title", "Client", "Event Date", "Venue"]], body: preview.unassignedEvents.map((r) => [r.title, r.client, r.eventDate, r.venue]), columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 }, 2: { cellWidth: 30 }, 3: { cellWidth: 37 } } });
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(180, 180, 180);
        doc.text(`Page ${i} of ${pageCount}`, W - MARGIN, PAGE_H - 8, { align: "right" });
        doc.text("Coverage Operations Report — Confidential", MARGIN, PAGE_H - 8);
      }

      const filename = isAllTime ? "coverage-report-all-time.pdf" : `coverage-report-${(selectedSemester?.name || "report").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      doc.save(filename);
    } catch (err) {
      setError("Failed to generate PDF: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = isAllTime || !!selectedSemester;

  // ── Dark-aware tokens ─────────────────────────────────────────────────────────
  const borderColor   = isDark ? "#2e2e2e" : "#e0e0e0";
  const cardBg        = isDark ? "#1e1e1e" : "#f9f9f9";
  const cardBorder    = isDark ? "#2a2a2a" : "#f0f0f0";
  const headerBg      = isDark ? "#2a2200"  : "#fffde7";
  const headerBorder  = isDark ? "#3a3000"  : "#fff176";
  const footerBg      = isDark ? "#181818"  : "#f9f9f9";
  const footerBorder  = isDark ? "#2a2a2a"  : "#f0f0f0";
  const labelColor    = isDark ? "#9e9e9e"  : "#9e9e9e";
  const textPrimary   = "text.primary";
  const textSecondary = "text.secondary";

  const statCards = [
    { label: "Total",          value: preview?.stats.total,      icon: <AssignmentOutlinedIcon />,         bg: isDark ? "#2a2a2a" : "#f5f5f5", color: "#757575" },
    { label: "Approved",       value: preview?.stats.approved,   icon: <CheckCircleOutlineOutlinedIcon />, bg: isDark ? "#0a2210" : "#e8f5e9", color: "#2e7d32" },
    { label: "Declined",       value: preview ? `${preview.stats.declined} (${preview.stats.declineRate}%)` : "—", icon: <CancelOutlinedIcon />, bg: isDark ? "#2a0a0a" : "#ffebee", color: "#c62828" },
    { label: "Completion",     value: preview ? `${preview.stats.completionRate}%` : "—", icon: <TrendingUpOutlinedIcon />, bg: isDark ? "#0d2137" : "#e3f2fd", color: "#1565c0" },
    { label: "Avg Turnaround", value: preview?.stats.avgTurnaround ? `${preview.stats.avgTurnaround}d` : "—", icon: <AccessTimeOutlinedIcon />, bg: isDark ? "#2a1a00" : "#fff3e0", color: "#e65100" },
  ];

  return (
    <Box sx={{ mt: 0 }}>

      {/* ── Header row ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: textPrimary }}>Report Generation</Typography>
          <Typography sx={{ fontSize: "0.78rem", color: textSecondary, mt: 0.3 }}>
            Generate a PDF coverage operations report · {isAllTime ? "All time" : selectedSemester?.name || "—"} · A4
          </Typography>
        </Box>
        <Button
          size="small" variant="outlined"
          onClick={fetchReportData}
          disabled={fetching || !canGenerate}
          sx={{ textTransform: "none", fontSize: "0.78rem", borderRadius: "10px", boxShadow: "none", borderColor, color: textPrimary, "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", boxShadow: "none" } }}
        >
          {fetching
            ? <><CircularProgress size={12} sx={{ color: "text.primary", mr: 0.8 }} />Loading…</>
            : "Preview Report"
          }
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "10px", fontSize: "0.8rem" }}>{error}</Alert>}

      {/* ── Empty state ── */}
      {!preview && !fetching && (
        <Box sx={{ p: 4, textAlign: "center", bgcolor: "background.paper", borderRadius: "10px", border: `1px solid ${borderColor}` }}>
          <AssignmentOutlinedIcon sx={{ fontSize: 36, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
          <Typography sx={{ fontSize: "0.82rem", color: textSecondary }}>
            Click "Preview Report" to generate a summary for{" "}
            {isAllTime ? "all time" : selectedSemester?.name || "the selected semester"}.
          </Typography>
        </Box>
      )}

      {/* ── Preview card ── */}
      {preview && (
        <Box sx={{ bgcolor: "background.paper", borderRadius: "10px", border: `1px solid ${borderColor}`, overflow: "hidden" }}>

          {/* Card header */}
          <Box sx={{ px: 2.5, py: 2, backgroundColor: headerBg, borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", color: textPrimary }}>
                {preview.period} — Coverage Report
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: textSecondary }}>
                Previewed {preview.generatedAt}
              </Typography>
            </Box>
            <Button
              variant="contained" size="small"
              startIcon={generating ? <CircularProgress size={13} sx={{ color: "#212121" }} /> : <DownloadOutlinedIcon />}
              onClick={generatePDF}
              disabled={generating}
              sx={{ textTransform: "none", fontSize: "0.78rem", borderRadius: "10px", boxShadow: "none", backgroundColor: "#f5c52b", color: "#212121", fontWeight: 500, "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
            >
              {generating ? "Generating…" : "Download PDF"}
            </Button>
          </Box>

          {/* Summary stats */}
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {statCards.map((s) => (
              <Box key={s.label} sx={{ flex: "1 1 100px", bgcolor: cardBg, borderRadius: "10px", border: `1px solid ${cardBorder}`, p: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.6 }}>
                  <Typography sx={{ fontSize: "0.7rem", color: labelColor }}>{s.label}</Typography>
                  <Box sx={{ p: 0.5, borderRadius: 1, backgroundColor: s.bg, color: s.color, display: "flex" }}>
                    {React.cloneElement(s.icon, { sx: { fontSize: 12 } })}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: textPrimary, lineHeight: 1 }}>{s.value ?? "—"}</Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mx: 2.5, borderColor }} />

          {/* Section workload */}
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: labelColor, textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
              Section Workload
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {preview.sectionWorkload.map((s) => (
                <Box key={s.section} sx={{ flex: "1 1 120px", bgcolor: cardBg, borderRadius: "10px", border: `1px solid ${cardBorder}`, p: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.5 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: SECTION_COLORS[s.section]?.color }} />
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: textPrimary }}>{s.section}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: textPrimary }}>{s.total}</Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: textSecondary }}>{s.pending} pending · {s.completed} done</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ mx: 2.5, borderColor }} />

          {/* Staffer workload preview */}
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: labelColor, textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
              Staffer Workload
            </Typography>
            {preview.stafferList.length === 0 ? (
              <Typography sx={{ fontSize: "0.78rem", color: textSecondary }}>No assignments found.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                {preview.stafferList.slice(0, 5).map((s, i) => (
                  <Box key={s.name} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 0.8, bgcolor: cardBg, borderRadius: "10px", border: `1px solid ${cardBorder}` }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: isDark ? "#555" : "#bdbdbd", width: 14 }}>#{i + 1}</Typography>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, flex: 1, color: textPrimary }}>{s.name}</Typography>
                    <Chip label={s.section} size="small" sx={{ fontSize: "0.65rem", height: 18, backgroundColor: SECTION_COLORS[s.section]?.bg, color: SECTION_COLORS[s.section]?.color }} />
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: textPrimary, minWidth: 60, textAlign: "right" }}>
                      {s.count} {s.count === 1 ? "assign." : "assigns."}
                    </Typography>
                  </Box>
                ))}
                {preview.stafferList.length > 5 && (
                  <Typography sx={{ fontSize: "0.72rem", color: textSecondary, pl: 0.5 }}>
                    +{preview.stafferList.length - 5} more in PDF
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ px: 2.5, py: 1.2, backgroundColor: footerBg, borderTop: `1px solid ${footerBorder}` }}>
            <Typography sx={{ fontSize: "0.7rem", color: textSecondary }}>
              PDF includes:{" "}
              {[
                `${preview.stafferList.length} staffer breakdown${preview.stafferList.length !== 1 ? "s" : ""} with event detail`,
                `${preview.approvedRequests.length} approved`,
                `${preview.declinedRequests.length} declined`,
                `${preview.pendingRequests.length} pending/unresolved`,
                preview.unassignedEvents.length > 0 ? `${preview.unassignedEvents.length} unassigned` : null,
                `${preview.clientList.length} clients`,
              ].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
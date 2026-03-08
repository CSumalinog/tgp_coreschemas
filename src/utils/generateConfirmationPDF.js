// src/utils/generateConfirmationPDF.js
// Pure utility — no React, no MUI, no side effects other than triggering a PDF download.
// Usage: await generateConfirmationPDF(request, teamBySection)

export async function generateConfirmationPDF(request, teamBySection) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const MARGIN = 20;
  const COL_W  = PAGE_W - MARGIN * 2;

  let y = 0;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(245, 197, 43);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text("Coverage Confirmation", MARGIN, 17);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 60, 0);
  doc.text(`Ref: ${request.id.slice(0, 8).toUpperCase()}`, PAGE_W - MARGIN, 17, { align: "right" });

  y = 38;

  // ── Approval badge ────────────────────────────────────────────────────────
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(MARGIN, y - 5, COL_W, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text("✓  REQUEST APPROVED", MARGIN + 4, y + 2.5);
  const approvedOn = request.approved_at
    ? new Date(request.approved_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Approved on ${approvedOn}`, PAGE_W - MARGIN - 2, y + 2.5, { align: "right" });

  y += 18;

  // ── Reusable helpers ──────────────────────────────────────────────────────
  const sectionTitle = (title) => {
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(title.toUpperCase(), MARGIN, y);
    y += 5;
  };

  const infoRow = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text(label, MARGIN, y);
    doc.setTextColor(17, 24, 39);
    doc.text(String(value || "—"), MARGIN + 38, y);
    y += 6;
  };

  // ── Event Information ─────────────────────────────────────────────────────
  sectionTitle("Event Information");
  infoRow("Event Title",  request.title);
  infoRow("Description",  request.description || "—");
  infoRow("Date",         request.event_date  || "—");
  infoRow("Time",
    request.from_time && request.to_time
      ? `${request.from_time} – ${request.to_time}`
      : "—"
  );
  infoRow("Venue", request.venue || "—");
  y += 3;

  // ── Coverage Requirements ─────────────────────────────────────────────────
  const coverageComponents = request.services
    ? Object.entries(request.services).filter(([, pax]) => pax > 0)
    : [];

  if (coverageComponents.length > 0) {
    sectionTitle("Coverage Requirements");
    coverageComponents.forEach(([name, pax]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 24, 39);
      doc.text(`• ${name}`, MARGIN + 2, y);
      doc.setTextColor(107, 114, 128);
      doc.text(`×${pax}`, MARGIN + 80, y);
      y += 6;
    });
    y += 3;
  }

  // ── Coverage Team ─────────────────────────────────────────────────────────
  const sections = Object.keys(teamBySection);
  if (sections.length > 0) {
    sectionTitle("Your Coverage Team");
    sections.forEach((sec) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(sec, MARGIN + 2, y);
      y += 5;
      teamBySection[sec].forEach((staffer) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(17, 24, 39);
        doc.text(`  ${staffer.full_name}`, MARGIN + 4, y);
        y += 5.5;
      });
      y += 1;
    });
    y += 2;
  }

  // ── Contact Details ───────────────────────────────────────────────────────
  sectionTitle("Contact Details");
  infoRow("Contact Person", request.contact_person || "—");
  infoRow("Contact Info",   request.contact_info   || "—");

  // ── Admin Notes ───────────────────────────────────────────────────────────
  if (request.admin_notes) {
    sectionTitle("Admin Notes");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    const lines = doc.splitTextToSize(request.admin_notes, COL_W - 6);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 5.5 + 4;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 287;
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "This is an official coverage confirmation. Please present this document to your event coordinator.",
    MARGIN, footerY
  );
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    PAGE_W - MARGIN, footerY, { align: "right" }
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const slug = request.title.replace(/\s+/g, "_").slice(0, 30);
  doc.save(`Coverage_Confirmation_${slug}.pdf`);
}
// src/utils/generateConfirmationPDF.js
import QRCode from "qrcode";

const BASE_URL = "https://tgp-coreschemas.vercel.app";
const GOLD     = [245, 197, 43];
const DARK     = [17,  24,  39];
const GRAY     = [107, 114, 128];
const LGRAY    = [229, 231, 235];
const GREEN    = [21,  128, 61];
const GREENBG  = [220, 252, 231];
const WHITE    = [255, 255, 255];

async function _buildPDF(request, teamBySection, mode = "save") {
  const { default: jsPDF } = await import("jspdf");
  const doc    = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const COL_W  = PAGE_W - MARGIN * 2;

  let y = 0;

  // ── Generate QR code as base64 image ──────────────────────────────────────
  const timeoutUrl = `${BASE_URL}/timeout/${request.id}`;
  const qrDataUrl  = await QRCode.toDataURL(timeoutUrl, {
    width:  200,
    margin: 1,
    color:  { dark: "#111827", light: "#ffffff" },
  });

  // ── Helper: section divider title ─────────────────────────────────────────
  const sectionTitle = (title) => {
    y += 2;
    doc.setFillColor(248, 249, 250);
    doc.rect(MARGIN, y - 3, COL_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(title.toUpperCase(), MARGIN + 3, y + 2);
    y += 9;
  };

  // ── Helper: two-column info row ───────────────────────────────────────────
  const infoRow = (label, value, opts = {}) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(label, MARGIN + 3, y);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(String(value || "—"), COL_W - 42);
    doc.text(lines, MARGIN + 42, y);
    y += lines.length > 1 ? lines.length * 5.5 : 6;
  };

  // ── Helper: horizontal rule ───────────────────────────────────────────────
  const rule = (color = LGRAY) => {
    doc.setDrawColor(...color);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 4;
  };

  // =========================================================================
  // HEADER
  // =========================================================================
  // Gold top stripe
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, PAGE_W, 36, "F");

  // Dark left accent bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 5, 36, "F");

  // Organization name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 60, 0);
  doc.text("THE GOLD PANICLES", MARGIN, 10);

  // Document title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  doc.text("Coverage Confirmation", MARGIN, 22);

  // Ref + date top right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 50, 0);
  doc.text(`REF: ${request.id.slice(0, 8).toUpperCase()}`, PAGE_W - MARGIN, 10, { align: "right" });
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    PAGE_W - MARGIN, 16, { align: "right" }
  );

  y = 46;

  // =========================================================================
  // APPROVAL BADGE
  // =========================================================================
  doc.setFillColor(...GREENBG);
  doc.roundedRect(MARGIN, y, COL_W, 14, 2, 2, "F");
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, COL_W, 14, 2, 2, "S");
  doc.setLineWidth(0.2);

  // Green left accent
  doc.setFillColor(...GREEN);
  doc.roundedRect(MARGIN, y, 3, 14, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text("REQUEST APPROVED", MARGIN + 8, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(34, 100, 55);
  const approvedOn = request.approved_at
    ? new Date(request.approved_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";
  doc.text(`Approved on ${approvedOn}`, MARGIN + 8, y + 11);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("✓", PAGE_W - MARGIN - 6, y + 8);

  y += 22;

  // =========================================================================
  // TWO-COLUMN LAYOUT: Event Info (left) | QR Code (right)
  // =========================================================================
  const LEFT_W  = COL_W * 0.63;
  const RIGHT_W = COL_W * 0.33;
  const RIGHT_X = MARGIN + LEFT_W + COL_W * 0.04;
  const QR_SIZE = 42;
  const colStartY = y;

  // ── Left column: Event Details ────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setFillColor(248, 249, 250);
  doc.rect(MARGIN, y - 3, LEFT_W, 8, "F");
  doc.text("EVENT DETAILS", MARGIN + 3, y + 2);
  y += 9;

  const leftInfoRow = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(label, MARGIN + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(String(value || "—"), LEFT_W - 28);
    doc.text(lines, MARGIN + 28, y);
    y += lines.length > 1 ? lines.length * 5 : 5.5;
  };

  leftInfoRow("Title",    request.title);
  leftInfoRow("Date",     request.event_date || "—");
  leftInfoRow("Time",
    request.from_time && request.to_time
      ? `${request.from_time} – ${request.to_time}`
      : "—"
  );
  leftInfoRow("Venue",    request.venue || "—");
  leftInfoRow("Contact",  request.contact_person || "—");
  leftInfoRow("Info",     request.contact_info || "—");

  // ── Right column: QR Code ─────────────────────────────────────────────────
  const qrY = colStartY - 3;

  // QR container box
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LGRAY);
  doc.roundedRect(RIGHT_X, qrY, RIGHT_W, RIGHT_W + 16, 2, 2, "FD");

  // QR image
  const qrX = RIGHT_X + (RIGHT_W - QR_SIZE) / 2;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY + 4, QR_SIZE, QR_SIZE);

  // QR label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...DARK);
  doc.text("STAFF TIME-OUT", RIGHT_X + RIGHT_W / 2, qrY + QR_SIZE + 9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text("Scan to confirm coverage", RIGHT_X + RIGHT_W / 2, qrY + QR_SIZE + 13.5, { align: "center" });
  doc.text("completion after the event", RIGHT_X + RIGHT_W / 2, qrY + QR_SIZE + 17, { align: "center" });

  // Move y past the two-column section
  y = Math.max(y, qrY + RIGHT_W + 18) + 6;

  rule();

  // =========================================================================
  // COVERAGE REQUIREMENTS
  // =========================================================================
  const coverageComponents = request.services
    ? Object.entries(request.services).filter(([, pax]) => pax > 0)
    : [];

  if (coverageComponents.length > 0) {
    sectionTitle("Coverage Requirements");
    const cellW = (COL_W - 4) / 2;
    coverageComponents.forEach(([ name, pax ], i) => {
      const col = i % 2;
      const cx  = MARGIN + col * (cellW + 4);
      if (col === 0 && i > 0) y += 0;

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(...LGRAY);
      doc.roundedRect(cx, y - 2, cellW, 10, 1.5, 1.5, "FD");

      // Gold dot
      doc.setFillColor(...GOLD);
      doc.circle(cx + 5, y + 3, 1.5, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(name, cx + 10, y + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.text(`×${pax}`, cx + cellW - 6, y + 4.5, { align: "right" });

      if (col === 1 || i === coverageComponents.length - 1) y += 13;
    });
    y += 2;
    rule();
  }

  // =========================================================================
  // COVERAGE TEAM
  // =========================================================================
  const sections = Object.keys(teamBySection);
  if (sections.length > 0) {
    sectionTitle("Coverage Team");

    const SECTION_COLORS = {
      News:            { bg: [227, 242, 253], text: [21,  101, 192] },
      Photojournalism: { bg: [243, 229, 245], text: [123, 31,  162] },
      Videojournalism: { bg: [232, 245, 233], text: [46,  125, 50]  },
    };

    sections.forEach((sec) => {
      const sc = SECTION_COLORS[sec] || { bg: [245, 245, 245], text: [80, 80, 80] };

      // Section badge
      doc.setFillColor(...sc.bg);
      doc.roundedRect(MARGIN + 2, y - 1, 32, 7, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...sc.text);
      doc.text(sec.toUpperCase(), MARGIN + 18, y + 4, { align: "center" });
      y += 9;

      teamBySection[sec].forEach((staffer) => {
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(...LGRAY);
        doc.roundedRect(MARGIN + 4, y - 1, COL_W - 8, 8, 1, 1, "FD");

        // Dot
        doc.setFillColor(...sc.text);
        doc.circle(MARGIN + 10, y + 3, 1.2, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK);
        doc.text(staffer.full_name, MARGIN + 15, y + 4);
        y += 10;
      });
      y += 2;
    });
    rule();
  }

  // =========================================================================
  // DESCRIPTION
  // =========================================================================
  if (request.description) {
    sectionTitle("Event Description");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const descLines = doc.splitTextToSize(request.description, COL_W - 6);
    doc.text(descLines, MARGIN + 3, y);
    y += descLines.length * 5.5 + 4;
    rule();
  }

  // =========================================================================
  // ADMIN NOTES
  // =========================================================================
  if (request.admin_notes) {
    sectionTitle("Notes from Admin");
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(MARGIN, y - 2, COL_W, 6 + Math.ceil(request.admin_notes.length / 80) * 5.5, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(113, 63, 18);
    const noteLines = doc.splitTextToSize(request.admin_notes, COL_W - 8);
    doc.text(noteLines, MARGIN + 4, y + 3);
    y += noteLines.length * 5.5 + 8;
  }

  // =========================================================================
  // FOOTER
  // =========================================================================
  // Footer background
  doc.setFillColor(248, 249, 250);
  doc.rect(0, PAGE_H - 22, PAGE_W, 22, "F");

  // Gold top border on footer
  doc.setFillColor(...GOLD);
  doc.rect(0, PAGE_H - 22, PAGE_W, 1.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    "This is an official coverage confirmation. Please present this to the assigned staffer.",
    MARGIN, PAGE_H - 14
  );
  doc.text(
    "For inquiries, contact The Gold Panicles. email: thegoldpanicles@gmail.com",
    MARGIN, PAGE_H - 9
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(
    `REF: ${request.id.slice(0, 8).toUpperCase()}`,
    PAGE_W - MARGIN, PAGE_H - 14, { align: "right" }
  );
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    PAGE_W - MARGIN, PAGE_H - 9, { align: "right" }
  );

  // ── Save or preview ───────────────────────────────────────────────────────
  const slug = request.title.replace(/\s+/g, "_").slice(0, 30);
  if (mode === "bloburl") {
    return doc.output("bloburl");
  }
  doc.save(`Coverage_Confirmation_${slug}.pdf`);
}

export async function generateConfirmationPDF(request, teamBySection) {
  await _buildPDF(request, teamBySection, "save");
}

export async function previewConfirmationPDF(request, teamBySection) {
  const blobUrl = await _buildPDF(request, teamBySection, "bloburl");
  window.open(blobUrl, "_blank", "noopener,noreferrer");
}
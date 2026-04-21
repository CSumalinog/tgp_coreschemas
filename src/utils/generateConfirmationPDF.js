// src/utils/generateConfirmationPDF.js
import QRCode from "qrcode";

const BASE_URL = "https://tgp-coreschemas.vercel.app";
const GOLD = [245, 197, 43];
const DARK = [17, 24, 39];
const GRAY = [107, 114, 128];
const LGRAY = [229, 231, 235];
const WHITE = [255, 255, 255];

async function _buildPDF(request, teamBySection, mode = "save") {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const COL_W = PAGE_W - MARGIN * 2;

  let y = 0;

  // ── Generate QR code as base64 image ──────────────────────────────────────
  const timeoutUrl = `${BASE_URL}/timeout/${request.id}`;
  const qrDataUrl = await QRCode.toDataURL(timeoutUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#111827", light: "#ffffff" },
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
  // HEADER  (~25 mm tall ≈ 1 inch)
  // =========================================================================
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, PAGE_W, 25, "F");

  doc.setFillColor(...DARK);
  doc.rect(0, 0, 5, 25, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 60, 0);
  doc.text("THE GOLD PANICLES", MARGIN, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text("Coverage Confirmation", MARGIN, 21);

  y = 33;

  // =========================================================================
  // TWO-COLUMN LAYOUT: Event Info (left) | QR Code (right)
  // =========================================================================
  const LEFT_W = COL_W * 0.63;
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

  leftInfoRow("Title", request.title);
  leftInfoRow("Date", request.event_date || "—");
  leftInfoRow(
    "Time",
    request.from_time && request.to_time
      ? `${request.from_time} – ${request.to_time}`
      : "—",
  );
  leftInfoRow("Venue", request.venue || "—");
  leftInfoRow("Contact", request.contact_person || "—");
  leftInfoRow("Info", request.contact_info || "—");

  const approvedOn = request.approved_at
    ? new Date(request.approved_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  leftInfoRow("Approved", approvedOn);

  // ── Right column: QR Code ─────────────────────────────────────────────────
  const qrY = colStartY - 3;

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LGRAY);
  doc.roundedRect(RIGHT_X, qrY, RIGHT_W, RIGHT_W + 16, 2, 2, "FD");

  const qrX = RIGHT_X + (RIGHT_W - QR_SIZE) / 2;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY + 4, QR_SIZE, QR_SIZE);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...DARK);
  doc.text("STAFF TIME-OUT", RIGHT_X + RIGHT_W / 2, qrY + QR_SIZE + 9, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text(
    "Scan to confirm coverage",
    RIGHT_X + RIGHT_W / 2,
    qrY + QR_SIZE + 13.5,
    { align: "center" },
  );
  doc.text(
    "completion after the event",
    RIGHT_X + RIGHT_W / 2,
    qrY + QR_SIZE + 17,
    { align: "center" },
  );

  y = Math.max(y, qrY + RIGHT_W + 18) + 6;

  rule();

  // =========================================================================
  // COVERAGE REQUIREMENTS + TEAM (2-column side by side)
  // =========================================================================
  const SERVICE_SECTION_MAP = {
    "News Article": "News",
    "Photo Documentation": "Photojournalism",
    "Video Documentation": "Videojournalism",
    "Camera Operator (for live streaming)": "Videojournalism",
  };

  const SECTION_COLORS_PDF = {
    News: { bg: [227, 242, 253], text: [21, 101, 192] },
    Photojournalism: { bg: [243, 229, 245], text: [123, 31, 162] },
    Videojournalism: { bg: [232, 245, 233], text: [46, 125, 50] },
  };

  const coverageComponents = request.services
    ? Object.entries(request.services).filter(([, pax]) => pax > 0)
    : [];

  if (coverageComponents.length > 0) {
    const SPLIT = COL_W * 0.44;
    const TEAM_X = MARGIN + SPLIT + 6;
    const TEAM_W = COL_W - SPLIT - 6;

    // Column headers
    doc.setFillColor(248, 249, 250);
    doc.rect(MARGIN, y - 3, SPLIT, 8, "F");
    doc.rect(TEAM_X, y - 3, TEAM_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("COVERAGE REQUIREMENTS", MARGIN + 3, y + 2);
    doc.text("COVERAGE TEAM", TEAM_X + 3, y + 2);
    y += 11;

    coverageComponents.forEach(([name, pax]) => {
      const section = SERVICE_SECTION_MAP[name];
      const staffers = section ? teamBySection[section] || [] : [];
      const sc = SECTION_COLORS_PDF[section] || {
        bg: [245, 245, 245],
        text: [80, 80, 80],
      };

      // Calculate row height: enough for the service pill + all staffers
      const rowH = Math.max(10, staffers.length * 5.5 + 4);
      const rowY = y;

      // Left: service pill
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(...LGRAY);
      doc.roundedRect(MARGIN, rowY - 1, SPLIT - 2, rowH, 1.5, 1.5, "FD");
      doc.setFillColor(...GOLD);
      doc.circle(MARGIN + 5, rowY + rowH / 2, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(name, MARGIN + 10, rowY + rowH / 2 + 1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRAY);
      doc.text(`×${pax}`, MARGIN + SPLIT - 6, rowY + rowH / 2 + 1, {
        align: "right",
      });

      // Right: section badge + staff names
      if (section) {
        doc.setFillColor(...sc.bg);
        doc.roundedRect(TEAM_X, rowY - 1, 28, 6.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...sc.text);
        doc.text(section.toUpperCase(), TEAM_X + 14, rowY + 4, {
          align: "center",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK);
        staffers.forEach((staffer, i) => {
          doc.text(`· ${staffer.full_name}`, TEAM_X + 2, rowY + 9 + i * 5.5);
        });

        if (staffers.length === 0) {
          doc.setTextColor(...GRAY);
          doc.setFontSize(7.5);
          doc.text("No staff assigned", TEAM_X + 2, rowY + 8);
        }
      }

      y += rowH + 4;
    });

    rule();
  }

  // =========================================================================
  // ADMIN NOTES
  // =========================================================================
  if (request.admin_notes) {
    sectionTitle("Notes from Admin");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const noteLines = doc.splitTextToSize(request.admin_notes, COL_W - 6);
    doc.text(noteLines, MARGIN + 3, y);
    y += noteLines.length * 5.5 + 6;
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
    MARGIN,
    PAGE_H - 14,
  );
  doc.text(
    "For inquiries, contact The Gold Panicles. email: thegoldpanicles@gmail.com",
    MARGIN,
    PAGE_H - 9,
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(
    `REF: ${request.id.slice(0, 8).toUpperCase()}`,
    PAGE_W - MARGIN,
    PAGE_H - 14,
    { align: "right" },
  );
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    PAGE_W - MARGIN,
    PAGE_H - 9,
    { align: "right" },
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

import type { ScanResponse } from "@/lib/types";

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const SEVERITY_FR: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Élevée",
  MEDIUM: "Moyenne",
  LOW: "Faible",
};

// Couleurs RGB pour chaque sévérité
const SEVERITY_COLOR: Record<string, [number, number, number]> = {
  CRITICAL: [220, 38, 38],
  HIGH:     [234, 88, 12],
  MEDIUM:   [161, 98, 7],
  LOW:      [21, 128, 61],
};

export async function exportToPdf(scan: ScanResponse, repoUrl?: string): Promise<void> {
  // Import dynamique pour éviter le SSR
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  // ── Bandeau header ────────────────────────────────────────────────────────
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("SecureScan", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("RAPPORT DE SÉCURITÉ", margin, 19);

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(`Généré le ${dateStr}`, pageW - margin, 19, { align: "right" });

  y = 36;

  // ── Repo URL si disponible ────────────────────────────────────────────────
  if (repoUrl) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Dépôt analysé : ${repoUrl}`, margin, y);
    y += 8;
  }

  // ── Score + Grade + Total ─────────────────────────────────────────────────
  const cardW = (pageW - margin * 2 - 8) / 3;
  const cards = [
    { label: "Score SecureScan", value: `${scan.score} / 100` },
    { label: "Grade",            value: scan.grade },
    { label: "Total alertes",    value: String(scan.totalFindings) },
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(24, 24, 27);
    doc.roundedRect(cx, y, cardW, 20, 3, 3, "F");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(card.label.toUpperCase(), cx + 6, y + 7);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(card.value, cx + 6, y + 16);
    doc.setFont("helvetica", "normal");
  });

  y += 26;

  // ── Résumé par sévérité ───────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 220, 220);
  doc.text("Répartition par sévérité", margin, y);
  y += 6;

  const sevCardW = (pageW - margin * 2 - 12) / 4;
  SEVERITY_ORDER.forEach((sev, i) => {
    const count = scan.vulnerabilities.filter((v) => v.severity === sev).length;
    const cx = margin + i * (sevCardW + 4);
    const [r, g, b] = SEVERITY_COLOR[sev];
    doc.setFillColor(r, g, b, 0.12);
    doc.setFillColor(20, 20, 20);
    doc.roundedRect(cx, y, sevCardW, 18, 2, 2, "F");
    // bande couleur à gauche
    doc.setFillColor(r, g, b);
    doc.roundedRect(cx, y, 3, 18, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(r, g, b);
    doc.text(SEVERITY_FR[sev].toUpperCase(), cx + 7, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(String(count), cx + 7, y + 15);
    doc.setFont("helvetica", "normal");
  });

  y += 24;

  // ── Tableau des vulnérabilités ────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 220, 220);
  doc.text("Vulnérabilités détectées", margin, y);
  y += 4;

  const rows = scan.vulnerabilities.map((v) => [
    SEVERITY_FR[v.severity] ?? v.severity,
    v.owaspCategory,
    v.file + (v.line ? `:${v.line}` : ""),
    v.branch ?? "-",
    v.description,
    v.tool,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Sévérité", "OWASP", "Fichier", "Branche", "Description", "Outil"]],
    body: rows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      textColor: [220, 220, 220],
      fillColor: [18, 18, 18],
      lineColor: [40, 40, 40],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [160, 160, 160],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [22, 22, 25],
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: "bold" },
      1: { cellWidth: 36 },
      2: { cellWidth: 38 },
      3: { cellWidth: 22 },
      4: { cellWidth: "auto" },
      5: { cellWidth: 22 },
    },
    didParseCell(data) {
      if (data.column.index === 0 && data.section === "body") {
        const sev = Object.keys(SEVERITY_FR).find(
          (k) => SEVERITY_FR[k] === String(data.cell.raw)
        );
        if (sev) {
          const [r, g, b] = SEVERITY_COLOR[sev];
          data.cell.styles.textColor = [r, g, b];
        }
      }
    },
  });

  // ── Footer sur chaque page ─────────────────────────────────────────────────
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `SecureScan — Rapport confidentiel — Page ${p}/${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  // ── Téléchargement ────────────────────────────────────────────────────────
  const filename = `securescan-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

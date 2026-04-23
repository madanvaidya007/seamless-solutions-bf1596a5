import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { BODY_REGIONS } from "@/components/BodyDiagram";

interface BuildOpts {
  intake: any;
  assessment: any | null;
  notes: any[];
  patient: { full_name: string | null; email: string | null; phone?: string | null } | null;
}

const TEAL: [number, number, number] = [22, 130, 145];
const SOFT_BG: [number, number, number] = [240, 248, 250];
const TEXT: [number, number, number] = [25, 35, 50];
const MUTED: [number, number, number] = [110, 120, 135];
const DANGER: [number, number, number] = [200, 60, 60];

export function buildHospitalReport({ intake, assessment, notes, patient }: BuildOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 14;
  let y = 0;

  // ===== Header banner =====
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MediTriage AI", M, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Clinical Decision Support  |  Triage Assessment Report", M, 18);
  doc.text(`Report ID: MT-${(intake.id || "").slice(0, 8).toUpperCase()}`, M, 23);
  doc.text(`Generated: ${format(new Date(), "PPpp")}`, PAGE_W - M, 23, { align: "right" });

  y = 36;

  // ===== Patient block =====
  doc.setFillColor(...SOFT_BG);
  doc.roundedRect(M, y, PAGE_W - 2 * M, 28, 3, 3, "F");
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Patient Information", M + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const col1 = M + 4;
  const col2 = M + 75;
  const col3 = M + 140;
  const lines = [
    [`Name: ${patient?.full_name || "—"}`, `Age / Sex: ${intake.age ?? "—"} / ${intake.sex ?? "—"}`, `Submitted: ${format(new Date(intake.created_at), "PP")}`],
    [`Email: ${patient?.email || "—"}`, `Phone: ${patient?.phone || "—"}`, `Status: ${String(intake.status).replace("_", " ")}`],
    [`Severity: ${intake.severity ?? "—"}/10`, `Duration: ${intake.duration_days ?? "—"} day(s)`, `Body regions: ${(intake.body_regions || []).length || "—"}`],
  ];
  lines.forEach((row, i) => {
    const ly = y + 12 + i * 5;
    doc.setTextColor(...TEXT);
    doc.text(row[0], col1, ly);
    doc.text(row[1], col2, ly);
    doc.text(row[2], col3, ly);
  });

  y += 32;

  // ===== Risk strip =====
  if (assessment) {
    const colorMap: Record<string, [number, number, number]> = {
      low: [76, 160, 100],
      moderate: [220, 160, 50],
      high: [220, 90, 60],
      critical: [180, 40, 40],
    };
    const c = colorMap[assessment.risk_level] || [120, 120, 120];
    doc.setFillColor(...c);
    doc.roundedRect(M, y, PAGE_W - 2 * M, 16, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Risk: ${String(assessment.risk_level).toUpperCase()}`, M + 4, y + 10);
    doc.setFontSize(11);
    doc.text(`Score ${assessment.risk_score} / 100`, PAGE_W - M - 4, y + 10, { align: "right" });
    y += 20;

    if ((assessment.red_flags || []).length) {
      doc.setFillColor(255, 240, 240);
      doc.setDrawColor(...DANGER);
      doc.roundedRect(M, y, PAGE_W - 2 * M, 12, 2, 2, "FD");
      doc.setTextColor(...DANGER);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("⚠ Red flags:", M + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(assessment.red_flags.join(", "), M + 26, y + 5, { maxWidth: PAGE_W - 2 * M - 28 });
      y += 16;
    }
  }

  // ===== Clinical summary =====
  y = sectionTitle(doc, "Clinical Summary", M, y, PAGE_W);
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "plain",
    styles: { fontSize: 9, textColor: TEXT, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45, textColor: MUTED }, 1: { cellWidth: "auto" } },
    body: [
      ["Chief complaint", String(intake.chief_complaint || "—")],
      ["Symptoms", (intake.symptoms || []).join(", ") || "—"],
      ["Affected regions", (intake.body_regions || []).map((r: string) => BODY_REGIONS.find((b) => b.id === r)?.label || r).join(", ") || "—"],
      ["Medical history", intake.medical_history || "—"],
      ["Current medications", intake.current_medications || "—"],
      ["Allergies", intake.allergies || "—"],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ===== Vitals =====
  const vitals = intake.vitals || {};
  const vitalRows = Object.entries(vitals)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => [k.replace(/_/g, " "), String(v)]);
  if (vitalRows.length) {
    y = sectionTitle(doc, "Vitals", M, y, PAGE_W);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Parameter", "Value"]],
      body: vitalRows,
      theme: "striped",
      headStyles: { fillColor: TEAL, textColor: 255 },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== AI Possible diagnoses =====
  if (assessment?.possible_diagnoses?.length) {
    y = ensureSpace(doc, y, 30, PAGE_H, M);
    y = sectionTitle(doc, "Possible Diagnoses (AI suggested)", M, y, PAGE_W);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Condition", "Likelihood", "Explanation"]],
      body: assessment.possible_diagnoses.map((d: any) => [d.name, d.likelihood, d.explanation]),
      headStyles: { fillColor: TEAL, textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 24 }, 2: { cellWidth: "auto" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Differentials =====
  if (assessment?.differentials?.length) {
    y = ensureSpace(doc, y, 30, PAGE_H, M);
    y = sectionTitle(doc, "Differential Considerations", M, y, PAGE_W);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Condition", "Likelihood", "Rationale"]],
      body: assessment.differentials.map((d: any) => [d.condition, d.likelihood, d.rationale]),
      headStyles: { fillColor: [55, 130, 165] as any, textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 24 }, 2: { cellWidth: "auto" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Approved Prescription (doctor-only) =====
  const latestNote = notes?.[0];
  const approvedMeds = latestNote?.approved_medicines as any[] | undefined;
  if (approvedMeds && approvedMeds.length) {
    y = ensureSpace(doc, y, 40, PAGE_H, M);
    y = sectionTitle(doc, "Approved Prescription", M, y, PAGE_W);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Medicine", "Type", "Dosage", "Purpose"]],
      body: approvedMeds.map((m: any) => [m.name, m.type, m.dosage, m.purpose]),
      headStyles: { fillColor: [40, 110, 90] as any, textColor: 255 },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else if (assessment?.suggested_medicines?.length) {
    y = ensureSpace(doc, y, 40, PAGE_H, M);
    y = sectionTitle(doc, "AI Suggested Medicines (pending doctor approval)", M, y, PAGE_W);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Medicine", "Type", "Dosage", "Purpose", "Approval"]],
      body: assessment.suggested_medicines.map((m: any) => [
        m.name,
        m.type,
        m.dosage,
        m.purpose,
        m.requires_doctor_approval ? "Doctor required" : "OTC",
      ]),
      headStyles: { fillColor: [150, 130, 60] as any, textColor: 255 },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Home remedies =====
  if (assessment?.home_remedies?.length) {
    y = ensureSpace(doc, y, 24, PAGE_H, M);
    y = sectionTitle(doc, "Home Remedies", M, y, PAGE_W);
    y = bulletList(doc, assessment.home_remedies, M, y, PAGE_W);
    y += 4;
  }

  // ===== Lifestyle =====
  if (assessment?.lifestyle_advice?.length) {
    y = ensureSpace(doc, y, 24, PAGE_H, M);
    y = sectionTitle(doc, "Lifestyle Advice", M, y, PAGE_W);
    y = bulletList(doc, assessment.lifestyle_advice, M, y, PAGE_W);
    y += 4;
  }

  // ===== Recommended actions =====
  if (assessment?.recommended_actions?.length) {
    y = ensureSpace(doc, y, 24, PAGE_H, M);
    y = sectionTitle(doc, "Recommended Clinical Actions", M, y, PAGE_W);
    y = bulletList(doc, assessment.recommended_actions, M, y, PAGE_W);
    y += 4;
  }

  // ===== Doctor notes =====
  if (notes && notes.length) {
    y = ensureSpace(doc, y, 30, PAGE_H, M);
    y = sectionTitle(doc, "Doctor's Notes", M, y, PAGE_W);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Date", "Diagnosis", "Plan", "Follow-up"]],
      body: notes.map((n: any) => [
        format(new Date(n.created_at), "PP"),
        n.diagnosis || "—",
        n.treatment_plan || "—",
        n.follow_up || "—",
      ]),
      headStyles: { fillColor: TEAL, textColor: 255 },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Signature block =====
  y = ensureSpace(doc, y, 30, PAGE_H, M);
  doc.setDrawColor(...MUTED);
  doc.line(M, y + 14, M + 70, y + 14);
  doc.line(PAGE_W - M - 70, y + 14, PAGE_W - M, y + 14);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Attending physician (signature & stamp)", M, y + 18);
  doc.text("Date", PAGE_W - M - 70, y + 18);

  // ===== Footer on all pages =====
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.2);
    doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "This report is generated by an AI clinical decision support system. It is NOT a substitute for professional medical diagnosis, treatment, or advice. Always consult a licensed physician before taking any medication.",
      M,
      PAGE_H - 10,
      { maxWidth: PAGE_W - 2 * M },
    );
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - M, PAGE_H - 4, { align: "right" });
    doc.text("MediTriage AI · meditriage.health", M, PAGE_H - 4);
  }

  return doc;
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number, pageW: number) {
  doc.setFillColor(...TEAL);
  doc.rect(x, y, 3, 6, "F");
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, x + 6, y + 5);
  doc.setDrawColor(220, 230, 235);
  doc.line(x, y + 8, pageW - x, y + 8);
  return y + 11;
}

function bulletList(doc: jsPDF, items: string[], x: number, y: number, pageW: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, pageW - 2 * x - 6);
    doc.setFillColor(...TEAL);
    doc.circle(x + 1.5, y - 1.2, 0.9, "F");
    doc.text(lines, x + 5, y);
    y += lines.length * 4.2 + 1;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  }
  return y;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, pageH: number, margin: number) {
  if (y + needed > pageH - 18) {
    doc.addPage();
    return margin + 6;
  }
  return y;
}

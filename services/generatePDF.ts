import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Employee } from "@/repositories/employeesRepository";
import type { SalaryRecord } from "@/repositories/salaryRecordsRepository";

type SalarySlipInput = {
  companyName: string;
  employee: Employee;
  salaryRecord: SalaryRecord;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `INR ${formatted}`;
}

function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Derives the PDF password for a salary slip.
 * Pattern: firstNameLowerCase + birthYear (or employeeId as fallback).
 */
export function getSlipPassword(employee: {
  name: string;
  birth_year?: number | null;
  employee_id: string;
}): string {
  const firstName = employee.name.split(/\s+/)[0].toLowerCase();
  if (employee.birth_year != null) {
    return `${firstName}${employee.birth_year}`;
  }
  return `${firstName}${employee.employee_id}`;
}

// ─── Core PDF builder (shared by protected & unprotected variants) ──────────

async function buildBrandedPdf({
  companyName,
  employee,
  salaryRecord,
}: SalarySlipInput): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const contentWidth = width - margin * 2;
  let y = height;

  // Colors
  const toyotaRed = rgb(0.92, 0.04, 0.12);
  const white = rgb(1, 1, 1);
  const darkText = rgb(0.12, 0.12, 0.12);
  const grayText = rgb(0.35, 0.35, 0.35);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const headerRowBg = rgb(0.88, 0.04, 0.1);
  const altRowBg = rgb(0.97, 0.97, 0.97);
  const netBg = rgb(0.9, 0.96, 0.9);

  // ── 1. Branded Header Bar ───────────────────────────────────────────────

  const headerBarHeight = 60;
  page.drawRectangle({
    x: 0,
    y: height - headerBarHeight,
    width,
    height: headerBarHeight,
    color: toyotaRed,
  });

  page.drawText(companyName.toUpperCase(), {
    x: margin,
    y: height - 38,
    size: 22,
    font: fontBold,
    color: white,
  });

  y = height - headerBarHeight - 30;

  // "SALARY SLIP" subtitle
  page.drawText("SALARY SLIP", {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: darkText,
  });

  y -= 22;

  // Month/Year
  const monthYearText = `For the month of ${formatMonthYear(salaryRecord.month, salaryRecord.year)}`;
  page.drawText(monthYearText, {
    x: margin,
    y,
    size: 11,
    font,
    color: grayText,
  });

  y -= 30;

  // ── 2. Employee Details Section (2-column, gray box) ────────────────────

  const detailBoxHeight = 60;
  page.drawRectangle({
    x: margin,
    y: y - detailBoxHeight,
    width: contentWidth,
    height: detailBoxHeight,
    color: lightGray,
  });

  const detailPadding = 12;
  const leftCol = margin + detailPadding;
  const rightCol = margin + contentWidth / 2 + detailPadding;

  // Row 1
  const row1Y = y - 20;
  page.drawText(`Employee Name:  ${employee.name}`, {
    x: leftCol,
    y: row1Y,
    size: 10,
    font,
    color: darkText,
  });
  page.drawText(`Employee ID:  ${employee.employee_id}`, {
    x: rightCol,
    y: row1Y,
    size: 10,
    font,
    color: darkText,
  });

  // Row 2
  const row2Y = y - 42;
  page.drawText(`Designation:  ${employee.designation}`, {
    x: leftCol,
    y: row2Y,
    size: 10,
    font,
    color: darkText,
  });
  page.drawText(
    `Month/Year:  ${formatMonthYear(salaryRecord.month, salaryRecord.year)}`,
    {
      x: rightCol,
      y: row2Y,
      size: 10,
      font,
      color: darkText,
    }
  );

  y -= detailBoxHeight + 30;

  // ── 3. Earnings & Deductions Table ──────────────────────────────────────

  const colLeftWidth = contentWidth / 2;
  const colRightWidth = contentWidth / 2;
  const rowHeight = 28;

  // Helper to draw a table row
  function drawTableRow(
    rowY: number,
    leftLabel: string,
    leftValue: string,
    rightLabel: string,
    rightValue: string,
    bg: ReturnType<typeof rgb> | null,
    isHeader: boolean,
    isBold: boolean
  ) {
    if (bg) {
      page.drawRectangle({
        x: margin,
        y: rowY,
        width: contentWidth,
        height: rowHeight,
        color: bg,
      });
    }

    const textFont = isHeader || isBold ? fontBold : font;
    const textColor = isHeader ? white : darkText;
    const textSize = isHeader ? 10 : 10;
    const textY = rowY + 9;

    // Left column
    if (leftLabel) {
      page.drawText(leftLabel, {
        x: margin + 10,
        y: textY,
        size: textSize,
        font: textFont,
        color: textColor,
      });
    }
    if (leftValue) {
      page.drawText(leftValue, {
        x: margin + colLeftWidth - 10 - font.widthOfTextAtSize(leftValue, textSize),
        y: textY,
        size: textSize,
        font: textFont,
        color: textColor,
      });
    }

    // Vertical divider
    page.drawLine({
      start: { x: margin + colLeftWidth, y: rowY },
      end: { x: margin + colLeftWidth, y: rowY + rowHeight },
      thickness: 0.5,
      color: isHeader ? rgb(1, 1, 1) : rgb(0.82, 0.82, 0.82),
    });

    // Right column
    if (rightLabel) {
      page.drawText(rightLabel, {
        x: margin + colLeftWidth + 10,
        y: textY,
        size: textSize,
        font: textFont,
        color: textColor,
      });
    }
    if (rightValue) {
      page.drawText(rightValue, {
        x:
          margin +
          colLeftWidth +
          colRightWidth -
          10 -
          font.widthOfTextAtSize(rightValue, textSize),
        y: textY,
        size: textSize,
        font: textFont,
        color: textColor,
      });
    }

    // Bottom border
    page.drawLine({
      start: { x: margin, y: rowY },
      end: { x: margin + contentWidth, y: rowY },
      thickness: 0.5,
      color: rgb(0.82, 0.82, 0.82),
    });
  }

  // Header row
  drawTableRow(y - rowHeight, "EARNINGS", "AMOUNT", "DEDUCTIONS", "AMOUNT", headerRowBg, true, true);
  y -= rowHeight;

  // Data rows
  const grossEarnings = salaryRecord.base_salary + salaryRecord.hra + salaryRecord.allowances;

  const earningsRows = [
    { label: "Base Salary", value: formatCurrency(salaryRecord.base_salary) },
    { label: "HRA", value: formatCurrency(salaryRecord.hra) },
    { label: "Allowances", value: formatCurrency(salaryRecord.allowances) },
  ];

  const deductionsRows = [
    { label: "Deductions", value: formatCurrency(salaryRecord.deductions) },
  ];

  const maxRows = Math.max(earningsRows.length, deductionsRows.length);

  for (let i = 0; i < maxRows; i++) {
    const bg = i % 2 === 1 ? altRowBg : null;
    const eRow = earningsRows[i];
    const dRow = deductionsRows[i];
    drawTableRow(
      y - rowHeight,
      eRow?.label ?? "",
      eRow?.value ?? "",
      dRow?.label ?? "",
      dRow?.value ?? "",
      bg,
      false,
      false
    );
    y -= rowHeight;
  }

  // Totals row
  drawTableRow(
    y - rowHeight,
    "Gross Earnings",
    formatCurrency(grossEarnings),
    "Total Deductions",
    formatCurrency(salaryRecord.deductions),
    lightGray,
    false,
    true
  );
  y -= rowHeight;

  // Top border of table
  page.drawLine({
    start: { x: margin, y: y + rowHeight * (maxRows + 2) },
    end: { x: margin + contentWidth, y: y + rowHeight * (maxRows + 2) },
    thickness: 1,
    color: toyotaRed,
  });

  y -= 16;

  // ── 4. Net Salary Highlight Box ─────────────────────────────────────────

  const netBoxHeight = 36;
  page.drawRectangle({
    x: margin,
    y: y - netBoxHeight,
    width: contentWidth,
    height: netBoxHeight,
    color: netBg,
  });

  // Border around net box
  page.drawRectangle({
    x: margin,
    y: y - netBoxHeight,
    width: contentWidth,
    height: netBoxHeight,
    borderColor: rgb(0.2, 0.6, 0.2),
    borderWidth: 1,
  });

  const netSalary =
    salaryRecord.base_salary +
    salaryRecord.hra +
    salaryRecord.allowances -
    salaryRecord.deductions;

  page.drawText("NET SALARY", {
    x: margin + 14,
    y: y - netBoxHeight + 12,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.4, 0.1),
  });

  const netSalaryText = formatCurrency(netSalary);
  const netSalaryWidth = fontBold.widthOfTextAtSize(netSalaryText, 13);
  page.drawText(netSalaryText, {
    x: margin + contentWidth - 14 - netSalaryWidth,
    y: y - netBoxHeight + 12,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.4, 0.1),
  });

  y -= netBoxHeight + 50;

  // ── 5. Footer ───────────────────────────────────────────────────────────

  // Signature area
  const signatureLineY = y;
  page.drawLine({
    start: { x: margin, y: signatureLineY },
    end: { x: margin + 180, y: signatureLineY },
    thickness: 0.5,
    color: grayText,
  });

  page.drawText("Authorized Signatory", {
    x: margin,
    y: signatureLineY - 14,
    size: 9,
    font,
    color: grayText,
  });

  // Disclaimer
  const disclaimerY = margin + 30;
  page.drawText(
    "This is a computer-generated document and does not require a physical signature.",
    {
      x: margin,
      y: disclaimerY,
      size: 8,
      font,
      color: grayText,
    }
  );

  // Generation timestamp
  const timestamp = new Date().toISOString();
  page.drawText(`Generated on: ${timestamp}`, {
    x: margin,
    y: disclaimerY - 14,
    size: 7,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc;
}

/**
 * Generates a branded salary slip PDF.
 * The password (from getSlipPassword) is communicated via email body and UI.
 * TODO: Add PDF encryption using a native library (e.g. muhammara or qpdf)
 *       when native module support is available.
 */
export async function generateSalarySlipPdfBuffer({
  companyName,
  employee,
  salaryRecord,
}: SalarySlipInput): Promise<Buffer> {
  const pdfDoc = await buildBrandedPdf({ companyName, employee, salaryRecord });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generates the same branded salary slip PDF but WITHOUT password protection.
 * Used for the in-app preview modal.
 */
export async function generateSalarySlipPdfBufferUnprotected({
  companyName,
  employee,
  salaryRecord,
}: SalarySlipInput): Promise<Buffer> {
  const pdfDoc = await buildBrandedPdf({ companyName, employee, salaryRecord });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

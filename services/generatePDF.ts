import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Employee } from "@/repositories/employeesRepository";
import type { SalaryRecord } from "@/repositories/salaryRecordsRepository";

type SalarySlipInput = {
  companyName: string;
  employee: Employee;
  salaryRecord: SalaryRecord;
};

function formatCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `INR ${formatted}`;
}

function formatMonthYear(month: number, year: number) {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export async function generateSalarySlipPdfBuffer({
  companyName,
  employee,
  salaryRecord,
}: SalarySlipInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let cursorY = height - margin;

  page.drawText(companyName, {
    x: margin,
    y: cursorY,
    size: 20,
    font: fontBold,
    color: rgb(0.12, 0.12, 0.12),
  });

  cursorY -= 30;
  page.drawText("Salary Slip", {
    x: margin,
    y: cursorY,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.12, 0.12),
  });

  cursorY -= 24;
  page.drawText(`Employee Name: ${employee.name}`, {
    x: margin,
    y: cursorY,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  cursorY -= 16;
  page.drawText(`Employee ID: ${employee.employee_id}`, {
    x: margin,
    y: cursorY,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  cursorY -= 16;
  page.drawText(`Designation: ${employee.designation}`, {
    x: margin,
    y: cursorY,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  cursorY -= 28;
  const tableTop = cursorY;
  const tableWidth = width - margin * 2;
  const columnWidth = tableWidth / 2;
  const rowHeight = 22;

  page.drawLine({
    start: { x: margin, y: tableTop },
    end: { x: margin + tableWidth, y: tableTop },
    thickness: 1,
    color: rgb(0.75, 0.75, 0.75),
  });

  const rows = [
    ["Base", formatCurrency(salaryRecord.base_salary)],
    ["HRA", formatCurrency(salaryRecord.hra)],
    ["Allowances", formatCurrency(salaryRecord.allowances)],
    ["Deductions", formatCurrency(salaryRecord.deductions)],
  ];

  rows.forEach((row, index) => {
    const y = tableTop - rowHeight * (index + 1);

    page.drawText(row[0], {
      x: margin,
      y: y + 6,
      size: 11,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });

    page.drawText(row[1], {
      x: margin + columnWidth,
      y: y + 6,
      size: 11,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });

    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + tableWidth, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
  });

  const netSalary =
    salaryRecord.base_salary +
    salaryRecord.hra +
    salaryRecord.allowances -
    salaryRecord.deductions;

  const netRowY = tableTop - rowHeight * (rows.length + 1);

  page.drawText("Net Salary", {
    x: margin,
    y: netRowY + 6,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(formatCurrency(netSalary), {
    x: margin + columnWidth,
    y: netRowY + 6,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const footerText = `Month/Year: ${formatMonthYear(
    salaryRecord.month,
    salaryRecord.year
  )}`;

  page.drawText(footerText, {
    x: margin,
    y: margin,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

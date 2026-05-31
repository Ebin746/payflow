import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  name: string;
  month: number;
  year: number;
  pdfBuffer: Buffer;
};

const emailMode = (process.env.EMAIL_MODE ?? "real").toLowerCase();

export async function sendSalarySlipEmail({
  to,
  name,
  month,
  year,
  pdfBuffer,
}: SendEmailInput) {
  if (emailMode === "dummy") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return;
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const fromAddress = process.env.EMAIL_FROM ?? gmailUser;
  const companyName = process.env.COMPANY_NAME ?? "Nippon Toyota";
  const officeName = `${companyName} Salary Slip Dispatch Office`;

  if (!gmailUser || !gmailAppPassword || !fromAddress) {
    throw new Error("Missing Gmail email configuration.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const monthLabel = `${month}`.padStart(2, "0");
  const subject = `${companyName} Salary Slip - ${monthLabel}/${year}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <p>Dear ${name},</p>
      <p>Please find attached your salary slip for <strong>${monthLabel}/${year}</strong>.</p>
      <p>This communication has been issued by the <strong>${officeName}</strong> for official payroll records.</p>
      <p>If you notice any discrepancy, please contact the payroll office for review.</p>
      <p>Regards,<br />${officeName}</p>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
    attachments: [
      {
        filename: `salary-slip-${monthLabel}-${year}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

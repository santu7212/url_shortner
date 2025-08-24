 import nodemailer from "nodemailer";

let transporter;
let testAccount;

async function initMailer() {
  testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) await initMailer();

  const info = await transporter.sendMail({
    from: `'URL SHORTENER' <${testAccount.user}>`,
    to,
    subject,
    html,
  });

  console.log("Verify Email:", nodemailer.getTestMessageUrl(info));
};

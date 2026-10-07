import transporter from "./mailer.js";
import dotenv from "dotenv";
dotenv.config();

export const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.MAIL_USER}>`, // ✅ FIX
      to,
      subject,
      html,
    });

    console.log("📧 Email sent to:", to);
    return true;
  } catch (err) {
    console.error("❌ Email sending error:", err);
    return false;
  }
};

import { emailLayout } from "../layout.js";

export const forgotPasswordTemplate = (resetLink) =>
  emailLayout(
    "Reset Your Password",
    `
      <p>You requested to reset your password.</p>

      <p>Click the link below to continue:</p>

      <a 
        href="${resetLink}" 
        style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">
        Reset Password
      </a>

      <p>This link is valid for <b>15 minutes</b>.</p>
    `
  );

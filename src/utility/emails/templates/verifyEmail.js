import { emailLayout } from "../layout.js";

export const verifyEmailTemplate = (verifyLink) =>
  emailLayout(
    "Verify Your Email Address",
    `
      <p>Hello,</p>

      <p>
        Thank you for creating an account with us.  
        Please verify your email address by clicking the button below:
      </p>

      <div style="text-align:center; margin: 30px 0;">
        <a href="${verifyLink}"
           style="
             display:inline-block;
             padding:14px 24px;
             background:#0066ff;
             color:#ffffff;
             font-weight:600;
             text-decoration:none;
             border-radius:8px;
             font-size:16px;
           ">
           Verify Email
        </a>
      </div>

      <p>
        If the button above doesn't work, copy and paste the following link into your browser:
      </p>

      <p style="word-break:break-all; margin-top:10px;">
        ${verifyLink}
      </p>

      <p style="margin-top:25px;">
        If you did not create this account, you can safely ignore this email.
      </p>
    `
  );

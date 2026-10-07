import { emailLayout } from "../layout.js";

export const otpTemplate = (otp) => emailLayout(
  "Your OTP Code",
  `
    <p>Your verification code is:</p>
    <h1 style="font-size:32px;letter-spacing:5px;text-align:center;">${otp}</h1>
    <p>Valid for <b>10 minutes</b></p>
  `
);

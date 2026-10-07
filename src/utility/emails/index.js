import { sendEmail } from "./sendEmail.js";
import { verifyEmailTemplate } from "./templates/verifyEmail.js";
import { forgotPasswordTemplate } from "./templates/forgotPassword.js";


export const Email = {
  /**
   * SEND OTP EMAIL
   * @returns OTP (so controller can save it in DB)
   */
//   async otp(email) {
//     const otp = generateOtp();
//     const html = otpTemplate(otp);

//     await sendEmail(email, "Your OTP Code", html);

//     return otp;
//   },

  /**
   * SEND VERIFY EMAIL LINK
   */
  async verify(email, verifyLink) {
    const html = verifyEmailTemplate(verifyLink);

    await sendEmail(email, "Verify Your Email", html);
  },


  //  SEND FORGOT PASSWORD EMAIL
   
  async forgot(email, resetLink) {
    const html = forgotPasswordTemplate(resetLink);
    await sendEmail(email, "Reset Your Password", html);
  }

  /**
   * SEND WELCOME EMAIL
   */
//   async welcome(email, name) {
//     const html = welcomeTemplate(name);

//     await sendEmail(email, "Welcome to Our App 🎉", html);
//   },

  /**
   * SEND PASSWORD RESET LINK
   */
//   async reset(email, resetLink) {
//     const html = resetPasswordTemplate(resetLink);

//     await sendEmail(email, "Reset Your Password", html);
//   }
};

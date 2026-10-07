import dotenv from "dotenv";
dotenv.config();

export const emailLayout = (title, content) => {
  const logo = process.env.EMAIL_LOGO_URL || "";

  return `
  <div style="max-width:520px;margin:auto;padding:20px;background:#fff;
              border-radius:12px;font-family:Arial;border:1px solid #eee;">
    
    ${
      logo
        ? `<div style="text-align:center;margin-bottom:20px;">
             <img src="${logo}" style="height:50px;" />
           </div>`
        : ""
    }

    <h2 style="text-align:center;color:#333;">${title}</h2>

    <div style="margin-top:14px;color:#444;font-size:15px;">
      ${content}
    </div>

    <hr style="margin:25px 0;border:0;border-top:1px solid #eee;" />

    <p style="text-align:center;color:#888;font-size:12px;">
      © ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || "Your App"}
    </p>
  </div>
  `;
};

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,  
  },
});

export async function sendResetEmail({ to, resetUrl, userName }) {
  
  await transporter.sendMail({
    from:    `"FlowTask" <${process.env.MAIL_USER}>`,
    to,
    subject: '🔐 Reset your FlowTask password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; padding: 0; background: #0c0e1a; font-family: 'Segoe UI', sans-serif; }
          .wrapper { max-width: 520px; margin: 40px auto; background: #12142a; border-radius: 20px; overflow: hidden; border: 1px solid rgba(99,102,241,0.2); }
          .header { background: linear-gradient(135deg, #6366f1, #a855f7); padding: 36px 32px; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
          .body { padding: 36px 32px; }
          .body p { color: #a0a3b1; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
          .body strong { color: #e8eaf0; }
          .btn { display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 0 24px rgba(99,102,241,0.4); }
          .warning { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; padding: 14px 18px; margin-top: 24px; }
          .warning p { color: #fbbf24; font-size: 13px; margin: 0; }
          .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
          .footer p { color: #4a4d6a; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🔐 FlowTask</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="body">
            <p>Hey <strong>${userName}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to set a new one:</p>
            <a href="${resetUrl}" class="btn">Reset My Password</a>
            <div class="warning">
              <p>⏰ This link expires in <strong>15 minutes</strong>. If you didn't request this, ignore this email — your account is safe.</p>
            </div>
          </div>
          <div class="footer">
            <p>FlowTask · Sent via AWS SQS + Nodemailer</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  console.log(`📧 Reset email sent to: ${to}`);
}
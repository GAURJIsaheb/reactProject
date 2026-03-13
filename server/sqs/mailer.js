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




// ─── Workspace Invite ─────────────────────────────────────────────────────────
export async function sendInviteEmail({ to, inviterName, workspaceName, inviteLink }) {
  await transporter.sendMail({
    from:    `"FlowTask" <${process.env.MAIL_USER}>`,
    to,
    subject: `${inviterName} invited you to collaborate on FlowTask`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:sans-serif;background:#0f1117;color:#e2e8f0;padding:40px;">
        <div style="max-width:480px;margin:0 auto;background:#1a1f2e;border-radius:16px;
                    padding:32px;border:1px solid #2d3348;">
          <!-- Header -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <div style="display:inline-block;
                            background:linear-gradient(90deg,#a5b4fc,#f9a8d4);
                            padding:6px 14px;
                            border-radius:8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <div style="width:34px;height:34px;border-radius:8px;
                                    background:linear-gradient(135deg,#6366f1,#ec4899);
                                    text-align:center;line-height:34px;">
                          <span style="font-size:18px;">⚓</span>
                        </div>
                      </td>

                      <td style="vertical-align:middle;padding-left:8px;">
                        <span style="font-size:18px;font-weight:800;color:#1e293b;">
                          FlowTask
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </table>

          <h2 style="color:#f1f5f9;margin-top:0;font-size:20px;">
            You've been invited to collaborate
          </h2>

          <p style="color:#94a3b8;line-height:1.6;">
            <strong style="color:#e2e8f0;">${inviterName}</strong> has invited you to join the
            <strong style="color:#818cf8;">${workspaceName}</strong> workspace on FlowTask.
          </p>

          <a href="${inviteLink}"
             style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    color:#fff;padding:13px 28px;border-radius:12px;
                    text-decoration:none;font-weight:700;font-size:14px;margin:20px 0;">
            ✉️ Accept Invitation
          </a>

          <div style="background:#0f1117;border-radius:10px;padding:14px 16px;
                      border:1px solid #2d3348;margin-top:8px;">
            <p style="margin:0;font-size:12px;color:#475569;">
              Or paste this link in your browser:
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#6366f1;word-break:break-all;">
              ${inviteLink}
            </p>
          </div>

          <p style="color:#475569;font-size:12px;margin-top:24px;border-top:1px solid #1e2535;padding-top:16px;">
            This invite expires in <strong>7 days</strong>.
            If you weren't expecting this, you can safely ignore it.
          </p>
        </div>
      </body>
      </html>
    `,
  });

  console.log(`📧 Invite email sent to: ${to}`);
}

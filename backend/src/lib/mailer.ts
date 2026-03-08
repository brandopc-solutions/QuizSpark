import nodemailer from 'nodemailer';

// ── Microsoft Graph sender ───────────────────────────────────────────────────
async function getGraphToken(): Promise<string> {
  const { MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET } = process.env;
  const res = await fetch(
    `https://login.microsoftonline.com/${MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: MS_GRAPH_CLIENT_ID!,
        client_secret: MS_GRAPH_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );
  if (!res.ok) throw new Error(`Graph token request failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function sendViaGraph(email: string, otp: string, username?: string): Promise<void> {
  const from = process.env.MS_GRAPH_FROM_EMAIL!;
  const token = await getGraphToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: 'Your QuizSpark login code',
          body: { contentType: 'HTML', content: EMAIL_HTML(otp, username) },
          toRecipients: [{ emailAddress: { address: email } }],
        },
        saveToSentItems: false,
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail failed ${res.status}: ${text}`);
  }
  console.log(`📧 OTP email sent via Microsoft Graph → ${email}`);
}

const EMAIL_HTML = (otp: string, username?: string) => `
  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;
              background:#1a1a2e;color:#e0e0e0;border-radius:12px;">
    <h1 style="color:#a855f7;margin-top:0;">&#9889; QuizSpark</h1>
    <p>Hi${username ? ` <strong>${username}</strong>` : ''},</p>
    <p>Here is your one-time login code:</p>
    <div style="font-size:2.5rem;font-weight:900;letter-spacing:0.6rem;
                text-align:center;padding:24px;background:#2a2a4a;
                border-radius:8px;color:#a855f7;margin:24px 0;">
      ${otp}
    </div>
    <p style="color:#aaa;">This code expires in <strong style="color:#fff;">10 minutes</strong>
       and can only be used once.</p>
    <p style="color:#666;font-size:0.8rem;">
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
`;

// ── Ethereal dev sender ──────────────────────────────────────────────────────
let _etherealTransport: nodemailer.Transporter | null = null;

async function sendViaEthereal(
  email: string, otp: string, username?: string
): Promise<void> {
  if (!_etherealTransport) {
    const account = await nodemailer.createTestAccount();
    _etherealTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: account.user, pass: account.pass },
    });
    console.log('\n📧 Ethereal dev inbox ready');
    console.log('   View sent mail at: https://ethereal.email/messages');
    console.log('   User:', account.user, '| Pass:', account.pass, '\n');
  }
  const info = await _etherealTransport.sendMail({
    from: '"QuizSpark ⚡" <noreply@quizspark.app>',
    to: email,
    subject: 'Your QuizSpark login code',
    html: EMAIL_HTML(otp, username),
    text: `Your QuizSpark login code: ${otp} (expires in 10 minutes)`,
  });
  console.log('📧 Email preview →', nodemailer.getTestMessageUrl(info));
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function sendOtpEmail(
  email: string, otp: string, username?: string
): Promise<void> {
  if (process.env.MS_GRAPH_TENANT_ID && process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET) {
    await sendViaGraph(email, otp, username);
  } else {
    await sendViaEthereal(email, otp, username);
  }
}



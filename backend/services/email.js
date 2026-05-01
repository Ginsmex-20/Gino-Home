const nodemailer = require('nodemailer');

// E-Mail nur aktiv wenn SMTP konfiguriert
const isConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

const getTransporter = () => {
  if (!transporter && isConfigured()) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

// ── Willkommens-E-Mail nach Registrierung ────────────────────────────────────
const sendWelcome = async (to, username) => {
  if (!isConfigured()) return;
  try {
    await getTransporter().sendMail({
      from: `"Gino-Home" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: '🏠 Willkommen bei Gino-Home!',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#161616;color:#fff;border-radius:16px;padding:32px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:56px;height:56px;background:#f97316;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px">🏠</div>
            <h1 style="margin:16px 0 4px;font-size:22px">Willkommen, ${username}!</h1>
            <p style="color:#94a3b8;margin:0">Dein Gino-Home Konto wurde erstellt</p>
          </div>
          <div style="background:#1e1e1e;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0;color:#cbd5e1">Du hast jetzt Zugriff auf:</p>
            <ul style="color:#94a3b8;margin:12px 0;padding-left:20px;line-height:1.8">
              <li>✅ Aufgaben & Gruppen</li>
              <li>💰 Finanzen & Budgetplanung</li>
              <li>📅 Kalender</li>
              <li>🔐 Tresor (verschlüsselt)</li>
              <li>📄 Dokumente</li>
            </ul>
          </div>
          <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
            Diese E-Mail wurde automatisch von deinem Gino-Home Server gesendet.
          </p>
        </div>
      `,
    });
    console.log(`[Email] Willkommens-Mail an ${to} gesendet`);
  } catch (err) {
    console.error('[Email] Fehler:', err.message);
  }
};

// ── Passwort-Reset-Mail ───────────────────────────────────────────────────────
const sendPasswordReset = async (to, username, resetToken, baseUrl) => {
  if (!isConfigured()) return;
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  try {
    await getTransporter().sendMail({
      from: `"Gino-Home" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: '🔑 Passwort zurücksetzen — Gino-Home',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#161616;color:#fff;border-radius:16px;padding:32px">
          <h2 style="margin-top:0">Passwort zurücksetzen</h2>
          <p style="color:#94a3b8">Hallo ${username},<br>jemand hat eine Passwort-Zurücksetzung für dein Konto angefordert.</p>
          <a href="${resetUrl}" style="display:block;text-align:center;background:#f97316;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:bold;margin:24px 0">
            Passwort zurücksetzen
          </a>
          <p style="color:#64748b;font-size:12px">Dieser Link ist 1 Stunde gültig. Falls du das nicht angefordert hast, ignoriere diese E-Mail.</p>
        </div>
      `,
    });
    console.log(`[Email] Reset-Mail an ${to} gesendet`);
  } catch (err) {
    console.error('[Email] Fehler:', err.message);
  }
};

// ── Einladungs-Mail (Owner erstellt Account für jemanden) ────────────────────
const sendInvite = async (to, username, tempCode) => {
  if (!isConfigured()) {
    console.log(`[Email] SMTP nicht konfiguriert. Temp-Code für ${to}: ${tempCode}`);
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: `"Gino-Home" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: '🏠 Du wurdest zu Gino-Home eingeladen!',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#161616;color:#fff;border-radius:16px;padding:32px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:56px;height:56px;background:#f97316;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px">🏠</div>
            <h1 style="margin:16px 0 4px;font-size:22px">Willkommen, ${username}!</h1>
            <p style="color:#94a3b8;margin:0">Du wurdest zu Gino-Home eingeladen</p>
          </div>
          <div style="background:#1e1e1e;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px">Deine temporären Zugangsdaten:</p>
            <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px">E-Mail</p>
            <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#f1f5f9">${to}</p>
            <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px">Temporärer Code</p>
            <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:6px;color:#f97316;font-family:monospace">${tempCode}</p>
          </div>
          <p style="color:#94a3b8;font-size:13px;text-align:center;margin-bottom:24px">
            Nach dem ersten Login wirst du aufgefordert, ein eigenes Passwort festzulegen.
          </p>
          <a href="https://ginohome.de/login" style="display:block;text-align:center;background:#f97316;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:bold;margin:0 0 20px">
            Jetzt anmelden →
          </a>
          <p style="color:#64748b;font-size:11px;text-align:center;margin:0">
            Diese Einladung wurde von deinem Gino-Home Administrator gesendet.
          </p>
        </div>
      `,
    });
    console.log(`[Email] Einladungs-Mail an ${to} gesendet`);
    return true;
  } catch (err) {
    console.error('[Email] Fehler:', err.message);
    return false;
  }
};

module.exports = { sendWelcome, sendPasswordReset, sendInvite, isConfigured };

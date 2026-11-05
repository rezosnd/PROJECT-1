import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const BRAND_NAME = 'GetMyHospital';
const BRAND_LOGO_MARK = () =>
  `${String(config.PUBLIC_API_ORIGIN || 'https://project1-api.vercel.app').replace(/\/$/, '')}/brand/logo-mark.png`;
const BRAND_LOGO_FULL = () =>
  `${String(config.PUBLIC_API_ORIGIN || 'https://project1-api.vercel.app').replace(/\/$/, '')}/brand/logo.png`;
const BRAND_PORTAL = String(config.PUBLIC_WEB_ORIGIN || 'https://getmyhospital.app').replace(/\/$/, '');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = config.SMTP_EMAIL || process.env.SMTP_EMAIL || 'veritasco.tech@gmail.com';
    const pass = (config.SMTP_PASSWORD || process.env.SMTP_PASSWORD || 'udmd fcse murp gmdg').replace(/"/g, '');

    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST || 'smtp.gmail.com',
      port: Number(config.SMTP_PORT) || 587,
      secure: false,
      auth: { user, pass },
    });
  }
  return transporter;
}

/** Soft peach / mint / lilac shell matching the web CityCare theme */
function buildFormalEmailWrapper({
  headerLinkText = 'Open GetMyHospital',
  headerLinkUrl = BRAND_PORTAL,
  heroSvg = '',
  title = '',
  contentHtml = '',
  ctaText = '',
  ctaUrl = '',
  secondaryNote = '',
  footerAppText = 'Live beds · 15-min holds · ABHA-ready triage',
}) {
  const logoMark = BRAND_LOGO_MARK();
  const logoFull = BRAND_LOGO_FULL();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#F3F1EE; -webkit-font-smoothing:antialiased; }
    table { border-collapse:collapse; }
    a { color:#2F9B7A; text-decoration:none; }
    @media only screen and (max-width:600px) {
      .email-card { padding:28px 20px !important; }
      .email-shell { padding:16px 10px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F3F1EE; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F1EE;">
    <tr>
      <td class="email-shell" align="center" style="padding:36px 16px;">
        <!-- Soft watercolor wash (email-safe solid bands) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto;">
          <tr>
            <td style="height:8px; background:linear-gradient(90deg,#F0B48A 0%,#9ED4B8 50%,#C8C4D8 100%); border-radius:16px 16px 0 0; font-size:0; line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="email-card" style="background-color:#FFFFFF; border:1px solid rgba(17,17,17,0.06); border-top:0; border-radius:0 0 28px 28px; padding:36px 40px; box-shadow:0 16px 40px rgba(17,17,17,0.06);">

              <!-- Header -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <a href="${headerLinkUrl}" style="text-decoration:none;">
                      <img src="${logoFull}" alt="${BRAND_NAME}" width="190" height="46" style="display:block; width:190px; max-width:72%; height:auto; border:0;" />
                    </a>
                    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
                      <img src="${logoMark}" alt="${BRAND_NAME}" width="32" height="32" />
                    </div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${headerLinkUrl}" style="display:inline-block; background:#111111; color:#FFFFFF; font-size:12px; font-weight:700; text-decoration:none; padding:9px 16px; border-radius:999px;">
                      ${headerLinkText}
                    </a>
                  </td>
                </tr>
              </table>

              ${
                heroSvg
                  ? `<div style="text-align:center; margin:4px 0 22px 0;">${heroSvg}</div>`
                  : ''
              }

              <h1 style="color:#111111; font-size:24px; font-weight:800; line-height:1.25; margin:0 0 16px 0; letter-spacing:-0.4px;">
                ${title}
              </h1>

              <div style="color:#4B5563; font-size:15px; line-height:1.65; margin-bottom:22px;">
                ${contentHtml}
              </div>

              ${
                ctaText && ctaUrl
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display:inline-block; background-color:#111111; color:#FFFFFF; font-size:15px; font-weight:700; text-decoration:none; padding:14px 28px; border-radius:999px; text-align:center;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              ${
                secondaryNote
                  ? `<div style="color:#6B7280; font-size:14px; line-height:1.6; margin-bottom:20px;">${secondaryNote}</div>`
                  : ''
              }

              <div style="border-top:1px solid rgba(17,17,17,0.06); padding-top:18px; color:#6B7280; font-size:14px; line-height:1.55;">
                <p style="margin:0 0 4px 0;">Our best,</p>
                <p style="margin:0; font-weight:700; color:#111111;">The GetMyHospital Care Team</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 12px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#6B7280;">${footerAppText}</p>
              <p style="margin:0 0 8px 0; font-size:12px; color:#9CA3AF;">
                <a href="${BRAND_PORTAL}" style="color:#6B7280; text-decoration:none;">Portal</a>
                &nbsp;·&nbsp;
                <a href="${BRAND_PORTAL}/doctors" style="color:#6B7280; text-decoration:none;">Doctors</a>
                &nbsp;·&nbsp;
                <a href="${BRAND_PORTAL}/requests" style="color:#6B7280; text-decoration:none;">My requests</a>
              </p>
              <p style="margin:0; font-size:11px; color:#9CA3AF;">
                GetMyHospital · ABDM partner · Bhubaneswar
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function detailBox(rowsHtml) {
  return `
    <div style="background:linear-gradient(180deg,#FAF8F6 0%,#FFFFFF 100%); border:1px solid rgba(17,17,17,0.06); border-radius:18px; padding:18px 20px; margin:18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        ${rowsHtml}
      </table>
    </div>
  `;
}

function detailRow(label, value, valueColor = '#111111') {
  return `
    <tr>
      <td style="padding:7px 0; color:#6B7280; width:42%; vertical-align:top;">${label}</td>
      <td style="padding:7px 0; font-weight:700; color:${valueColor}; vertical-align:top;">${value}</td>
    </tr>
  `;
}

function getMinimalHealthcareSvg() {
  return `
    <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto; max-width:100%;">
      <circle cx="70" cy="58" r="48" fill="#F0B48A" fill-opacity="0.35"/>
      <circle cx="150" cy="52" r="52" fill="#9ED4B8" fill-opacity="0.4"/>
      <circle cx="118" cy="70" r="36" fill="#C8C4D8" fill-opacity="0.28"/>
      <circle cx="110" cy="56" r="22" fill="#FFFFFF" fill-opacity="0.75" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="M110 46V66M100 56H120" stroke="#111111" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}

export const emailService = {
  async sendWelcomeEmail({ to, name, role }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital Health';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const roleLabel =
        role === 'CITY_ADMIN'
          ? 'City Health Officer'
          : role === 'HOSPITAL_STAFF' || role === 'HOSPITAL_ADMIN'
            ? 'Healthcare Staff'
            : 'Verified Citizen Patient';

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Welcome to <strong style="color:#111111;">GetMyHospital</strong> — live beds, 15-minute holds, and ABHA-ready triage in one place.
        </p>
        ${detailBox(
          detailRow('Registered email', to) +
            detailRow('Account', roleLabel, '#2F9B7A') +
            detailRow('ABHA', 'Link anytime from your profile', '#E89A5C')
        )}
        <p style="margin:0;">
          Find free beds near you, hold for 15 minutes, and share ABHA with hospitals for faster intake.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'Open app',
        headerLinkUrl: BRAND_PORTAL,
        heroSvg: getMinimalHealthcareSvg(),
        title: `Hello, ${name || 'there'}`,
        contentHtml,
        ctaText: 'Find free beds →',
        ctaUrl: `${BRAND_PORTAL}/results`,
        secondaryNote: `<p style="margin:0;">Questions? Just reply to this email — we’re glad you’re here.</p>`,
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Welcome to GetMyHospital, ${name || 'friend'}`,
        html,
      });
      logger.info({ messageId: info.messageId, to }, '[Email] Welcome sent');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err: err.message, to }, '[Email] Welcome failed');
      return { success: false, error: err.message };
    }
  },

  async sendAppointmentConfirmationEmail({
    to,
    patientName,
    doctorName,
    specialty,
    hospitalName,
    hospitalAddress,
    date,
    time,
    fee,
  }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital Health';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Hi <strong style="color:#111111;">${patientName || 'there'}</strong> — your visit with
          <strong style="color:#111111;">${doctorName}</strong> is confirmed.
        </p>
        ${detailBox(
          detailRow('Doctor', doctorName) +
            detailRow('Specialty', specialty, '#2F9B7A') +
            detailRow('Facility', hospitalName) +
            detailRow('Address', hospitalAddress, '#4B5563') +
            detailRow('When', `${date} · ${time}`) +
            detailRow('Fee', `₹ ${Number(fee).toFixed(2)} + GST`)
        )}
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'View portal',
        headerLinkUrl: BRAND_PORTAL,
        heroSvg: getMinimalHealthcareSvg(),
        title: `Appointment with ${doctorName}`,
        contentHtml,
        ctaText: 'Open portal →',
        ctaUrl: `${BRAND_PORTAL}/doctors`,
        secondaryNote: `<p style="margin:0;">ABHA records can sync after your visit for cleaner follow-up.</p>`,
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Appointment confirmed · ${doctorName} · ${date}`,
        html,
      });
      logger.info({ messageId: info.messageId, to }, '[Email] Appointment sent');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err: err.message, to }, '[Email] Appointment failed');
      return { success: false, error: err.message };
    }
  },

  async sendHospitalRegistrationEmail({ to, hospitalName, registrationNo, traumaLevel, photoUrl }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital Health';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          <strong style="color:#111111;">${hospitalName}</strong> is verified on the GetMyHospital emergency network.
        </p>
        ${
          photoUrl
            ? `<div style="text-align:center; margin:16px 0;"><img src="${photoUrl}" alt="${hospitalName}" style="max-width:100%; height:170px; object-fit:cover; border-radius:16px; border:1px solid rgba(17,17,17,0.06);" /></div>`
            : ''
        }
        ${detailBox(
          detailRow('Facility', hospitalName) +
            detailRow('Registration', registrationNo) +
            detailRow('Trauma level', `Level ${traumaLevel}`, '#E89A5C') +
            detailRow('Telemetry', 'Live', '#2F9B7A')
        )}
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'Dashboard',
        headerLinkUrl: `${BRAND_PORTAL}/hospital`,
        heroSvg: getMinimalHealthcareSvg(),
        title: `${hospitalName} is live`,
        contentHtml,
        ctaText: 'Open hospital dashboard →',
        ctaUrl: `${BRAND_PORTAL}/hospital`,
        secondaryNote: `<p style="margin:0;">Update wards, queue, and equipment from the hospital command view.</p>`,
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Verified · ${hospitalName}`,
        html,
      });
      logger.info({ messageId: info.messageId, to }, '[Email] Hospital registration sent');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err: err.message, to }, '[Email] Hospital registration failed');
      return { success: false, error: err.message };
    }
  },

  async sendBedReservationEmail({
    to,
    name,
    hospitalName,
    wardType,
    urgency,
    holdExpiresAt,
    requestId,
    freeBedsNow,
  }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital Health';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';
      const expiresLabel = holdExpiresAt
        ? new Date(holdExpiresAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : '15 minutes from request';

      const requestsUrl = `${BRAND_PORTAL}/requests`;

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Dear <strong style="color:#111111;">${name || 'Patient'}</strong>,
        </p>
        <p style="margin:0 0 8px 0;">
          Your emergency bed hold is in — the hospital triage desk has been notified.
        </p>
        ${detailBox(
          detailRow('Hospital', hospitalName || 'Selected facility') +
            detailRow('Bed type', `${wardType || '—'} ward`) +
            detailRow('Urgency', urgency || 'NORMAL', '#E89A5C') +
            detailRow('Free when booked', String(freeBedsNow ?? '—'), '#2F9B7A') +
            detailRow('Hold expires', expiresLabel) +
            detailRow(
              'Request ID',
              `<span style="font-family:ui-monospace,monospace; font-size:12px; font-weight:600; color:#6B7280;">${requestId || '—'}</span>`
            )
        )}
        <div style="background:#F3FBF7; border:1px solid rgba(47,155,122,0.25); border-radius:16px; padding:14px 16px;">
          <p style="margin:0; font-size:13px; color:#1F5C45; line-height:1.55;">
            <strong>Next:</strong> staff approve or decline within <strong>15 minutes</strong>.
            Track status in My Requests. Life-threatening emergency? Call <strong>112</strong>.
          </p>
        </div>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'My requests',
        headerLinkUrl: requestsUrl,
        heroSvg: getMinimalHealthcareSvg(),
        title: `${wardType || 'Bed'} hold · ${hospitalName || 'Hospital'}`,
        contentHtml,
        ctaText: 'Track my bed request →',
        ctaUrl: requestsUrl,
        secondaryNote: `<p style="margin:0; font-size:12px; color:#9CA3AF;">Advisory confirmation only. If you did not place this request, reply immediately.</p>`,
        footerAppText: 'GetMyHospital · live beds · 15-min holds',
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `GetMyHospital · ${wardType || 'Bed'} hold at ${hospitalName || 'hospital'}`,
        html,
      });
      logger.info({ messageId: info.messageId, to, requestId }, '[Email] Bed reservation sent');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err: err.message, to, requestId }, '[Email] Bed reservation failed');
      return { success: false, error: err.message };
    }
  },

  async sendAbhaOtpEmail({ to, name, otp, txnId }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital ABDM Gateway';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Hello <strong style="color:#111111;">${name || 'Citizen'}</strong>,
        </p>
        <p style="margin:0 0 14px 0;">
          Use this code to verify your <strong>ABHA</strong> on GetMyHospital:
        </p>
        <div style="background:linear-gradient(180deg,#F3FBF7 0%,#FFFFFF 100%); border:1px solid rgba(47,155,122,0.3); border-radius:20px; padding:22px; text-align:center; margin:18px 0;">
          <div style="font-size:11px; font-weight:700; color:#2F9B7A; letter-spacing:1.4px; text-transform:uppercase; margin-bottom:8px;">
            Verification code
          </div>
          <div style="font-size:36px; font-weight:800; color:#111111; letter-spacing:8px; font-family:ui-monospace,monospace;">
            ${otp}
          </div>
          <div style="font-size:12px; color:#6B7280; margin-top:8px;">Valid for 10 minutes</div>
        </div>
        <p style="margin:0; font-size:12px; color:#9CA3AF;">
          Transaction · <code style="color:#6B7280;">${txnId}</code>
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'Open app',
        headerLinkUrl: BRAND_PORTAL,
        heroSvg: getMinimalHealthcareSvg(),
        title: `${otp} is your ABHA code`,
        contentHtml,
        secondaryNote: `<p style="margin:0; font-size:12px; color:#9CA3AF;">Didn’t request this? You can ignore this email.</p>`,
        footerAppText: 'GetMyHospital · ABDM digital health',
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `${otp} is your GetMyHospital ABHA code`,
        html,
      });
      logger.info({ messageId: info.messageId, to, txnId }, '[Email] ABHA OTP sent');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ err: err.message, to, txnId }, '[Email] ABHA OTP failed');
      return { success: false, error: err.message };
    }
  },
};

import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const BRAND_NAME = 'GetMyHospital';
const BRAND_PORTAL = String(config.PUBLIC_WEB_ORIGIN || 'https://getmyhospital.app').replace(/\/$/, '');
const INK = '#0B1F33';
const MUTED = '#5B6775';
const RULE = '#E4E8ED';
const WASH = '#EEF1F4';

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

function fromIdentity(fallbackName = BRAND_NAME) {
  const raw = String(config.FROM_NAME || process.env.FROM_NAME || fallbackName).replace(/["']/g, '');
  // Never show legacy LifeLink / CityHealth branding in the From line
  const cleaned = /lifelink|cityhealth|city.?care/i.test(raw) ? fallbackName : raw;
  return {
    name: cleaned || fallbackName,
    email: config.FROM_EMAIL || process.env.FROM_EMAIL || 'veritasco.tech@gmail.com',
  };
}

/**
 * Formal, single-palette, mobile-first email shell.
 * One ink colour + soft grey wash — no multi-colour gradients.
 */
function buildFormalEmailWrapper({
  title = '',
  contentHtml = '',
  ctaText = '',
  ctaUrl = '',
  secondaryNote = '',
  footerAppText = 'Live beds · 15-minute holds · ABHA-ready triage',
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:${WASH}; -webkit-font-smoothing:antialiased; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; display:block; }
    a { color:${INK}; text-decoration:none; }
    @media only screen and (max-width:620px) {
      .email-shell { padding:0 !important; }
      .email-card { padding:36px 22px 40px !important; }
      .email-title { font-size:26px !important; line-height:1.25 !important; }
      .email-body { font-size:16px !important; }
      .email-cta { display:block !important; width:100% !important; box-sizing:border-box !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${WASH}; font-family:Georgia,'Times New Roman',Times,serif; color:${INK};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${title} — ${BRAND_NAME}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${WASH};">
    <tr>
      <td class="email-shell" align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background-color:#FFFFFF;">

          <!-- Soft wash header -->
          <tr>
            <td align="center" style="background-color:${WASH}; padding:40px 28px 28px 28px;">
              <p style="margin:0 0 22px 0; font-family:Georgia,'Times New Roman',Times,serif; font-size:28px; font-weight:700; letter-spacing:-0.3px; color:${INK};">
                ${BRAND_NAME}
              </p>
              <h1 class="email-title" style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:30px; font-weight:600; line-height:1.28; letter-spacing:-0.4px; color:${INK};">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-card" align="center" style="background-color:#FFFFFF; padding:36px 40px 44px 40px;">
              <div class="email-body" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:${MUTED}; font-size:16px; line-height:1.7; text-align:center;">
                ${contentHtml}
              </div>

              ${
                ctaText && ctaUrl
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0 0;">
                <tr>
                  <td align="center">
                    <a class="email-cta" href="${ctaUrl}" style="display:inline-block; background-color:${INK}; color:#FFFFFF; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; letter-spacing:0.2px; text-decoration:none; padding:14px 36px; border-radius:2px; text-align:center;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              ${
                secondaryNote
                  ? `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:${MUTED}; font-size:13px; line-height:1.6; text-align:center; margin-top:24px;">${secondaryNote}</div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#FFFFFF; border-top:1px solid ${RULE}; padding:22px 28px 28px 28px;">
              <p style="margin:0 0 6px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:${MUTED};">
                ${footerAppText}
              </p>
              <p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:${MUTED};">
                <a href="${BRAND_PORTAL}" style="color:${MUTED}; text-decoration:none;">Portal</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${BRAND_PORTAL}/requests" style="color:${MUTED}; text-decoration:none;">My requests</a>
              </p>
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:11px; color:#8A93A0;">
                ${BRAND_NAME} · Bhubaneswar
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
    <div style="background-color:${WASH}; border:1px solid ${RULE}; border-radius:2px; padding:16px 18px; margin:20px auto; max-width:420px; text-align:left;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px;">
        ${rowsHtml}
      </table>
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0; color:${MUTED}; width:40%; vertical-align:top; font-weight:500;">${label}</td>
      <td style="padding:8px 0; font-weight:700; color:${INK}; vertical-align:top;">${value}</td>
    </tr>
  `;
}

export const emailService = {
  async sendWelcomeEmail({ to, name, role }) {
    try {
      const { name: fromName, email: fromEmail } = fromIdentity();

      const roleLabel =
        role === 'CITY_ADMIN'
          ? 'City Health Officer'
          : role === 'HOSPITAL_STAFF' || role === 'HOSPITAL_ADMIN'
            ? 'Healthcare Staff'
            : 'Verified Patient';

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Welcome to <strong style="color:${INK};">${BRAND_NAME}</strong>. Live hospital beds, verified 15-minute holds, and ABHA-ready triage — in one place.
        </p>
        ${detailBox(
          detailRow('Registered email', to) + detailRow('Account', roleLabel)
        )}
        <p style="margin:0;">
          Find free beds near you, place a hold, and share ABHA with hospitals for faster intake.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        title: `Hello, ${name || 'there'}`,
        contentHtml,
        ctaText: 'Find free beds',
        ctaUrl: `${BRAND_PORTAL}/results`,
        secondaryNote: `<p style="margin:0;">Questions? Reply to this email.</p>`,
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Welcome to ${BRAND_NAME}`,
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
      const { name: fromName, email: fromEmail } = fromIdentity();

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Hi <strong style="color:${INK};">${patientName || 'there'}</strong> — your visit with
          <strong style="color:${INK};">${doctorName}</strong> is confirmed.
        </p>
        ${detailBox(
          detailRow('Doctor', doctorName) +
            detailRow('Specialty', specialty) +
            detailRow('Facility', hospitalName) +
            detailRow('Address', hospitalAddress) +
            detailRow('When', `${date} · ${time}`) +
            detailRow('Fee', `₹ ${Number(fee).toFixed(2)} + GST`)
        )}
      `;

      const html = buildFormalEmailWrapper({
        title: `Appointment with ${doctorName}`,
        contentHtml,
        ctaText: 'Open portal',
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
      const { name: fromName, email: fromEmail } = fromIdentity();

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          <strong style="color:${INK};">${hospitalName}</strong> is verified on the ${BRAND_NAME} emergency network.
        </p>
        ${
          photoUrl
            ? `<div style="text-align:center; margin:16px 0;"><img src="${photoUrl}" alt="${hospitalName}" style="max-width:100%; height:170px; object-fit:cover; border-radius:2px; border:1px solid ${RULE};" /></div>`
            : ''
        }
        ${detailBox(
          detailRow('Facility', hospitalName) +
            detailRow('Registration', registrationNo) +
            detailRow('Trauma level', `Level ${traumaLevel}`)
        )}
      `;

      const html = buildFormalEmailWrapper({
        title: `${hospitalName} is live`,
        contentHtml,
        ctaText: 'Open hospital dashboard',
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
      const { name: fromName, email: fromEmail } = fromIdentity();
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
          Dear <strong style="color:${INK};">${name || 'Patient'}</strong>,
        </p>
        <p style="margin:0 0 8px 0;">
          Your emergency bed hold is confirmed. The hospital triage desk has been notified.
        </p>
        ${detailBox(
          detailRow('Hospital', hospitalName || 'Selected facility') +
            detailRow('Bed type', `${wardType || '—'} ward`) +
            detailRow('Urgency', urgency || 'NORMAL') +
            detailRow('Free when booked', String(freeBedsNow ?? '—')) +
            detailRow('Hold expires', expiresLabel) +
            detailRow(
              'Request ID',
              `<span style="font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px; font-weight:600; color:${MUTED};">${requestId || '—'}</span>`
            )
        )}
        <p style="margin:0; font-size:14px; color:${MUTED};">
          <strong style="color:${INK};">Next:</strong> staff approve or decline within
          <strong style="color:${INK};">15 minutes</strong>.
          Track status in My Requests. Life-threatening emergency? Call <strong style="color:${INK};">112</strong>.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        title: `${wardType || 'Bed'} hold at ${hospitalName || 'hospital'}`,
        contentHtml,
        ctaText: 'Track my request',
        ctaUrl: requestsUrl,
        secondaryNote: `<p style="margin:0;">Advisory confirmation only. If you did not place this request, reply immediately.</p>`,
        footerAppText: `${BRAND_NAME} · live beds · 15-minute holds`,
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `${BRAND_NAME} · ${wardType || 'Bed'} hold at ${hospitalName || 'hospital'}`,
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
      const { name: fromName, email: fromEmail } = fromIdentity(`${BRAND_NAME} ABDM`);

      const contentHtml = `
        <p style="margin:0 0 14px 0;">
          Hello <strong style="color:${INK};">${name || 'Citizen'}</strong>,
        </p>
        <p style="margin:0 0 14px 0;">
          Use this code to verify your <strong style="color:${INK};">ABHA</strong> on ${BRAND_NAME}:
        </p>
        <div style="background-color:${WASH}; border:1px solid ${RULE}; border-radius:2px; padding:22px; text-align:center; margin:18px auto; max-width:320px;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:11px; font-weight:700; color:${MUTED}; letter-spacing:1.4px; text-transform:uppercase; margin-bottom:8px;">
            Verification code
          </div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace; font-size:34px; font-weight:800; color:${INK}; letter-spacing:8px;">
            ${otp}
          </div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; color:${MUTED}; margin-top:8px;">Valid for 10 minutes</div>
        </div>
        <p style="margin:0; font-size:12px; color:#8A93A0;">
          Transaction · <code style="color:${MUTED};">${txnId}</code>
        </p>
      `;

      const html = buildFormalEmailWrapper({
        title: `${otp} is your ABHA code`,
        contentHtml,
        secondaryNote: `<p style="margin:0;">Didn’t request this? You can ignore this email.</p>`,
        footerAppText: `${BRAND_NAME} · ABDM digital health`,
      });

      const info = await getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `${otp} is your ${BRAND_NAME} ABHA code`,
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

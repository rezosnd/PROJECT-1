import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const BRAND_NAME = 'GetMyHospital';
const BRAND_LOGO_MARK = () =>
  `${String(config.PUBLIC_API_ORIGIN || 'https://project1-api.vercel.app').replace(/\/$/, '')}/brand/logo-mark.png`;
const BRAND_LOGO_FULL = () =>
  `${String(config.PUBLIC_API_ORIGIN || 'https://project1-api.vercel.app').replace(/\/$/, '')}/brand/logo.png`;
const BRAND_PORTAL = 'https://getmyhospital.app';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = config.SMTP_EMAIL || process.env.SMTP_EMAIL || 'veritasco.tech@gmail.com';
    const pass = (config.SMTP_PASSWORD || process.env.SMTP_PASSWORD || 'udmd fcse murp gmdg').replace(/"/g, '');

    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST || 'smtp.gmail.com',
      port: Number(config.SMTP_PORT) || 587,
      secure: false, // TLS
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

/**
 * Base email layout matching the clean, minimal, formal, professional aesthetic:
 * - Crisp white card on subtle off-white background
 * - Top brand mark + secondary header link
 * - Tasteful muted hero illustration
 * - High-readability typography with generous whitespace
 * - Single tasteful royal blue accent for CTA
 * - Minimal, quiet footer
 */
function buildFormalEmailWrapper({
  headerLinkText = 'Open GetMyHospital',
  headerLinkUrl = BRAND_PORTAL,
  heroSvg = '',
  title = '',
  contentHtml = '',
  ctaText = '',
  ctaUrl = '',
  secondaryNote = '',
  footerAppText = 'Stay in touch with your care network from anywhere. Download the app',
}) {
  const logoMark = BRAND_LOGO_MARK();
  const logoFull = BRAND_LOGO_FULL();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F4F7F2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #3F7A1E;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-card {
        padding: 28px 20px !important;
      }
      .email-container {
        padding: 12px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F7F2; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto;">
          <tr>
            <td class="email-card" style="background-color: #FFFFFF; border: 1px solid #D8E0D4; border-radius: 16px; padding: 40px 44px; box-shadow: 0 1px 3px rgba(11, 61, 26, 0.06);">
              
              <!-- Header Row: Brand Logo & Secondary Header Link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <!-- Brand Logo -->
                  <td align="left" style="vertical-align: middle;">
                    <a href="${headerLinkUrl}" style="text-decoration:none;">
                      <img src="${logoFull}" alt="${BRAND_NAME}" width="200" height="48" style="display:block; width:200px; max-width:70%; height:auto; border:0; background:transparent;" />
                    </a>
                    <!-- Fallback mark for clients that block remote images -->
                    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
                      <img src="${logoMark}" alt="${BRAND_NAME}" width="32" height="32" />
                    </div>
                  </td>

                  <!-- Secondary Header Link -->
                  <td align="right" style="vertical-align: middle;">
                    <a href="${headerLinkUrl}" style="color: #3F7A1E; font-size: 14px; text-decoration: none; font-weight: 600;">
                      ${headerLinkText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Hero Illustration Area (Subtle, Muted Line-Art / Vector) -->
              ${
                heroSvg
                  ? `
              <div style="text-align: center; margin: 12px 0 28px 0;">
                ${heroSvg}
              </div>`
                  : ''
              }

              <!-- Main Title Heading -->
              <h1 style="color: #1E293B; font-size: 23px; font-weight: 700; line-height: 1.35; margin: 0 0 18px 0; letter-spacing: -0.3px;">
                ${title}
              </h1>

              <!-- Content Body -->
              <div style="color: #475569; font-size: 15px; line-height: 1.65; margin-bottom: 26px;">
                ${contentHtml}
              </div>

              <!-- Call to Action Button (Crisp Royal Blue) -->
              ${
                ctaText && ctaUrl
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background-color: #0B3D1A; color: #A8E017; font-size: 15px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 999px; text-align: center;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <!-- Secondary Closing Note -->
              ${
                secondaryNote
                  ? `
              <div style="color: #475569; font-size: 15px; line-height: 1.65; margin-bottom: 24px;">
                ${secondaryNote}
              </div>`
                  : ''
              }

              <!-- Sign-off -->
              <div style="color: #334155; font-size: 15px; line-height: 1.6; padding-top: 10px;">
                <p style="margin: 0 0 4px 0; color: #64748B;">Our best,</p>
                <p style="margin: 0; font-weight: 600; color: #1E293B;">The GetMyHospital Care Team</p>
              </div>

            </td>
          </tr>

          <!-- Subtle Minimalist Footer -->
          <tr>
            <td style="padding: 24px 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12.5px; color: #64748B;">
                ${footerAppText}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94A3B8;">
                <a href="${BRAND_PORTAL}" style="color: #64748B; text-decoration: none;">Portal</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="${BRAND_PORTAL}/doctors" style="color: #64748B; text-decoration: none;">Top Doctors</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="${BRAND_PORTAL}/help" style="color: #64748B; text-decoration: none;">Help Center</a>
              </p>
              <p style="margin: 0; font-size: 11.5px; color: #94A3B8;">
                GetMyHospital National Health Network • Ayushman Bharat Digital Mission (ABDM) Partner
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

/**
 * Clean, subtle, muted SVG header graphic matching the Twist hero illustration style
 */
function getMinimalHealthcareSvg() {
  return `
    <svg width="220" height="130" viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; max-width: 100%;">
      <!-- Gentle Background Aura -->
      <circle cx="110" cy="65" r="58" fill="#F1F5F9" />
      <circle cx="145" cy="50" r="38" fill="#EFF6FF" />
      <circle cx="75" cy="75" r="32" fill="#F8FAFC" />
      
      <!-- Minimalist Care Team Figures (Muted Slate / Royal Blue) -->
      <!-- Center Specialist -->
      <circle cx="110" cy="42" r="10" fill="#2563EB" />
      <path d="M96 74C96 64 102 59 110 59C118 59 124 64 124 74V84H96V74Z" fill="#3B82F6" />
      
      <!-- Left Practitioner -->
      <circle cx="82" cy="48" r="9" fill="#64748B" />
      <path d="M70 78C70 69 75 64 82 64C89 64 94 69 94 78V84H70V78Z" fill="#94A3B8" />

      <!-- Right Practitioner -->
      <circle cx="138" cy="48" r="9" fill="#64748B" />
      <path d="M126 78C126 69 131 64 138 64C145 64 150 69 150 78V84H126V78Z" fill="#94A3B8" />
      
      <!-- Stethoscope / Cross Accent (Clean White line) -->
      <path d="M110 65V75M105 70H115" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
      
      <!-- Soft Baseline Accent Line -->
      <path d="M50 94H170" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 3" />
    </svg>
  `;
}

export const emailService = {
  /**
   * Send Formal Welcome Email on Account Creation / Sign In
   */
  async sendWelcomeEmail({ to, name, role }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital Health';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const roleLabel =
        role === 'CITY_ADMIN'
          ? 'City Health Officer'
          : role === 'HOSPITAL_STAFF'
            ? 'Healthcare Staff Member'
            : 'Verified Citizen Patient';

      const contentHtml = `
        <p style="margin: 0 0 14px 0;">
          You just created your account on <strong>GetMyHospital</strong>. It's a first step toward accessing real-time critical care, verified doctor appointments, and emergency hospital bed availability in a calmer, more transparent way. Congrats!
        </p>
        <p style="margin: 0 0 18px 0;">
          Navigating healthcare emergencies or scheduling specialist care isn't easy, but we've got your back. We put together a few resources and best practices for getting the most out of GetMyHospital:
        </p>
        
        <!-- Clean Summary Box -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 18px 20px; margin: 20px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #64748B; width: 140px;">Registered Email</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Account Tier</td>
              <td style="padding: 5px 0; font-weight: 600; color: #2563EB;">${roleLabel}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">ABDM Integration</td>
              <td style="padding: 5px 0; font-weight: 600; color: #059669;">Active Digital Health Identity</td>
            </tr>
          </table>
        </div>
      `;

      const secondaryNote = `
        <p style="margin: 0 0 14px 0;">
          We'll be in touch in the coming days to make sure your experience with GetMyHospital is as smooth as possible. If you have any questions now, simply reply to this email.
        </p>
        <p style="margin: 0; font-weight: 600; color: #1E293B;">
          We're glad you're here!
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'Open GetMyHospital',
        headerLinkUrl: 'http://localhost:5000',
        heroSvg: getMinimalHealthcareSvg(),
        title: `Welcome to GetMyHospital, ${name}!`,
        contentHtml,
        ctaText: 'Browse Top Doctors →',
        ctaUrl: 'http://localhost:8081',
        secondaryNote,
        footerAppText: 'Stay in touch with your care network from anywhere. Download the app',
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Welcome to GetMyHospital, ${name}!`,
        html,
      };

      const info = await getTransporter().sendMail(mailOptions);
      logger.info(
        { messageId: info.messageId, to },
        '[Email Service] Formal welcome email transmitted successfully'
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(
        { err: err.message, to },
        '[Email Service] Failed to transmit formal welcome email'
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Send Doctor Appointment Confirmation Email
   */
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
        <p style="margin: 0 0 14px 0;">
          Your specialist appointment with <strong>${doctorName}</strong> (${specialty}) has been confirmed and scheduled on the GetMyHospital Care Network.
        </p>

        <!-- Structured Details Table -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 18px 20px; margin: 20px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #64748B; width: 140px;">Doctor</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${doctorName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Specialty</td>
              <td style="padding: 5px 0; font-weight: 600; color: #2563EB;">${specialty}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Facility</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${hospitalName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Address</td>
              <td style="padding: 5px 0; color: #475569;">${hospitalAddress}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Date & Time</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${date} at ${time}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Consultation Fee</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">₹ ${Number(fee).toFixed(2)} + GST</td>
            </tr>
          </table>
        </div>
      `;

      const secondaryNote = `
        <p style="margin: 0 0 14px 0;">
          Your Ayushman Bharat Health Account (ABHA) record has been linked so medical notes and diagnostic tests will securely sync to your digital health locker.
        </p>
        <p style="margin: 0;">
          If you need to reschedule or have questions before your consultation, simply reply to this email or visit your patient portal.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'View in Portal',
        headerLinkUrl: 'http://localhost:8081',
        title: `Appointment Confirmed with ${doctorName}`,
        contentHtml,
        ctaText: 'View Appointment Details →',
        ctaUrl: 'http://localhost:8081',
        secondaryNote,
        footerAppText: 'Stay in touch with your care network from anywhere. Download the app',
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Appointment Confirmed: ${doctorName} on ${date}`,
        html,
      };

      const info = await getTransporter().sendMail(mailOptions);
      logger.info(
        { messageId: info.messageId, to },
        '[Email Service] Appointment confirmation email transmitted'
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(
        { err: err.message, to },
        '[Email Service] Failed to send appointment confirmation email'
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Send Hospital Registration Confirmation with Cloudinary Photo
   */
  async sendHospitalRegistrationEmail({
    to,
    hospitalName,
    registrationNo,
    traumaLevel,
    photoUrl,
  }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital Health';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const contentHtml = `
        <p style="margin: 0 0 14px 0;">
          We are pleased to inform you that <strong>${hospitalName}</strong> has been successfully verified and provisioned on the GetMyHospital Urban Emergency Network.
        </p>
        <p style="margin: 0 0 18px 0;">
          Your facility is now connected to the real-time bed telemetry and emergency ambulance routing cluster:
        </p>

        ${
          photoUrl
            ? `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${photoUrl}" alt="${hospitalName}" style="max-width: 100%; height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #E2E8F0;" />
        </div>`
            : ''
        }

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 18px 20px; margin: 20px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #64748B; width: 150px;">Facility Name</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${hospitalName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Registration ID</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${registrationNo}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Trauma Level</td>
              <td style="padding: 5px 0; font-weight: 600; color: #2563EB;">Level ${traumaLevel} Accredited</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748B;">Telemetry Bridge</td>
              <td style="padding: 5px 0; font-weight: 600; color: #059669;">Neon PostGIS Active</td>
            </tr>
          </table>
        </div>
      `;

      const secondaryNote = `
        <p style="margin: 0 0 14px 0;">
          Hospital administrators can update bed occupancy, register ventilator telemetry, and manage admissions through the hospital dashboard.
        </p>
        <p style="margin: 0;">
          If you have any questions regarding your facility onboarding, please reply directly to this email.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'Launch Dashboard',
        headerLinkUrl: 'http://localhost:5000',
        title: `${hospitalName} Registration Verified`,
        contentHtml,
        ctaText: 'Access Hospital Dashboard →',
        ctaUrl: 'http://localhost:5000',
        secondaryNote,
        footerAppText: 'Stay in touch with your care network from anywhere. Download the app',
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Registration Verified: ${hospitalName}`,
        html,
      };

      const info = await getTransporter().sendMail(mailOptions);
      logger.info(
        { messageId: info.messageId, to },
        '[Email Service] Hospital registration email transmitted'
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(
        { err: err.message, to },
        '[Email Service] Failed to send hospital registration email'
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Formal confirmation when a patient places a 15-minute bed hold
   */
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

      const portalBase =
        (config.PUBLIC_API_ORIGIN || 'http://10.5.114.133:5000').replace(':5000', ':5173') ||
        'http://localhost:5173';
      const requestsUrl = `${portalBase.replace(/\/$/, '')}/requests`;

      const contentHtml = `
        <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.55; color: #334155;">
          Dear <strong style="color:#0F172A;">${name || 'Patient'}</strong>,
        </p>
        <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.55; color: #334155;">
          Your emergency bed reservation is confirmed on the
          <strong style="color:#0B2A5B;">GetMyHospital Emergency Health Grid</strong>.
          The hospital triage desk has been notified.
        </p>

        <div style="background: linear-gradient(180deg,#F8FAFC 0%,#FFFFFF 100%); border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 22px; margin: 8px 0 20px;">
          <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B;">
            Reservation summary
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748B; width: 42%;">Hospital</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0F172A;">${hospitalName || 'Selected facility'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B;">Bed type</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0F172A;">${wardType || '—'} ward</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B;">Urgency</td>
              <td style="padding: 8px 0; font-weight: 700; color: #B45309;">${urgency || 'NORMAL'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B;">Beds free when you booked</td>
              <td style="padding: 8px 0; font-weight: 700; color: #059669;">${freeBedsNow ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B;">Hold expires</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0F172A;">${expiresLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B;">Request ID</td>
              <td style="padding: 8px 0; font-family: ui-monospace, monospace; font-size: 12px; color: #475569;">${requestId || '—'}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 16px 18px; margin: 0 0 8px;">
          <p style="margin: 0; font-size: 13px; color: #1E3A8A; line-height: 1.55;">
            <strong>What happens next?</strong> Clinical staff approve or reject within
            <strong>15 minutes</strong>. Track live status in <em>My Requests</em>.
            Life-threatening emergency? Call <strong>112</strong>.
          </p>
        </div>
      `;

      const secondaryNote = `
        <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
          Operational confirmation from GetMyHospital CityHealth — advisory only, not a certified medical device.
          If you did not place this request, reply to this email immediately.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'My Requests',
        headerLinkUrl: requestsUrl,
        heroSvg: getMinimalHealthcareSvg(),
        title: `${wardType || 'Bed'} hold · ${hospitalName || 'Hospital'}`,
        contentHtml,
        ctaText: 'Track my bed request →',
        ctaUrl: requestsUrl,
        secondaryNote,
        footerAppText: 'GetMyHospital Emergency Health Grid · Bhubaneswar',
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `GetMyHospital · ${wardType || 'Bed'} hold at ${hospitalName || 'hospital'} — respond in 15 min`,
        html,
      };

      const info = await getTransporter().sendMail(mailOptions);
      logger.info(
        { messageId: info.messageId, to, requestId },
        '[Email Service] Bed reservation confirmation email sent'
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(
        { err: err.message, to, requestId },
        '[Email Service] Failed to send bed reservation email'
      );
      return { success: false, error: err.message };
    }
  },

  /**
   * Send ABHA OTP Verification Email (Zero-delay dispatch directly to registered email)
   */
  async sendAbhaOtpEmail({ to, name, otp, txnId }) {
    try {
      const fromName = config.FROM_NAME || 'GetMyHospital ABDM Gateway';
      const fromEmail = config.FROM_EMAIL || 'veritasco.tech@gmail.com';

      const contentHtml = `
        <p style="margin: 0 0 14px 0;">
          Hello <strong>${name || 'Citizen'}</strong>,
        </p>
        <p style="margin: 0 0 14px 0;">
          Here is your 6-digit verification code to link and verify your <strong>Ayushman Bharat Health Account (ABHA)</strong> on the GetMyHospital Health Network:
        </p>

        <!-- Large High-Visibility OTP Box -->
        <div style="background-color: #F0FDF4; border: 2px solid #86EFAC; border-radius: 8px; padding: 24px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #15803D; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
            Verification Code (OTP)
          </div>
          <div style="font-size: 38px; font-weight: 800; color: #166534; letter-spacing: 8px; font-family: monospace;">
            ${otp}
          </div>
          <div style="font-size: 12px; color: #64748B; margin-top: 8px;">
            Valid for 10 minutes • Sandbox quick test OTP: 123456
          </div>
        </div>

        <p style="margin: 0; font-size: 13px; color: #64748B;">
          Transaction Reference: <code>${txnId}</code>
        </p>
      `;

      const secondaryNote = `
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">
          If you did not initiate this ABHA linkage request, no action is needed. Your health identity remains completely secure.
        </p>
      `;

      const html = buildFormalEmailWrapper({
        headerLinkText: 'GetMyHospital Health Grid',
        headerLinkUrl: 'http://localhost:5173',
        heroSvg: getMinimalHealthcareSvg(),
        title: `${otp} is your GetMyHospital ABHA Verification Code`,
        contentHtml,
        secondaryNote,
        footerAppText: 'GetMyHospital ABDM Digital Health Registry • National Health Authority Sandbox',
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `${otp} is your GetMyHospital ABHA Verification Code`,
        html,
      };

      const info = await getTransporter().sendMail(mailOptions);
      logger.info(
        { messageId: info.messageId, to, txnId },
        '[Email Service] ABHA OTP verification email transmitted successfully'
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(
        { err: err.message, to, txnId },
        '[Email Service] Failed to send ABHA OTP verification email'
      );
      return { success: false, error: err.message };
    }
  },
};

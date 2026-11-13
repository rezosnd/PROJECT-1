/**
 * Patient identity QR for doctor scan → referral flow.
 * Compact payload so phone cameras + qrserver.com stay reliable.
 * Format: GMH1:<patientId>:<qrToken>
 * Legacy JSON { type: 'GMH_PATIENT', ... } is still accepted when scanning.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function buildPatientQrPayload({ patientId, qrToken } = {}) {
  const id = String(patientId || '').trim();
  const token = String(qrToken || '').trim();
  if (!isUuid(id) || !isUuid(token)) {
    throw new Error('patientId and qrToken must be UUIDs to build Care QR');
  }
  // Compact — fits QR easily; avoids name/unicode truncation on external QR APIs
  return `GMH1:${id}:${token}`;
}

export function buildPatientQrImageUrl(payload, size = 320) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(data)}`;
}

export function buildPatientQrBundle(fields) {
  const qrPayload = buildPatientQrPayload(fields);
  const qrImageUrl = buildPatientQrImageUrl(qrPayload);
  return { qrPayload, qrImageUrl };
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractFromQrServerUrl(text) {
  try {
    if (!/qrserver\.com|create-qr-code/i.test(text)) return null;
    const u = new URL(text);
    const data = u.searchParams.get('data');
    return data ? decodeURIComponent(data) : null;
  } catch {
    const m = String(text).match(/[?&]data=([^&]+)/i);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
}

function extractUuids(text) {
  const matches = String(text).match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi
  );
  return matches || [];
}

/**
 * Normalize camera / paste input into { patientId, token } for DB lookup.
 */
export function parsePatientQrInput(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  if (!text) return null;

  // Camera sometimes returns percent-encoded JSON / deep links
  try {
    if (/%7B|%22|%3A/i.test(text)) {
      text = decodeURIComponent(text);
    }
  } catch {
    /* keep raw */
  }

  // If someone pasted the qrserver image URL itself, pull `data=`
  const fromUrl = extractFromQrServerUrl(text);
  if (fromUrl) text = fromUrl.trim();

  // Compact v1: GMH1:<patientId>:<token>
  const compact = text.match(
    /^GMH1:([0-9a-f-]{36}):([0-9a-f-]{36})$/i
  );
  if (compact) {
    return { patientId: compact[1], token: compact[2], type: 'GMH_PATIENT', format: 'GMH1' };
  }

  // Direct UUID (patient id or qr token)
  if (isUuid(text)) {
    return { patientId: text, token: text, type: 'GMH_PATIENT', format: 'UUID' };
  }

  // Legacy / verbose JSON payload
  const parsed = tryParseJson(text);
  if (parsed && typeof parsed === 'object') {
    const patientId = parsed.patientId || parsed.patient_id || parsed.id || null;
    const token = parsed.token || parsed.qrToken || parsed.qr_token || null;
    if (
      parsed.type === 'GMH_PATIENT' ||
      parsed.type === 'GMH1' ||
      patientId ||
      token
    ) {
      return {
        patientId: isUuid(patientId) ? patientId : null,
        token: isUuid(token) ? token : null,
        type: parsed.type || 'GMH_PATIENT',
        format: 'JSON',
      };
    }
    // Wrong QR (e.g. ABHA) — do not pretend it is a patient
    if (parsed.hid || parsed.abhaNumber || parsed.abha || parsed['phr-address']) {
      return { patientId: null, token: null, type: 'ABHA_OR_OTHER', format: 'JSON' };
    }
  }

  // Deep link: gmh://patient/<uuid> or …/p/<uuid>
  const linkMatch = text.match(/(?:gmh:\/\/patient\/|\/p\/)([0-9a-f-]{36})/i);
  if (linkMatch) {
    return { patientId: linkMatch[1], token: linkMatch[1], type: 'GMH_PATIENT', format: 'LINK' };
  }

  // Last resort: any two UUIDs in the string → id + token
  const uuids = extractUuids(text);
  if (uuids.length >= 2) {
    return { patientId: uuids[0], token: uuids[1], type: 'GMH_PATIENT', format: 'EXTRACT' };
  }
  if (uuids.length === 1) {
    return { patientId: uuids[0], token: uuids[0], type: 'GMH_PATIENT', format: 'EXTRACT' };
  }

  return null;
}

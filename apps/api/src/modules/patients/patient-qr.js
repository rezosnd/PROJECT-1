/**
 * Patient identity QR for doctor scan → referral flow.
 * Separate from ABHA QR (which is KYC). This QR identifies the GetMyHospital patient.
 */

export function buildPatientQrPayload({
  patientId,
  qrToken,
  name,
  bloodGroup,
  cityName,
} = {}) {
  return JSON.stringify({
    type: 'GMH_PATIENT',
    v: 1,
    patientId: patientId || '',
    token: qrToken || '',
    name: name || '',
    bloodGroup: bloodGroup || '',
    city: cityName || '',
    source: 'GetMyHospital',
  });
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

export function parsePatientQrInput(raw) {
  if (!raw) return null;
  const text = String(raw).trim();

  // Direct UUID (patient id or qr token)
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(text)) {
    return { patientId: text, token: text };
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && (parsed.type === 'GMH_PATIENT' || parsed.patientId || parsed.token)) {
      return {
        patientId: parsed.patientId || null,
        token: parsed.token || null,
        type: parsed.type || 'GMH_PATIENT',
      };
    }
  } catch {
    // not JSON
  }

  // Deep link style: gmh://patient/<uuid> or https://.../p/<uuid>
  const linkMatch = text.match(/(?:gmh:\/\/patient\/|\/p\/)([0-9a-f-]{36})/i);
  if (linkMatch) {
    return { patientId: linkMatch[1], token: linkMatch[1] };
  }

  return null;
}

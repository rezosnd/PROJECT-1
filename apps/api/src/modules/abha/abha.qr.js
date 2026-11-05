/**
 * Build a stable ABHA QR payload + public image URL for hospital intake scanners.
 */

export function buildAbhaQrPayload({
  maskedNumber,
  abhaAddress,
  name,
  yearOfBirth,
  gender,
  mobile,
} = {}) {
  return JSON.stringify({
    type: 'ABHA',
    number: maskedNumber || '',
    address: abhaAddress || '',
    name: name || '',
    yob: yearOfBirth || '',
    gender: gender || '',
    mobile: mobile || '',
    source: 'LifeLink',
  });
}

export function buildAbhaQrImageUrl(payload, size = 280) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

export function buildAbhaQrBundle(fields) {
  const qrPayload = buildAbhaQrPayload(fields);
  const qrImageUrl = buildAbhaQrImageUrl(qrPayload);
  return { qrPayload, qrImageUrl };
}

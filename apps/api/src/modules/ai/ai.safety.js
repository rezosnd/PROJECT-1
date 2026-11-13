/**
 * Deterministic emergency / urgency detection — never downgraded by the LLM.
 */

const CRITICAL_PATTERNS = [
  /\bchest\s*pain\b/i,
  /\bheart\s*attack\b/i,
  /\b(?:can't|cannot|cant)\s+breathe\b/i,
  /\bsevere\s+breath(?:ing)?\s+(?:difficulty|problem|trouble)\b/i,
  /\bshort(?:ness)?\s+of\s+breath\b/i,
  /\bunconscious\b/i,
  /\bpassed\s+out\b/i,
  /\bstroke\b/i,
  /\bface\s+droop\b/i,
  /\bspeech\s+(?:slurred|difficulty)\b/i,
  /\bseizure\b/i,
  /\bconvulsion\b/i,
  /\bsevere\s+bleed(?:ing)?\b/i,
  /\bbleeding\s+(?:heavily|uncontroll)/i,
  /\bsuicid/i,
  /\boverdose\b/i,
  /\banaphylaxis\b/i,
  /\bchok(?:e|ing)\b/i,
  /\bcardiac\s+arrest\b/i,
  // Hindi transliteration / common phrases
  /\bsans\s+(?:nahi|nahin)\s+aa\b/i,
  /\bseene\s+mein\s+dard\b/i,
  /\bbehosh\b/i,
  /\bdil\s+ka\s+daura\b/i,
];

const URGENT_PATTERNS = [
  /\bhigh\s+fever\b/i,
  /\bfever\s+(?:above|over)\s*10[2-9]/i,
  /\bfracture\b/i,
  /\bbroken\s+bone\b/i,
  /\bsevere\s+(?:pain|headache|vomiting)\b/i,
  /\bpregnan(?:t|cy).{0,40}bleed/i,
  /\bburn\b/i,
  /\bsnake\s*bite\b/i,
  /\bdengue\b/i,
  /\bappendicitis\b/i,
  /\bdehydrated?\b/i,
];

const CONDITION_HINTS = [
  { re: /breath|asthma|oxygen|respiratory|sans/i, q: 'respiratory distress', severity: 'CRITICAL' },
  { re: /chest|cardiac|heart|dil/i, q: 'cardiac arrest', severity: 'CRITICAL' },
  { re: /stroke|paralysis|face droop/i, q: 'stroke', severity: 'CRITICAL' },
  { re: /pregnan|labour|delivery/i, q: 'obstetric emergency', severity: 'URGENT' },
  { re: /baby|newborn|neonat/i, q: 'premature baby', severity: 'CRITICAL' },
  { re: /dengue|platelet/i, q: 'severe dengue', severity: 'URGENT' },
  { re: /trauma|accident|fracture|injury/i, q: 'trauma', severity: 'URGENT' },
  { re: /burn/i, q: 'burn', severity: 'URGENT' },
  { re: /snake/i, q: 'snakebite', severity: 'CRITICAL' },
  { re: /fever|flu|infection/i, q: 'fever', severity: 'NORMAL' },
  { re: /icu|ventilator/i, q: 'icu', severity: 'URGENT' },
  { re: /blood|transfusion/i, q: 'blood bank', severity: 'URGENT' },
];

export function analyzeEmergency(text = '') {
  const raw = String(text || '').trim();
  if (!raw) {
    return { severity: 'NORMAL', matched: [], conditionQuery: null, isEmergency: false };
  }

  const matched = [];
  for (const re of CRITICAL_PATTERNS) {
    if (re.test(raw)) matched.push(re.source);
  }
  if (matched.length) {
    const hint = CONDITION_HINTS.find((h) => h.re.test(raw));
    return {
      severity: 'CRITICAL',
      matched,
      conditionQuery: hint?.q || 'trauma',
      isEmergency: true,
      emergencyNumber: '112',
      advice:
        'This may be a medical emergency. Call 112 / go to the nearest emergency department immediately. Do not wait for an app assessment.',
    };
  }

  for (const re of URGENT_PATTERNS) {
    if (re.test(raw)) matched.push(re.source);
  }
  if (matched.length) {
    const hint = CONDITION_HINTS.find((h) => h.re.test(raw));
    return {
      severity: 'URGENT',
      matched,
      conditionQuery: hint?.q || 'trauma',
      isEmergency: false,
      emergencyNumber: '112',
      advice: 'Please seek prompt medical assessment. If symptoms worsen, call 112.',
    };
  }

  const hint = CONDITION_HINTS.find((h) => h.re.test(raw));
  return {
    severity: hint?.severity === 'CRITICAL' ? 'URGENT' : 'NORMAL',
    matched: [],
    conditionQuery: hint?.q || null,
    isEmergency: false,
    emergencyNumber: '112',
    advice: null,
  };
}

export const SYSTEM_PROMPT = `You are CityHealth AI (GetMyHospital), a healthcare information and hospital navigation assistant for patients in India (primarily Bhubaneswar / Odisha).

Rules:
- Provide general health education in clear language (English or Hindi matching the user).
- Explain common symptoms WITHOUT claiming a diagnosis or naming a definite disease for the patient.
- Never prescribe prescription medicines or invent dosages.
- Never fabricate hospital names, bed counts, equipment, doctors, or distances.
- Only describe hospitals/beds/equipment using TOOL RESULTS provided in this conversation.
- If tool results are empty, say no verified match was found — do not invent alternatives.
- Encourage professional medical care when appropriate.
- For CRITICAL emergencies: prioritize calling 112 and going to emergency care immediately. Do not ask unnecessary clarifying questions that delay help.
- You are NOT a medical device and NOT a substitute for emergency medical services.
- Keep answers concise, structured, and actionable (2–5 short sentences max for the main reply).
- Do NOT dump long hospital bullet lists, phone directories, or bed tables in the text reply — the app UI already renders hospital cards from verified tool data. At most mention how many nearby matches were found.
- Do NOT paste full knowledge-article excerpts or "Trusted guidance" bullet dumps — the app shows those as separate cards. Summarize in plain language only.
- Avoid markdown walls (no heavy **bold** lists). Use plain readable sentences.
- When recommending hospitals, you may briefly note that live beds can change; do not invent distances or counts.
`;

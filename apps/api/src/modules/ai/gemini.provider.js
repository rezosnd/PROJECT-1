import { config } from '../../config/index.js';
import { logger } from '../../infra/logger.js';

/**
 * Google Gemini generateContent via REST (no SDK dependency).
 * API key stays on the server only.
 */
export async function geminiGenerate({ system, messages, temperature = 0.35 }) {
  const apiKey = config.GEMINI_API_KEY;
  const model = config.GEMINI_MODEL || 'gemini-2.0-flash';
  if (!apiKey) {
    return { ok: false, reason: 'NO_API_KEY', text: null };
  }

  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.AI_TIMEOUT_MS || 25000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.warn({ status: res.status, errText: errText.slice(0, 300) }, '[AI] Gemini HTTP error');
      return { ok: false, reason: 'HTTP_ERROR', text: null };
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') ||
      null;
    if (!text) return { ok: false, reason: 'EMPTY', text: null };
    return {
      ok: true,
      text,
      usage: data?.usageMetadata || null,
      model,
    };
  } catch (err) {
    logger.warn({ err: err.message }, '[AI] Gemini request failed');
    return { ok: false, reason: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', text: null };
  } finally {
    clearTimeout(timer);
  }
}

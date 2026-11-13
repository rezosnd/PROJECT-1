import { aiRepository } from './ai.repository.js';
import { aiTools } from './ai.tools.js';
import { analyzeEmergency, SYSTEM_PROMPT } from './ai.safety.js';
import { geminiGenerate } from './gemini.provider.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { pool } from '../../infra/db.js';

function mapSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    title: row.title,
    severity: row.severity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    severity: row.severity,
    sources: row.sources,
    hospitals: row.hospitals,
    meta: row.meta,
    createdAt: row.created_at,
  };
}

function wantsHospitalSearch(text) {
  return /\b(hospital|icu|bed|nearby|near me|emergency|find|recommend|where|hospitals|एम्बुलेंस|अस्पताल|हॉस्पिटल)\b/i.test(
    text
  );
}

function wantsEquipment(text) {
  return /\b(equipment|ventilator|ct|mri|dialysis|machine|facility|facilities)\b/i.test(text);
}

function wantsBlood(text) {
  return /\b(blood\s*bank|blood\s*group|transfusion|platelet|plasma|o\+|a\+|b\+|ab\+)\b/i.test(text);
}

function buildFallbackReply({ language, safety, knowledge, hospitals, equipmentNote }) {
  const hi = language === 'hi';
  const lines = [];

  if (safety.severity === 'CRITICAL') {
    lines.push(
      hi
        ? 'यह एक संभावित आपातकाल हो सकता है। तुरंत 112 पर कॉल करें या नज़दीकी इमरजेंसी में जाएँ।'
        : 'This may be a medical emergency. Call 112 now or go to the nearest emergency department.'
    );
  } else if (safety.severity === 'URGENT') {
    lines.push(
      hi
        ? 'कृपया जल्द चिकित्सा सलाह लें। लक्षण बिगड़ने पर 112 कॉल करें।'
        : 'Please seek prompt medical care. Call 112 if symptoms worsen.'
    );
  } else if (knowledge?.articles?.length) {
    const top = knowledge.articles[0];
    const snippet = String(top.excerpt || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    lines.push(
      hi
        ? `${top.title} से जुड़ी सामान्य जानकारी: ${snippet}${snippet.length >= 160 ? '…' : ''} यह निदान नहीं है।`
        : `Here’s general guidance on ${top.title.toLowerCase()}: ${snippet}${snippet.length >= 160 ? '…' : ''} This is education, not a diagnosis.`
    );
  } else {
    lines.push(
      hi
        ? 'मैं सामान्य स्वास्थ्य जानकारी और सत्यापित अस्पताल खोज में मदद करता हूँ। यह निदान नहीं है।'
        : 'I can share general health information and help find verified hospitals. I do not diagnose.'
    );
  }

  if (hospitals?.length) {
    lines.push(
      hi
        ? `नीचे ${Math.min(hospitals.length, 5)} नज़दीकी सत्यापित अस्पताल हैं — लाइव बेड होल्ड से पहले ऐप में देखें।`
        : `I found ${Math.min(hospitals.length, 5)} nearby verified hospitals below — confirm live beds in the app before holding.`
    );
  } else if (knowledge?.articles?.length) {
    lines.push(
      hi
        ? 'विश्वसनीय मार्गदर्शन कार्ड नीचे देखें।'
        : 'See trusted guidance cards below for more detail.'
    );
  }

  if (equipmentNote) {
    lines.push(String(equipmentNote).replace(/\*\*/g, ''));
  }

  return lines.filter(Boolean).join('\n\n');
}

export const aiService = {
  async createSession(userId, { language = 'en', title } = {}) {
    const row = await aiRepository.createSession(pool, {
      userId,
      language,
      title: title || (language === 'hi' ? 'नई बातचीत' : 'New chat'),
    });
    return mapSession(row);
  },

  async listSessions(userId) {
    const rows = await aiRepository.listSessions(pool, userId);
    return rows.map(mapSession);
  },

  async getMessages(sessionId, userId) {
    const session = await aiRepository.getSession(pool, sessionId, userId);
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    const rows = await aiRepository.listMessages(pool, sessionId);
    return { session: mapSession(session), messages: rows.map(mapMessage) };
  },

  async analyzeOnly(text) {
    return analyzeEmergency(text);
  },

  async recommendHospitals({ q, lat, lng, radiusKm, severity, patientId }) {
    return aiTools.searchNearbyHospitals({
      q,
      lat,
      lng,
      radiusKm,
      severity,
      patientId,
      limit: 10,
    });
  },

  async createEmergency({ userId, sessionId, text, lat, lng }) {
    const safety = analyzeEmergency(text);
    let hospitals = [];
    if (lat != null && lng != null) {
      const rec = await aiTools.searchNearbyHospitals({
        lat,
        lng,
        q: safety.conditionQuery || 'Trauma',
        severity: 'CRITICAL',
        limit: 8,
        patientId: userId,
      });
      hospitals = rec.matches || [];
    }
    const row = await aiRepository.createEmergency(pool, {
      userId,
      sessionId,
      severity: safety.severity === 'CRITICAL' ? 'CRITICAL' : 'URGENT',
      triggerText: text,
      latitude: lat,
      longitude: lng,
      recommendedHospitals: hospitals,
      meta: { safety },
    });
    return {
      id: row.id,
      severity: row.severity,
      emergencyNumber: '112',
      advice: safety.advice,
      hospitals,
      status: row.status,
      createdAt: row.created_at,
    };
  },

  async getEmergency(id, userId) {
    const row = await aiRepository.getEmergency(pool, id, userId);
    if (!row) throw new AppError('Emergency event not found', 404, 'NOT_FOUND');
    return {
      id: row.id,
      severity: row.severity,
      status: row.status,
      hospitals: row.recommended_hospitals || [],
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
    };
  },

  async chat({
    userId,
    sessionId,
    message,
    language = 'en',
    lat = null,
    lng = null,
  }) {
    const text = String(message || '').trim();
    if (!text) throw new AppError('Message required', 400, 'EMPTY_MESSAGE');

    let session;
    if (sessionId) {
      session = await aiRepository.getSession(pool, sessionId, userId);
      if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    } else {
      session = await aiRepository.createSession(pool, {
        userId,
        language,
        title: text.slice(0, 80),
      });
    }

    const safety = analyzeEmergency(text);
    await aiRepository.addMessage(pool, {
      sessionId: session.id,
      role: 'user',
      content: text,
      severity: safety.severity,
    });

    // Gather grounded context via controlled tools
    const toolResults = {};
    const knowledge = await aiTools.searchMedicalKnowledge(text, { language });
    toolResults.knowledge = knowledge;

    let hospitals = [];
    const shouldSearch =
      safety.isEmergency ||
      safety.severity !== 'NORMAL' ||
      wantsHospitalSearch(text) ||
      Boolean(safety.conditionQuery);

    if (shouldSearch && lat != null && lng != null) {
      const rec = await aiTools.searchNearbyHospitals({
        lat,
        lng,
        q: safety.conditionQuery || (wantsHospitalSearch(text) ? text : 'Trauma'),
        severity: safety.severity === 'NORMAL' ? null : safety.severity,
        limit: safety.isEmergency ? 8 : 6,
        patientId: userId,
      });
      toolResults.hospitals = rec;
      hospitals = rec.matches || [];
    }

    let equipmentNote = null;
    if (wantsEquipment(text) && hospitals[0]?.hospitalId) {
      const eq = await aiTools.getHospitalEquipment(hospitals[0].hospitalId);
      toolResults.equipment = eq;
      const avail = (eq.equipment || []).filter((e) => e.status === 'AVAILABLE').slice(0, 8);
      equipmentNote =
        language === 'hi'
          ? `**${hospitals[0].name} उपकरण (सत्यापित):** ${avail.map((e) => e.name || e.type).join(', ') || 'कोई उपलब्ध सूची नहीं'}`
          : `**${hospitals[0].name} equipment (verified):** ${avail.map((e) => e.name || e.type).join(', ') || 'No AVAILABLE units listed'}`;
    }

    if (wantsBlood(text) && lat != null && lng != null) {
      const bgMatch = text.match(/\b(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)\b/i);
      toolResults.blood = await aiTools.searchBloodBanks({
        lat,
        lng,
        bloodGroup: bgMatch ? bgMatch[1].toUpperCase() : undefined,
      });
    }

    if (safety.isEmergency) {
      await aiRepository.createEmergency(pool, {
        userId,
        sessionId: session.id,
        severity: 'CRITICAL',
        triggerText: text,
        latitude: lat,
        longitude: lng,
        recommendedHospitals: hospitals,
        meta: { safety },
      });
    }

    const history = await aiRepository.listMessages(pool, session.id, { limit: 12 });
    const groundedContext = JSON.stringify(
      {
        safety,
        knowledgeArticles: knowledge.articles?.slice(0, 3),
        hospitalMatches: hospitals.slice(0, 6),
        blood: toolResults.blood?.banks?.slice?.(0, 4) || null,
        equipmentNote,
        userLocation: lat != null ? { lat, lng } : null,
        note: 'Use ONLY this verified data for hospitals/equipment/blood. Never invent.',
      },
      null,
      0
    );

    const llmMessages = [
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: `Patient message (${language}): ${text}\n\nVERIFIED_TOOL_CONTEXT:\n${groundedContext}`,
      },
    ];

    let replyText = null;
    let provider = 'fallback';
    let usage = null;

    if ((config.AI_PROVIDER || 'gemini') === 'gemini' && config.GEMINI_API_KEY) {
      const gem = await geminiGenerate({
        system: SYSTEM_PROMPT,
        messages: llmMessages,
      });
      if (gem.ok) {
        replyText = gem.text;
        provider = 'gemini';
        usage = gem.usage;
      }
    }

    if (!replyText) {
      provider = 'fallback';
      replyText = buildFallbackReply({
        language,
        safety,
        knowledge,
        hospitals,
        equipmentNote,
      });
      if (toolResults.blood?.banks?.length) {
        replyText +=
          language === 'hi'
            ? `\n\n${toolResults.blood.banks.length} ब्लड बैंक मिले — विवरण के लिए कार्ड देखें।`
            : `\n\nFound ${toolResults.blood.banks.length} blood banks — see cards for details.`;
      }
    }

    await aiRepository.touchSession(pool, session.id, {
      severity: safety.severity,
      title: session.title || text.slice(0, 80),
    });

    const assistant = await aiRepository.addMessage(pool, {
      sessionId: session.id,
      role: 'assistant',
      content: replyText,
      severity: safety.severity,
      toolResults,
      sources: knowledge.articles || [],
      hospitals,
      meta: { provider, usage },
    });

    return {
      sessionId: session.id,
      message: mapMessage(assistant),
      severity: safety.severity,
      isEmergency: safety.isEmergency,
      emergencyNumber: '112',
      emergencyAdvice: safety.advice,
      hospitals,
      sources: knowledge.articles || [],
      provider,
      disclaimer: 'Not a medical device. In an emergency call 112.',
    };
  },

  async listMedicalSources({ limit = 50 } = {}) {
    const { rows } = await pool.query(
      `SELECT id, title, category, source_name, source_url, language, verification_status
       FROM medical_knowledge
       WHERE verification_status = 'VERIFIED'
       ORDER BY category, title
       LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      language: r.language,
    }));
  },
};

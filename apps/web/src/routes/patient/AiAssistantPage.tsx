import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { aiApi, AiChatResponse, AiHospitalMatch } from '../../lib/api/ai.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import {
  Phone,
  Sparkles,
  Send,
  MapPin,
  BedDouble,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const SUGGESTIONS = [
  'What should I do for a fever?',
  'Find nearby hospitals with ICU',
  'My mother has breathing difficulty',
  'Which hospital has a CT scan?',
  'Where can I find O+ blood?',
];

const BBSR = { lat: 20.2961, lng: 85.8245 };

type Bubble = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hospitals?: AiHospitalMatch[];
  severity?: string;
  sources?: AiChatResponse['sources'];
  disclaimer?: string;
};

/** Strip blocks the UI already renders as cards (legacy / LLM dumps). */
function cleanAssistantText(raw: string, hasHospitals: boolean, hasSources: boolean) {
  let text = String(raw || '');
  if (hasSources) {
    text = text.replace(
      /\n?\*{0,2}(?:Trusted guidance|विश्वसनीय जानकारी)\*{0,2}:?\s*[\s\S]*?(?=\n\*{0,2}(?:Nearby|Blood|नज़दीकी|ब्लड)|$)/i,
      ''
    );
  }
  if (hasHospitals) {
    text = text.replace(
      /\n?\*{0,2}(?:Nearby suitable hospitals[^\n]*|नज़दीकी उपयुक्त अस्पताल[^\n]*)\*{0,2}:?\s*[\s\S]*?(?=\n\*{0,2}(?:Blood|Trusted|Not a|_यह|Sources)|$)/i,
      ''
    );
    text = text.replace(/\n?_?Availability changes[\s\S]*?_?\s*(?=\n|$)/gi, '');
    text = text.replace(/\n?_?उपलब्धता बदल[\s\S]*?_?\s*(?=\n|$)/gi, '');
  }
  text = text.replace(/\n?_?(?:Not a medical device|यह चिकित्सा उपकरण)[\s\S]*$/i, '');
  text = text.replace(/\n?Sources:\s*[^\n]+$/i, '');
  // Drop leftover bare hospital lines that mirror cards
  if (hasHospitals) {
    text = text
      .split('\n')
      .filter((line) => {
        const t = line.trim();
        if (!t) return true;
        if (/^[•\-*]\s*\*{0,2}.+\*{0,2}\s*[—–-]\s*[\d.]+?\s*km/i.test(t)) return false;
        if (/^\d+(\.\d+)?\s*km$/i.test(t)) return false;
        if (/^\d+\s+free\s+/i.test(t)) return false;
        if (/^\+?\d[\d\s\-()]{7,}$/.test(t)) return false;
        return true;
      })
      .join('\n');
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={i} className="text-muted not-italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const AiAssistantPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState(BBSR);
  const [messages, setMessages] = useState<Bubble[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I am CityHealth AI. I can explain general health topics and find verified nearby hospitals, beds, equipment, and blood banks. I do not diagnose. In an emergency call 112.',
    },
  ]);
  const [lastEmergency, setLastEmergency] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setError(null);
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: msg }]);
    try {
      const data = await aiApi.chat({
        message: msg,
        sessionId,
        language,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      setSessionId(data.sessionId);
      setLastEmergency(Boolean(data.isEmergency));
      setMessages((m) => [
        ...m,
        {
          id: data.message.id || `a-${Date.now()}`,
          role: 'assistant',
          content: data.message.content,
          hospitals: data.hospitals,
          severity: data.severity,
          sources: data.sources,
          disclaimer: data.disclaimer,
        },
      ]);
    } catch (e: any) {
      setError(e.response?.data?.error?.message || e.message || 'Could not reach CityHealth AI');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 space-y-4">
      <header className="rounded-[28px] bg-[#0B3D1A] text-white p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(600px 280px at 90% -10%, rgba(185,248,75,0.35), transparent 55%), radial-gradient(420px 240px at 0% 100%, rgba(185,248,75,0.12), transparent 50%)',
          }}
        />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#B9F84B]">
              <Sparkles className="w-4 h-4" /> CityHealth AI
            </div>
            <h1 className="mt-2 text-3xl font-display font-extrabold tracking-tight">
              Ask. Find care. Stay safe.
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Grounded in live hospital, bed, equipment, and blood-bank data. Not a medical device.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['en', 'hi'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  language === l ? 'bg-[#B9F84B] text-[#0B3D1A]' : 'bg-white/10 text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {lastEmergency && (
        <div className="rounded-[22px] border border-red-200 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Possible emergency</p>
              <p className="text-sm text-red-700">Call 112 now. Do not wait for the assistant.</p>
            </div>
          </div>
          <a
            href="tel:112"
            className="inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-4 py-2 text-sm font-bold"
          >
            <Phone className="w-4 h-4" /> Call 112
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-full border border-[#D8E0D4] bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#0B3D1A]"
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold inline-flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Dismiss
          </button>
        </div>
      )}

      <div className="rounded-[24px] border border-[#D8E0D4] bg-white/80 backdrop-blur-sm min-h-[420px] flex flex-col shadow-[0_12px_40px_rgba(11,61,26,0.04)]">
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 max-h-[58vh]">
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[88%] md:max-w-[72%] rounded-2xl rounded-br-md bg-[#0B3D1A] text-[#B9F84B] px-4 py-3 text-sm leading-relaxed">
                  {m.content}
                </div>
              </div>
            ) : (
              <AssistantBubble key={m.id} m={m} />
            )
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D1A] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D1A] animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D1A] animate-pulse [animation-delay:300ms]" />
              </span>
              CityHealth AI is thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-[#E8EEE6] p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            className="flex-1 rounded-2xl border border-[#D8E0D4] px-4 py-3 text-sm outline-none focus:border-[#0B3D1A] bg-white"
            placeholder={isAuthenticated ? 'Ask about symptoms, hospitals, beds, blood…' : 'Sign in to chat'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-2xl bg-[#B9F84B] text-[#0B3D1A] px-4 font-bold disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

function AssistantBubble({ m }: { m: Bubble }) {
  const hospitals = m.hospitals?.slice(0, 5) || [];
  const sources = m.sources?.slice(0, 3) || [];
  const body = cleanAssistantText(m.content, hospitals.length > 0, sources.length > 0);
  const severity = m.severity && m.severity !== 'NORMAL' ? m.severity : null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[96%] md:max-w-[86%] w-full space-y-3">
        <div className="rounded-2xl rounded-bl-md border border-[#E3EBE0] bg-gradient-to-b from-[#F7FAF5] to-[#EEF4EC] px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#0B3D1A]">
              <Sparkles className="w-3.5 h-3.5 text-[#B9F84B]" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B3D1A]">
              CityHealth AI
            </span>
            {severity && (
              <span
                className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  severity === 'CRITICAL'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {severity}
              </span>
            )}
          </div>

          {body && (
            <div className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">
              {body.split('\n\n').map((para, i) => (
                <p key={i} className={i > 0 ? 'mt-2.5' : undefined}>
                  {renderInlineMarkdown(para)}
                </p>
              ))}
            </div>
          )}
        </div>

        {sources.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <BookOpen className="w-3.5 h-3.5 text-[#0B3D1A]" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#0B3D1A]">Trusted guidance</span>
            </div>
            {sources.map((s, idx) => (
              <div
                key={`${s.title}-${idx}`}
                className="rounded-2xl border border-[#D8E0D4] bg-white p-3.5 hover:border-[#0B3D1A]/40 transition"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#E8F6C8] text-[#0B3D1A]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink leading-snug">{s.title}</p>
                    {s.excerpt && (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted line-clamp-3">
                        {s.excerpt.replace(/\s+/g, ' ').trim()}
                      </p>
                    )}
                    {s.sourceName && (
                      <p className="mt-2 text-[10px] font-semibold text-[#0B3D1A]/70">
                        Source · {s.sourceName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hospitals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0B3D1A]" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#0B3D1A]">
                  Nearby hospitals
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium">Confirm live beds</span>
            </div>
            {hospitals.map((h) => (
              <HospitalMini key={h.hospitalId} h={h} />
            ))}
          </div>
        )}

        {(m.disclaimer || sources.length > 0 || hospitals.length > 0) && (
          <p className="px-1 text-[10px] text-muted leading-relaxed">
            {m.disclaimer || 'Not a medical device. For serious symptoms, seek professional care immediately.'}
            {sources.length > 0 && (
              <>
                {' '}
                · {sources.map((s) => s.sourceName || s.title).filter(Boolean).join(' · ')}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function HospitalMini({ h }: { h: AiHospitalMatch }) {
  return (
    <div className="rounded-2xl border border-[#D8E0D4] bg-white overflow-hidden hover:border-[#0B3D1A] transition group">
      <div className="p-3.5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/hospitals/${h.hospitalId}`}
            className="font-bold text-ink text-sm leading-snug group-hover:text-[#0B3D1A] inline-flex items-center gap-1"
          >
            {h.name}
            <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
          </Link>
          <div className="mt-2 flex flex-wrap gap-2">
            {h.distanceKm != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F7F0] px-2.5 py-1 text-[11px] font-semibold text-ink">
                <MapPin className="w-3 h-3 text-[#0B3D1A]" /> {Number(h.distanceKm).toFixed(2)} km
              </span>
            )}
            {h.freeBedsNow != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F6C8] px-2.5 py-1 text-[11px] font-bold text-[#0B3D1A]">
                <BedDouble className="w-3 h-3" /> {h.freeBedsNow} free {h.allocatedWard || 'beds'}
              </span>
            )}
          </div>
        </div>
        {h.phone && (
          <a
            href={`tel:${h.phone}`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#0B3D1A] text-[#B9F84B] px-3 py-2 text-[11px] font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3" /> Call
          </a>
        )}
      </div>
    </div>
  );
}

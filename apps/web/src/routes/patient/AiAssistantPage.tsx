import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { aiApi, AiChatResponse, AiHospitalMatch } from '../../lib/api/ai.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Phone, Sparkles, Send, MapPin, BedDouble, AlertTriangle, RefreshCw } from 'lucide-react';

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
};

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
        'Hi — I am **CityHealth AI**. I can explain general health topics and find verified nearby hospitals, beds, equipment, and blood banks. I do not diagnose. In an emergency call **112**.',
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

      <div className="rounded-[24px] border border-[#D8E0D4] bg-white min-h-[420px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 max-h-[58vh]">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#0B3D1A] text-[#B9F84B]'
                    : 'bg-[#F4F7F2] text-ink border border-[#E8EEE6]'
                }`}
              >
                {m.content}
                {m.hospitals && m.hospitals.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.hospitals.slice(0, 5).map((h) => (
                      <HospitalMini key={h.hospitalId} h={h} />
                    ))}
                  </div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <p className="mt-3 text-[10px] text-muted">
                    Sources: {m.sources.map((s) => s.sourceName || s.title).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-xs font-semibold text-muted animate-pulse">CityHealth AI is thinking…</div>
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
            className="flex-1 rounded-2xl border border-[#D8E0D4] px-4 py-3 text-sm outline-none focus:border-[#0B3D1A]"
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

function HospitalMini({ h }: { h: AiHospitalMatch }) {
  return (
    <Link
      to={`/hospitals/${h.hospitalId}`}
      className="block rounded-xl bg-white border border-[#D8E0D4] p-3 hover:border-[#0B3D1A] transition"
    >
      <div className="font-bold text-ink text-sm">{h.name}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        {h.distanceKm != null && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {h.distanceKm} km
          </span>
        )}
        {h.freeBedsNow != null && (
          <span className="inline-flex items-center gap-1">
            <BedDouble className="w-3 h-3" /> {h.freeBedsNow} free {h.allocatedWard || ''}
          </span>
        )}
        {h.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3 h-3" /> {h.phone}
          </span>
        )}
      </div>
    </Link>
  );
}

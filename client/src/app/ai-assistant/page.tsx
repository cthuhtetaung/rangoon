'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

type ChatApiResponse = {
  answer: string;
  source: 'openai' | 'local';
  intent: string;
  insights: {
    periodLabel: 'today' | 'week' | 'month';
    todayRevenue: number;
    todayExpense: number;
    netToday: number;
    paidOrderCount: number;
    lowStockProducts: Array<{ id: string; name: string; stockQuantity: number }>;
    topSellingProducts: Array<{ productId: string; productName: string; quantity: number }>;
  };
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function mmk(value: number): string {
  return `${Number(value || 0).toLocaleString()} MMK`;
}

export default function AiAssistantPage() {
  const [question, setQuestion] = useState('ဒီနေ့ ဘယ်လောက်ရောင်းရလဲ?');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<ChatApiResponse | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const periodRef = useRef<'today' | 'week' | 'month'>('today');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickQuestions = useMemo(
    () => [
      'ဒီနေ့ ဘယ်လောက်ရောင်းရလဲ?',
      'ဘာပစ္စည်းတွေ stock နည်းနေပြီလဲ?',
      'ဒီနေ့ ရောင်းကောင်းဆုံးပစ္စည်း 5 မျိုးပြပါ',
      'ဒီနေ့ အသုံးစရိတ် ဘယ်လောက်ရှိလဲ?',
      'ဒီနေ့ business summary တစ်ခုပြောပြပါ',
    ],
    [],
  );

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    const W = window as any;
    const SpeechRecognition = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    setSpeechSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'my-MM';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = String(event?.results?.[0]?.[0]?.transcript || '').trim();
      if (!text) return;
      setQuestion(text);
      void sendQuestion(text, periodRef.current);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError('Voice input failed. Please type your question.');
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const sendQuestion = async (inputText: string, selectedPeriod: 'today' | 'week' | 'month' = period) => {
    const text = inputText.trim();
    if (!text) return;

    setLoading(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`${API_URL}/ai-assistant/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: text, period: selectedPeriod }),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = (await res.json()) as ChatApiResponse;
      setLatest(data);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      setQuestion('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Chatbot request failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendQuestion(question);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current || loading) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    setError('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  return (
    <ProtectedRoute>
      <main className="cm-shell py-8 md:py-10">
        <div className="mb-6">
          <span className="cm-kicker">Owner assistant</span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">AI Business Chatbot</h1>
          <p className="mt-2 text-sm text-slate-600">
            Daily sales, low stock, top-selling products, and expense analysis ကို chat နဲ့မေးနိုင်ပါတယ်။
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['today', 'week', 'month'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase ${
                  period === value ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-600'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <article className="cm-panel flex h-[72vh] flex-col p-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuestion(q);
                      void sendQuestion(q);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white/70 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-600">No conversation yet.</p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' ? 'bg-slate-100 text-slate-800' : 'border border-teal-200 bg-teal-50 text-slate-800'
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{msg.role}</p>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-3 space-y-3 border-t border-slate-200 pt-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="ဥပမာ - ဒီနေ့ ဘယ်လောက်ရောင်းရလဲ"
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="cm-btn-primary" disabled={loading || !question.trim()}>
                  {loading ? 'Analyzing...' : 'Ask AI'}
                </button>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={loading}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isListening ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {isListening ? 'Stop Mic' : 'Use Mic'}
                  </button>
                )}
              </div>
            </form>
          </article>

          <aside className="cm-panel p-5">
            <h2 className="text-lg font-semibold text-slate-900">Today Snapshot</h2>
            {!latest ? (
              <p className="mt-3 text-sm text-slate-600">Chatbot answer တစ်ခုပေးပြီးမှ data snapshot ပြပါမယ်။</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Period: <span className="font-semibold text-slate-900">{latest.insights.periodLabel}</span></p>
                <p>Revenue: <span className="font-semibold text-slate-900">{mmk(latest.insights.todayRevenue)}</span></p>
                <p>Expense: <span className="font-semibold text-slate-900">{mmk(latest.insights.todayExpense)}</span></p>
                <p>Net: <span className="font-semibold text-slate-900">{mmk(latest.insights.netToday)}</span></p>
                <p>Paid Orders: <span className="font-semibold text-slate-900">{latest.insights.paidOrderCount}</span></p>
                <p>Low Stock Count: <span className="font-semibold text-slate-900">{latest.insights.lowStockProducts.length}</span></p>
                <p>Source: <span className="font-semibold text-slate-900">{latest.source}</span></p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </ProtectedRoute>
  );
}

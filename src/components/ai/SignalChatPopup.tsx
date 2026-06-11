'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '@/lib/dashboard-context';
import { useTradingType } from '@/lib/hooks/useTradingType';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function SignalChatPopup() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const d = useDashboard();
  const { tradingType } = useTradingType();
  const activeSignal = d.displaySignal ?? d.liveSignals[0] ?? null;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            signal: activeSignal,
            liveDims: d.liveDims ?? null,
            sourceFlags: d.signalsData?.sources,
            tradingType,
            livePrice: activeSignal?.price ?? null,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessages([
          ...newMessages,
          { role: 'assistant', content: `Error: ${err.error || 'Gagal menghubungi AI.'}` },
        ]);
        return;
      }

      const { reply } = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Network error. Coba lagi.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeSignal, d.liveDims, d.signalsData, tradingType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = activeSignal
    ? [
        `Kenapa ${activeSignal.pair} ${activeSignal.action}?`,
        'Jelasin dimension scores-nya',
        'Ada kontradiksi antar source?',
      ]
    : ['Pilih signal dulu untuk mulai chat'];

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-shadow"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        aria-label={open ? 'Close chat' : 'Open SignalFlow AI'}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-h-[520px] flex-col rounded-xl border border-border-default bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border-default px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-semibold text-txt-primary">SignalFlow AI</span>
                {activeSignal && (
                  <span className="text-[10px] text-txt-secondary bg-inset px-1.5 py-0.5 rounded">
                    {activeSignal.pair}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-txt-secondary">Konsultan signal</span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[340px]">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-txt-secondary">
                    Tanya apa aja soal signal yang aktif. AI akan jawab berdasarkan data real-time.
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="block w-full text-left text-xs text-accent/80 hover:text-accent bg-inset/50 hover:bg-inset rounded-lg px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent/15 text-txt-primary'
                        : 'bg-inset text-txt-secondary'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-inset rounded-lg px-3 py-2 text-xs text-txt-secondary">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border-default p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeSignal ? `Tanya tentang ${activeSignal.pair}...` : 'Pilih signal dulu...'}
                  disabled={!activeSignal || loading}
                  className="flex-1 bg-inset border border-border-default rounded-lg px-3 py-2 text-xs text-txt-primary placeholder:text-txt-secondary/50 focus:outline-none focus:border-accent/50 disabled:opacity-40"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || !activeSignal}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-30 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

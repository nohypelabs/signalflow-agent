'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '@/lib/dashboard-context';
import { useTradingType } from '@/lib/hooks/useTradingType';
import { usePathname } from 'next/navigation';
import { PAGE_TOURS } from '@/lib/tours';
import TypewriterText from './TypewriterText';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_QUESTIONS = 15;
const STORAGE_KEY_PREFIX = 'sf-chat-';
const COUNTER_KEY_PREFIX = 'sf-chat-count-';
const HINT_DISMISSED_KEY = 'sf-chat-hint-dismissed';

function getStorageKey(address: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}${address ?? 'anonymous'}`;
}

function getCounterKey(address: string | undefined): string {
  return `${COUNTER_KEY_PREFIX}${address ?? 'anonymous'}`;
}

function loadMessages(address: string | undefined): Message[] {
  if (typeof window === 'undefined' || !address) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(address: string | undefined, messages: Message[]): void {
  if (!address) return;
  try {
    localStorage.setItem(getStorageKey(address), JSON.stringify(messages));
  } catch {}
}

function loadQuestionCount(address: string | undefined): number {
  if (typeof window === 'undefined' || !address) return 0;
  try {
    const raw = localStorage.getItem(getCounterKey(address));
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function incrementQuestionCount(address: string | undefined): number {
  if (!address) return 0;
  const next = loadQuestionCount(address) + 1;
  try {
    localStorage.setItem(getCounterKey(address), String(next));
  } catch {}
  return next;
}

export default function SignalChatPopup() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hovering, setHovering] = useState(false);
  const pathname = usePathname();
  const [typingIndex, setTypingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const d = useDashboard();
  const { tradingType } = useTradingType();
  const activeSignal = d.displaySignal ?? d.liveSignals[0] ?? null;
  const walletAddress = d.isConnected ? d.address : undefined;

  // Hydrate from localStorage on mount / wallet change
  useEffect(() => {
    setMessages(loadMessages(walletAddress));
    setQuestionCount(loadQuestionCount(walletAddress));
    setHydrated(true);
  }, [walletAddress]);

  // Auto-show hint popup after 3s if never dismissed (one-time draw attention)
  useEffect(() => {
    if (open) { setShowHint(false); return; }
    try {
      if (localStorage.getItem(HINT_DISMISSED_KEY)) return;
    } catch {}
    const timer = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(timer);
  }, [open]);

  // Auto-hide hint after 8s if not interacted
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(timer);
  }, [showHint]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try { localStorage.setItem(HINT_DISMISSED_KEY, '1'); } catch {}
  }, []);

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

  const questionsRemaining = MAX_QUESTIONS - questionCount;
  const isLimitReached = questionCount >= MAX_QUESTIONS;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !walletAddress || isLimitReached) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveMessages(walletAddress, newMessages);
    setInput('');
    setLoading(true);

    // Increment counter
    const newCount = incrementQuestionCount(walletAddress);
    setQuestionCount(newCount);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-6), // last 3 exchanges only
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
        const errMsg: Message = { role: 'assistant', content: `Error: ${err.error || 'Failed to reach AI.'}` };
        const updated = [...newMessages, errMsg];
        setMessages(updated);
        saveMessages(walletAddress, updated);
        return;
      }

      const { reply } = await res.json();
      const assistantMsg: Message = { role: 'assistant', content: reply };
      const updated = [...newMessages, assistantMsg];
      setTypingIndex(updated.length - 1); // trigger typewriter for this message
      setMessages(updated);
      saveMessages(walletAddress, updated);
    } catch {
      const errMsg: Message = { role: 'assistant', content: 'Network error. Please try again.' };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      saveMessages(walletAddress, updated);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeSignal, d.liveDims, d.signalsData, tradingType, walletAddress, isLimitReached]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (!walletAddress) return;
    setMessages([]);
    saveMessages(walletAddress, []);
  };

  const suggestions = activeSignal
    ? [
        `Why is ${activeSignal.pair} ${activeSignal.action}?`,
        'Explain the confluence factors',
        'What is Confluence V3?',
        'Any contradictions between sources?',
      ]
    : ['Select a signal to start chatting'];

  // Not connected state
  const showWalletRequired = !walletAddress;

  return (
    <>
      {/* Auto-show hint popup (first visit) */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
            className="ticker-selector-glass fixed bottom-[88px] right-5 z-50 w-[270px] overflow-hidden"
          >
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="ticker-selector-glass-soft flex h-7 w-7 items-center justify-center text-accent">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-txt-primary">Ask Dora AI</span>
                </div>
                <button
                  onClick={dismissHint}
                className="ticker-selector-glass-soft flex h-7 w-7 items-center justify-center text-txt-faint transition-colors hover:text-txt-secondary"
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-txt-secondary">
                Ask Dora about the current signal, confluence, or source contradictions.
              </p>
              <button
                onClick={() => { dismissHint(); setOpen(true); }}
                className="ticker-selector-glass-soft mt-2 w-full cursor-pointer py-1.5 text-center text-[11px] font-medium text-accent transition-colors hover:border-accent/30"
              >
                Open chat
              </button>
            </div>
            {/* Arrow pointing to button */}
            <div className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-r border-b border-white/10 bg-[#2e3440]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Dora AI Button */}
      <div
        data-tour="ai-assistant"
        className="fixed bottom-6 right-6 z-50"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Hover tooltip for main button */}
        <AnimatePresence>
          {hovering && !open && !showHint && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="ticker-selector-glass-soft absolute -top-10 right-0 whitespace-nowrap px-2.5 py-1 text-[11px] text-txt-primary shadow-lg"
            >
              Ask Dora AI
              <div className="absolute -bottom-1 right-5 h-2 w-2 rotate-45 border-r border-b border-white/10 bg-[#2e3440]" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => { setOpen(!open); dismissHint(); }}
          className="ticker-selector-glass relative flex h-12 w-12 items-center justify-center text-accent shadow-lg shadow-black/20 transition-shadow hover:border-accent/35 cursor-pointer"
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          aria-label={open ? 'Close chat' : 'Ask Dora AI'}
        >
          {/* Pulse ring animation */}
          {!open && (
            <span className="absolute inset-1 rounded-full bg-accent/15 animate-ping" style={{ animationDuration: '2s' }} />
          )}
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
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="ticker-selector-glass fixed bottom-24 right-5 z-50 flex max-h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/8 bg-white/[0.04] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-semibold text-txt-primary">Dora</span>
                <span className="ticker-selector-glass-soft px-2 py-0.5 text-[9px] text-accent/80">SignalFlow AI</span>
                {activeSignal && (
                  <span className="ticker-selector-glass-soft px-2 py-0.5 text-[10px] text-txt-secondary">
                    {activeSignal.pair}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {walletAddress && messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="ticker-selector-glass-soft px-2 py-1 text-[9px] text-txt-faint transition-colors hover:text-txt-secondary"
                    title="Clear chat history"
                  >
                    Clear
                  </button>
                )}
                <span className="text-[10px] text-txt-secondary">
                  {walletAddress ? `${questionsRemaining} left` : ''}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {/* Wallet not connected */}
              {showWalletRequired && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="ticker-selector-glass-soft flex h-11 w-11 items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-dim">
                      <rect x="2" y="6" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                      <circle cx="16" cy="14" r="1.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-txt-muted font-medium">Coming Soon</p>
                    <p className="text-xs text-txt-dim mt-1">Dora chat access is being prepared for this dashboard.</p>
                  </div>
                </div>
              )}

              {/* Welcome + suggestions */}
              {!showWalletRequired && messages.length === 0 && hydrated && (
                <div className="space-y-3">
                  <p className="text-xs text-txt-secondary">
                    Hi! I&apos;m Dora, your SignalFlow consultant. Ask me anything about active signals, the engine, or how our system works.
                  </p>
                  <button
                    onClick={() => {
                      setOpen(false);
                      const tourConfig = PAGE_TOURS[pathname];
                      window.dispatchEvent(new Event(tourConfig?.eventName ?? "start-signalflow-tour"));
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-all text-xs text-accent font-semibold cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px]">💡</span> Start Product Tour
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="ticker-selector-glass-soft block w-full px-3 py-2 text-left text-xs text-accent/80 transition-colors hover:border-accent/30 hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Limit reached notice */}
              {isLimitReached && !showWalletRequired && (
                <div className="rounded-[24px] border border-hold/20 bg-hold/10 px-3 py-2 text-xs text-hold">
                  Question limit reached ({MAX_QUESTIONS}/{MAX_QUESTIONS}). Chat history is preserved.
                </div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-[24px] px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'border border-accent/20 bg-accent/15 text-txt-primary'
                        : 'ticker-selector-glass-soft text-txt-secondary'
                    }`}
                  >
                    {msg.role === 'assistant' && i === typingIndex ? (
                      <TypewriterText
                        text={msg.content}
                        speed={40}
                        onComplete={() => setTypingIndex(null)}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="ticker-selector-glass-soft px-3 py-2 text-xs text-txt-secondary">
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
            <div className="border-t border-white/8 bg-white/[0.025] p-3">
              {!showWalletRequired && (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isLimitReached
                        ? 'Question limit reached'
                        : activeSignal
                        ? `Ask about ${activeSignal.pair}...`
                        : 'Select a signal first...'
                    }
                    disabled={!activeSignal || loading || isLimitReached}
                    className="min-w-0 flex-1 rounded-[35px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-txt-primary placeholder:text-txt-secondary/50 outline-none transition-colors focus:border-accent/50 disabled:opacity-40"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading || !activeSignal || isLimitReached}
                    className="ticker-selector-glass-soft flex h-9 w-9 shrink-0 items-center justify-center text-accent transition-colors hover:border-accent/35 disabled:opacity-30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              )}
              {showWalletRequired && (
                <p className="text-center text-[10px] text-txt-faint">Coming Soon</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

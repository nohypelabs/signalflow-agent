'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '@/lib/dashboard-context';
import { useTradingType } from '@/lib/hooks/useTradingType';
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
            className="fixed bottom-[88px] right-6 z-50 w-[260px] rounded-xl border border-accent/30 bg-card shadow-xl shadow-accent/10 overflow-hidden"
          >
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-accent/15 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-txt-primary">Ask Dora AI</span>
                </div>
                <button
                  onClick={dismissHint}
                  className="text-txt-faint hover:text-txt-secondary transition-colors p-0.5"
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-txt-secondary mt-2 leading-relaxed">
                Get instant signal analysis from our AI consultant. Ask about any active signal, the engine, or trading strategy.
              </p>
              <button
                onClick={() => { dismissHint(); setOpen(true); }}
                className="mt-2 w-full text-center text-[11px] font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-lg py-1.5 transition-colors"
              >
                Try it now
              </button>
            </div>
            {/* Arrow pointing to button */}
            <div className="absolute -bottom-1.5 right-8 w-3 h-3 rotate-45 border-r border-b border-accent/30 bg-card" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button with hover tooltip */}
      <div
        className="fixed bottom-6 right-6 z-50"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Hover tooltip */}
        <AnimatePresence>
          {hovering && !open && !showHint && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-10 right-0 whitespace-nowrap rounded-lg bg-elevated border border-border-default px-2.5 py-1 text-[11px] text-txt-primary shadow-lg"
            >
              Ask Dora AI
              <div className="absolute -bottom-1 right-5 w-2 h-2 rotate-45 bg-elevated border-r border-b border-border-default" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => { setOpen(!open); dismissHint(); }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-shadow"
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          aria-label={open ? 'Close chat' : 'Ask Dora AI'}
        >
          {/* Pulse ring animation */}
          {!open && (
            <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping" style={{ animationDuration: '2s' }} />
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
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-h-[520px] flex-col rounded-xl border border-border-default bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border-default px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-semibold text-txt-primary">Dora</span>
                <span className="text-[9px] text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded">SignalFlow AI</span>
                {activeSignal && (
                  <span className="text-[10px] text-txt-secondary bg-inset px-1.5 py-0.5 rounded">
                    {activeSignal.pair}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {walletAddress && messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="text-[9px] text-txt-faint hover:text-txt-secondary transition-colors"
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[340px]">
              {/* Wallet not connected */}
              {showWalletRequired && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-inset border border-border-default flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-dim">
                      <rect x="2" y="6" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                      <circle cx="16" cy="14" r="1.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-txt-muted font-medium">Connect Wallet</p>
                    <p className="text-xs text-txt-dim mt-1">Connect your wallet to chat with Dora.</p>
                  </div>
                </div>
              )}

              {/* Welcome + suggestions */}
              {!showWalletRequired && messages.length === 0 && hydrated && (
                <div className="space-y-3">
                  <p className="text-xs text-txt-secondary">
                    Hi! I'm Dora, your SignalFlow consultant. Ask me anything about active signals, the engine, or how our system works.
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

              {/* Limit reached notice */}
              {isLimitReached && !showWalletRequired && (
                <div className="rounded-lg bg-hold/10 border border-hold/20 px-3 py-2 text-xs text-hold">
                  Question limit reached ({MAX_QUESTIONS}/{MAX_QUESTIONS}). Chat history is preserved.
                </div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent/15 text-txt-primary'
                        : 'bg-inset text-txt-secondary'
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
                    className="flex-1 bg-inset border border-border-default rounded-lg px-3 py-2 text-xs text-txt-primary placeholder:text-txt-secondary/50 focus:outline-none focus:border-accent/50 disabled:opacity-40"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading || !activeSignal || isLimitReached}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-30 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              )}
              {showWalletRequired && (
                <p className="text-center text-[10px] text-txt-faint">Wallet connection required</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

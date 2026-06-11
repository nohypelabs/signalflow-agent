'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  text: string;
  speed?: number; // characters per second (default: 40)
  onComplete?: () => void;
  className?: string;
}

/**
 * Typewriter text effect — renders text character by character at ~60fps.
 * Uses requestAnimationFrame for smooth animation.
 */
export default function TypewriterText({ text, speed = 40, onComplete, className }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset on new text
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);
    lastTimeRef.current = 0;

    const charsPerMs = speed / 1000;
    let accumulated = 0;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      accumulated += delta * charsPerMs;
      const charsToAdd = Math.floor(accumulated);

      if (charsToAdd > 0) {
        accumulated -= charsToAdd;
        indexRef.current = Math.min(indexRef.current + charsToAdd, text.length);
        setDisplayed(text.slice(0, indexRef.current));
      }

      if (indexRef.current < text.length) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDone(true);
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-accent/70 ml-[1px] align-middle animate-pulse" />}
    </span>
  );
}

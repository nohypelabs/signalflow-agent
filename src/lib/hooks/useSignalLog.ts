"use client";

import { useEffect, useRef, useState } from "react";

export type LogType = "DATA" | "SIGNAL" | "RECALC" | "WARNING" | "ERROR";

export interface LogEntry {
  ts: string;
  type: LogType;
  emoji: string;
  msg: string;
  id: number;
}

export type LogFilter = "all" | "signal" | "errors";

type ConnectionStatus = "live" | "reconnecting" | "polling";

const MAX_ENTRIES = 200;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
const POLL_INTERVAL_MS = 5000;

export function useSignalLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("live");
  const [filter, setFilter] = useState<LogFilter>("signal");
  const idCounter = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function appendEntry(raw: Omit<LogEntry, "id">) {
    setEntries((prev) => {
      const next = [...prev, { ...raw, id: ++idCounter.current }];
      return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
    });
  }

  function startPolling() {
    if (pollTimer.current) clearInterval(pollTimer.current);

    pollTimer.current = setInterval(() => {
      appendEntry({
        ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type: "DATA",
        emoji: "📊",
        msg: "Pipeline heartbeat — polling mode active",
      });
    }, POLL_INTERVAL_MS);
  }

  function connectSSE() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/signal-log");
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttempts.current = 0;
      setStatus("live");
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Omit<LogEntry, "id">;
        appendEntry(data);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        setStatus("reconnecting");
        reconnectTimer.current = setTimeout(() => {
          connectSSE();
        }, RECONNECT_DELAY_MS);
      } else {
        setStatus("polling");
        startPolling();
      }
    };
  }

  useEffect(() => {
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "signal") return entry.type === "SIGNAL" || entry.type === "RECALC";
    if (filter === "errors") return entry.type === "ERROR" || entry.type === "WARNING";
    return true;
  });

  return {
    entries: filteredEntries,
    allEntries: entries,
    status,
    filter,
    setFilter,
  };
}

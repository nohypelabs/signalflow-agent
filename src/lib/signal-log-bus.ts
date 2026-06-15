type LogEventType = "DATA" | "SIGNAL" | "RECALC" | "WARNING" | "ERROR";

interface LogEvent {
  ts: string;
  type: LogEventType;
  emoji: string;
  msg: string;
}

type Listener = (event: LogEvent) => void;

class SignalLogBus {
  private listeners: Set<Listener> = new Set();
  private history: LogEvent[] = [];
  private maxHistory = 100;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Send recent history on subscribe
    for (const event of this.history) {
      listener(event);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(type: LogEventType, emoji: string, msg: string): void {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const event: LogEvent = { ts, type, emoji, msg };

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }

  getHistory(): LogEvent[] {
    return [...this.history];
  }
}

// Singleton instance
export const signalLogBus = new SignalLogBus();

// Helper functions for easy logging
export function logData(emoji: string, msg: string): void {
  signalLogBus.emit("DATA", emoji, msg);
}

export function logSignal(emoji: string, msg: string): void {
  signalLogBus.emit("SIGNAL", emoji, msg);
}

export function logRecalc(emoji: string, msg: string): void {
  signalLogBus.emit("RECALC", emoji, msg);
}

export function logWarning(emoji: string, msg: string): void {
  signalLogBus.emit("WARNING", emoji, msg);
}

export function logError(emoji: string, msg: string): void {
  signalLogBus.emit("ERROR", emoji, msg);
}

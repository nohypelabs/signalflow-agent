export type JournalMood = 'confident' | 'neutral' | 'anxious' | 'fomo' | 'revenge';

export interface JournalEntry {
  id: string;
  tradeId?: string;       // linked to PaperTrade.id (optional — standalone entries allowed)
  pair: string;
  side: 'LONG' | 'SHORT';
  entryPrice?: number;
  exitPrice?: number;
  pnl?: number;
  tags: string[];
  mood: JournalMood;
  notes: string;
  lesson?: string;
  createdAt: number;
  updatedAt: number;
}

export const MOOD_CONFIG: Record<JournalMood, { label: string; short: string; color: string; dotColor: string }> = {
  confident: { label: 'Confident', short: 'C', color: 'text-buy', dotColor: '#00ff88' },
  neutral:   { label: 'Neutral',   short: 'N', color: 'text-txt-muted', dotColor: '#475569' },
  anxious:   { label: 'Anxious',   short: 'A', color: 'text-warning', dotColor: '#ff8800' },
  fomo:      { label: 'FOMO',      short: 'F', color: 'text-error', dotColor: '#ff4444' },
  revenge:   { label: 'Revenge',   short: 'R', color: 'text-error', dotColor: '#ff4444' },
};

export const SUGGESTED_TAGS = [
  'clean-setup', 'fomo', 'revenge-trade', 'news-driven',
  'technical', 'fundamental', 'breakout', 'trend-follow',
  'mean-reversion', 'scalp', 'swing', 'earnings',
  'overtraded', 'patience', 'discipline',
];

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

export const MOOD_CONFIG: Record<JournalMood, { label: string; emoji: string; color: string }> = {
  confident: { label: 'Confident', emoji: '😎', color: 'text-buy' },
  neutral:   { label: 'Neutral',   emoji: '😐', color: 'text-txt-muted' },
  anxious:   { label: 'Anxious',   emoji: '😰', color: 'text-warning' },
  fomo:      { label: 'FOMO',      emoji: '🤯', color: 'text-error' },
  revenge:   { label: 'Revenge',   emoji: '😤', color: 'text-error' },
};

export const SUGGESTED_TAGS = [
  'clean-setup', 'fomo', 'revenge-trade', 'news-driven',
  'technical', 'fundamental', 'breakout', 'trend-follow',
  'mean-reversion', 'scalp', 'swing', 'earnings',
  'overtraded', 'patience', 'discipline',
];

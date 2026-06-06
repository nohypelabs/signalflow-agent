export type AlertType = 'price_above' | 'price_below' | 'signal_strong' | 'signal_reversal' | 'manual_signal_generated';

export interface PriceAlert {
  id: string;
  pair: string;
  type: 'price_above' | 'price_below';
  targetPrice: number;
  currentPrice: number;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface SignalAlert {
  id: string;
  pair: string;
  type: 'signal_strong' | 'signal_reversal';
  condition: string; // e.g. 'STRONG_LONG', 'STRONG_SHORT', 'any_reversal'
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface ManualSignalGeneratedAlert {
  id: string;
  pair: string;
  type: 'manual_signal_generated';
  action: string;
  confidence: number;
  strategy?: string;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

export type Alert = PriceAlert | SignalAlert | ManualSignalGeneratedAlert;

export interface AlertsState {
  alerts: Alert[];
  permission: NotificationPermission | 'default';
}

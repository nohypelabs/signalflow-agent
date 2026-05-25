export interface ModuleStatus {
  name: string;
  status: "active" | "error";
  count: number;
  detail: string;
  color: string;
}

export interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "no_key";
  detail: string;
  latencyMs: number;
}

export interface CoinPerf {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  high30d: number;
  low30d: number;
  volatility30d: number;
  klines: { t: number; c: number }[];
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

export interface AIConfig {
  providerId: string;
  apiKey: string;
  model: string;
}

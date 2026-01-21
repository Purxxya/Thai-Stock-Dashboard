
export interface HistoryItem {
  time: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  ma7?: number;
  ma21?: number;
  ema5?: number;
  isLunch?: boolean;
}

export interface Stock {
  symbol: string;
  name: string;
  fullName: string;
  sector: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  priceYearEnd: number;
  history: HistoryItem[];
  isRealTime?: boolean;
  lastUpdated?: string;
}

export interface MarketSummary {
  index: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface AIInsight {
  summary: string;
  recommendations: {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
  }[];
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

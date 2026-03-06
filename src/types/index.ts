export type Market = 'TW' | 'US';

export interface Purchase {
  _id?: string;
  shares: number;
  price: number;
  date: Date;
  note?: string;
}

export interface IStock {
  _id?: string;
  symbol: string;
  name: string;
  market: Market;
  purchases: Purchase[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockWithCalculations extends IStock {
  averagePrice: number;
  totalShares: number;
  totalCost: number;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  totalValue?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
}

export type AlertType = 'above_price' | 'below_price' | 'above_avg_percent' | 'below_avg_percent';

export interface IAlert {
  _id?: string;
  stockSymbol: string;
  stockName: string;
  market: Market;
  type: AlertType;
  targetValue: number;
  isActive: boolean;
  lastTriggered?: Date;
  notifyChannels: ('email' | 'line')[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LineRecipient {
  userId: string;
  displayName: string;
}

export interface INotificationConfig {
  _id?: string;
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    recipients: string[];
  };
  line: {
    enabled: boolean;
    channelAccessToken: string;
    channelSecret: string;
    recipients: LineRecipient[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PriceData {
  symbol: string;
  name: string;
  market: Market;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  updatedAt: Date;
}

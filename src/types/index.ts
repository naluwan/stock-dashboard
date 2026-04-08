export type Market = 'TW' | 'US';

export interface Purchase {
  _id?: string;
  shares: number;
  price: number;
  date: Date;
  note?: string;
  exchangeRate?: number; // 買入時匯率（僅美股），用於計算台幣成本
}

export interface Sale {
  _id?: string;
  shares: number;
  price: number;
  date: Date;
  note?: string;
  exchangeRate?: number; // 賣出時匯率（僅美股）
  avgCostAtSale: number; // 賣出當下的加權平均成本，鎖定不變
}

export interface IStock {
  _id?: string;
  symbol: string;
  name: string;
  market: Market;
  purchases: Purchase[];
  sales: Sale[];
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockWithCalculations extends IStock {
  averagePrice: number;
  totalShares: number;       // 持有股數 = 買入 - 賣出
  totalCost: number;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  totalValue?: number;
  totalProfit?: number;       // 未實現損益
  totalProfitPercent?: number;
  realizedPL?: number;        // 已實現損益（全部）
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
  triggerCount: number;      // 已觸發次數
  maxTriggers: number;       // 最大觸發次數，0 = 無限制
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

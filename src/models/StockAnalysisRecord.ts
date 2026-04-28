import mongoose, { Schema, Document } from 'mongoose';

interface SnapshotData {
  currentPrice?: number;
  averagePrice?: number;
  totalShares?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
  rsi?: number;
  return5d?: number;
  return20d?: number;
  return60d?: number;
}

export interface IStockAnalysisRecord {
  _id?: string;
  symbol: string;
  market: 'TW' | 'US';
  name: string;
  analysis: string;
  snapshot?: SnapshotData;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StockAnalysisRecordDocument
  extends Omit<IStockAnalysisRecord, '_id'>,
    Document {}

const SnapshotSchema = new Schema(
  {
    currentPrice: Number,
    averagePrice: Number,
    totalShares: Number,
    totalProfit: Number,
    totalProfitPercent: Number,
    rsi: Number,
    return5d: Number,
    return20d: Number,
    return60d: Number,
  },
  { _id: false },
);

const StockAnalysisRecordSchema = new Schema<StockAnalysisRecordDocument>(
  {
    symbol: { type: String, required: true, uppercase: true },
    market: { type: String, enum: ['TW', 'US'], required: true },
    name: { type: String, required: true },
    analysis: { type: String, required: true },
    snapshot: { type: SnapshotSchema },
  },
  { timestamps: true },
);

StockAnalysisRecordSchema.index({ symbol: 1, market: 1, createdAt: -1 });

export default (mongoose.models.StockAnalysisRecord as mongoose.Model<StockAnalysisRecordDocument>) ||
  mongoose.model<StockAnalysisRecordDocument>(
    'StockAnalysisRecord',
    StockAnalysisRecordSchema,
    'stock_analyses',
  );

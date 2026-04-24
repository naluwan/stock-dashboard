import mongoose, { Schema, Document } from 'mongoose';

interface HoldingSnapshot {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  totalShares: number;
  averagePrice: number;
  currentPrice?: number;
  totalCost: number;
  totalValue?: number;
  totalProfit?: number;
  totalProfitPercent?: number;
}

export interface IPortfolioAnalysis {
  _id?: string;
  title: string;
  snapshot: HoldingSnapshot[];
  analysis: string;
  usdRate?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PortfolioAnalysisDocument
  extends Omit<IPortfolioAnalysis, '_id'>,
    Document {}

const HoldingSnapshotSchema = new Schema(
  {
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    market: { type: String, enum: ['TW', 'US'], required: true },
    totalShares: { type: Number, required: true },
    averagePrice: { type: Number, required: true },
    currentPrice: { type: Number },
    totalCost: { type: Number, required: true },
    totalValue: { type: Number },
    totalProfit: { type: Number },
    totalProfitPercent: { type: Number },
  },
  { _id: false },
);

const PortfolioAnalysisSchema = new Schema<PortfolioAnalysisDocument>(
  {
    title: { type: String, required: true },
    snapshot: { type: [HoldingSnapshotSchema], default: [] },
    analysis: { type: String, required: true },
    usdRate: { type: Number },
  },
  { timestamps: true },
);

PortfolioAnalysisSchema.index({ createdAt: -1 });

export default (mongoose.models.PortfolioAnalysis as mongoose.Model<PortfolioAnalysisDocument>) ||
  mongoose.model<PortfolioAnalysisDocument>('PortfolioAnalysis', PortfolioAnalysisSchema);

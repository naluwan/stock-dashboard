import mongoose, { Schema, Document } from 'mongoose';
import { ITradingConfig } from '@/types';

export interface TradingConfigDocument extends Omit<ITradingConfig, '_id'>, Document {}

const TradingConfigSchema = new Schema<TradingConfigDocument>(
  {
    twStockFeeRate: { type: Number, default: 0.1425 }, // % 法定上限，多數券商有折讓
    twStockMinFee: { type: Number, default: 20 },      // NT$ 台股最低手續費
    usStockFeeRate: { type: Number, default: 0 },      // % 美股手續費（很多券商 0）
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.TradingConfig ||
  mongoose.model<TradingConfigDocument>('TradingConfig', TradingConfigSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { IStock } from '@/types';

export interface StockDocument extends Omit<IStock, '_id'>, Document {}

const PurchaseSchema = new Schema({
  shares: { type: Number, required: true },
  price: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String },
});

const StockSchema = new Schema<StockDocument>(
  {
    symbol: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    market: { type: String, enum: ['TW', 'US'], required: true },
    purchases: [PurchaseSchema],
  },
  {
    timestamps: true,
  }
);

StockSchema.index({ symbol: 1, market: 1 }, { unique: true });

export default mongoose.models.Stock || mongoose.model<StockDocument>('Stock', StockSchema);

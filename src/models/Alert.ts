import mongoose, { Schema, Document } from 'mongoose';
import { IAlert } from '@/types';

export interface AlertDocument extends Omit<IAlert, '_id'>, Document {}

const AlertSchema = new Schema<AlertDocument>(
  {
    stockSymbol: { type: String, required: true, uppercase: true },
    stockName: { type: String, required: true },
    market: { type: String, enum: ['TW', 'US'], required: true },
    type: {
      type: String,
      enum: ['above_price', 'below_price', 'above_avg_percent', 'below_avg_percent'],
      required: true,
    },
    targetValue: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    lastTriggered: { type: Date },
    notifyChannels: [{ type: String, enum: ['email', 'line'] }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Alert || mongoose.model<AlertDocument>('Alert', AlertSchema);

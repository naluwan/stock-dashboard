import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  market: { type: String, enum: ['TW', 'US'], required: true },
  addedAt: { type: Date, default: Date.now },
  sortOrder: { type: Number, default: 0 },
});

FavoriteSchema.index({ symbol: 1, market: 1 }, { unique: true });

export default mongoose.models.Favorite || mongoose.model('Favorite', FavoriteSchema);

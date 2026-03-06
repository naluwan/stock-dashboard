import mongoose from 'mongoose';

const SearchHistorySchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  market: { type: String, enum: ['TW', 'US'], required: true },
  searchedAt: { type: Date, default: Date.now },
});

// 同一支股票只保留最新一次搜尋時間
SearchHistorySchema.index({ symbol: 1, market: 1 }, { unique: true });

export default mongoose.models.SearchHistory || mongoose.model('SearchHistory', SearchHistorySchema);

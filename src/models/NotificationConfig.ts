import mongoose, { Schema, Document } from 'mongoose';
import { INotificationConfig } from '@/types';

export interface NotificationConfigDocument extends Omit<INotificationConfig, '_id'>, Document {}

const LineRecipientSchema = new Schema({
  userId: { type: String, required: true },
  displayName: { type: String, required: true },
});

const NotificationConfigSchema = new Schema<NotificationConfigDocument>(
  {
    email: {
      enabled: { type: Boolean, default: false },
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPass: { type: String, default: '' },
      recipients: [{ type: String }],
    },
    line: {
      enabled: { type: Boolean, default: false },
      channelAccessToken: { type: String, default: '' },
      channelSecret: { type: String, default: '' },
      recipients: [LineRecipientSchema],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.NotificationConfig ||
  mongoose.model<NotificationConfigDocument>('NotificationConfig', NotificationConfigSchema);

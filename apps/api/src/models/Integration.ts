import mongoose, { Document, Schema } from "mongoose";

export interface IIntegration extends Document {
  userName: string;
  userPhone: string;
  whatsappId?: string;
  isConnected: boolean;
  lastConnection?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    userName: { type: String, required: true },
    userPhone: { type: String, required: true, unique: true },
    whatsappId: { type: String, required: false },
    isConnected: { type: Boolean, default: false },
    lastConnection: { type: Date, required: false },
  },
  { timestamps: true }
);

export const Integration = mongoose.model<IIntegration>(
  "Integration",
  IntegrationSchema
);

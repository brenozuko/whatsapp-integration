import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  messageId: string;
  from: string;
  to: string;
  fromMe: boolean;
  contact: mongoose.Types.ObjectId;
  integration: mongoose.Types.ObjectId;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    messageId: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    fromMe: { type: Boolean, required: true },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    integration: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

// Create indexes for faster queries
MessageSchema.index({ contact: 1, timestamp: -1 });
MessageSchema.index({ integration: 1, timestamp: -1 });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);

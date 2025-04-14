import mongoose, { Document, Schema } from "mongoose";

export interface IContact extends Document {
  name: string;
  phone: string;
  image?: string;
  integration: mongoose.Types.ObjectId;
  messageCount: number;
  lastMessageDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    image: { type: String, required: false },
    integration: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    messageCount: { type: Number, default: 0 },
    lastMessageDate: { type: Date, required: false },
  },
  { timestamps: true }
);

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);

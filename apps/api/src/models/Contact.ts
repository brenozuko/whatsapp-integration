import mongoose, { Document, Schema } from "mongoose";

export interface IContact extends Document {
  name: string;
  phone: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    image: { type: String, required: false },
  },
  { timestamps: true }
);

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);

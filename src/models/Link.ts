import mongoose from "mongoose";

const LinkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const Link =
  mongoose.models.Link || mongoose.model("Link", LinkSchema);


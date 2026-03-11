import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  savedQuery: { type: String, default: "-- Start typing your SQL here..." },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model("Workspace", workspaceSchema);

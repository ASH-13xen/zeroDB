import mongoose from "mongoose";

const sharedDatabaseSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dbName: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    filePath: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours (86400 seconds)
    },
  },
  { timestamps: true },
);

const SharedDatabase = mongoose.model("SharedDatabase", sharedDatabaseSchema);
export default SharedDatabase;

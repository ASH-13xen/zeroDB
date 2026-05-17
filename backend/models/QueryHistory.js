import mongoose from "mongoose";

const queryHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    database: {
      type: String,
      required: true,
    },
    executionTime: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "error"],
      required: true,
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const QueryHistory = mongoose.model("QueryHistory", queryHistorySchema);
export default QueryHistory;

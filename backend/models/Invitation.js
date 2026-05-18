import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    dbName: {
      type: String,
      required: true,
    },
    shareId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Invitation documents automatically expire/self-delete in MongoDB after 24 hours
invitationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Invitation = mongoose.model("Invitation", invitationSchema);
export default Invitation;

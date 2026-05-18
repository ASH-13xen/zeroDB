import User from "../models/User.js";
import Invitation from "../models/Invitation.js";

// POST /api/collab/invite
export const createInvitation = async (req, res) => {
  try {
    const { email, roomId, dbName, shareId } = req.body;
    const hostId = req.user.id;

    if (!email || !roomId || !dbName || !shareId) {
      return res.status(400).json({ error: "Missing required invitation details (email, roomId, dbName, shareId)." });
    }

    // 1. Locate the guest by email
    const recipient = await User.findOne({ email: email.toLowerCase().trim() });
    if (!recipient) {
      return res.status(404).json({ error: `User with email "${email}" not found.` });
    }

    // 2. Prevent self-invitation
    if (recipient._id.toString() === hostId.toString()) {
      return res.status(400).json({ error: "You cannot invite yourself to collaborate." });
    }

    // 3. Create the invitation document in MongoDB
    const invitation = new Invitation({
      hostId,
      recipientId: recipient._id,
      roomId,
      dbName,
      shareId,
      status: "pending",
    });
    await invitation.save();

    // 4. Fetch host user details to send in real-time alert
    const hostUser = await User.findById(hostId);
    
    // 5. Send real-time socket.io push notification if the recipient is currently online
    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");
    if (userSockets && io) {
      const recipientSocketId = userSockets.get(recipient._id.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("new-invitation", {
          _id: invitation._id,
          host: {
            name: hostUser ? hostUser.name : "A user",
            email: hostUser ? hostUser.email : "",
            avatar: hostUser ? hostUser.avatar : "",
          },
          dbName,
          shareId,
          roomId,
        });
        console.log(`📡 Dispatched real-time socket invitation to User: ${recipient.email}`);
      }
    }

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully!",
      invitation,
    });
  } catch (error) {
    console.error("❌ Collaboration Invitation Error:", error);
    res.status(500).json({ error: "Failed to send invitation.", details: error.message });
  }
};

// GET /api/collab/invitations
export const getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    // Fetch pending invitations where the current user is the guest
    const invitations = await Invitation.find({ recipientId: userId, status: "pending" })
      .populate("hostId", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invitations });
  } catch (error) {
    console.error("❌ Fetch Pending Invitations Error:", error);
    res.status(500).json({ error: "Failed to fetch invitations.", details: error.message });
  }
};

// POST /api/collab/respond
export const respondToInvitation = async (req, res) => {
  try {
    const { invitationId, status } = req.body;
    const userId = req.user.id;

    if (!invitationId || !status || !["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "Invalid invitation response schema." });
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found or expired." });
    }

    // Ensure only the correct recipient can respond
    if (invitation.recipientId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You are not authorized to respond to this invitation." });
    }

    invitation.status = status;
    await invitation.save();

    // If accepted, keep it or let socket handle room joining. 
    // If declined or accepted, notify the host if they are online
    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");
    if (userSockets && io) {
      const hostSocketId = userSockets.get(invitation.hostId.toString());
      if (hostSocketId) {
        io.to(hostSocketId).emit("invitation-response", {
          invitationId: invitation._id,
          status,
          recipientId: userId,
        });
      }
    }

    res.status(200).json({ success: true, message: `Invitation ${status} successfully.` });
  } catch (error) {
    console.error("❌ Respond to Invitation Error:", error);
    res.status(500).json({ error: "Failed to respond to invitation.", details: error.message });
  }
};

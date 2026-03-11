import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  console.log("---- AUTH FLOW STARTED ----");

  try {
    const { credential } = req.body;
    console.log("STEP 1: Received request body.");

    if (!credential) {
      console.error("❌ ERROR: No credential received from frontend!");
      return res
        .status(400)
        .json({ success: false, message: "No credential provided" });
    }
    console.log("STEP 2: Token received successfully.");

    // Verify token with Google
    console.log("STEP 3: Sending token to Google for verification...");
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    console.log("STEP 4: Google verified the token!");

    // Extract user details
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatar } = payload;
    console.log(
      `STEP 5: Extracted user info -> Email: ${email}, Name: ${name}`,
    );

    // Check DB
    console.log("STEP 6: Searching MongoDB for existing user...");
    let user = await User.findOne({ googleId });

    if (user) {
      console.log("STEP 7A: User found in DB! Proceeding to login.");
    } else {
      console.log("STEP 7B: User not found. Creating new user in DB...");
      user = await User.create({
        googleId,
        name,
        email,
        avatar,
      });
      console.log("STEP 8: New user successfully saved to MongoDB!", user);
    }

    // Generate JWT
    console.log("STEP 9: Generating zeroDB JWT...");
    const token = jwt.sign(
      { id: user._id, role: "developer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    console.log("STEP 10: JWT generated. Sending response to frontend.");

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    });

    console.log("---- AUTH FLOW COMPLETED SUCCESSFULLY ----\n");
  } catch (error) {
    console.error("❌ CAUGHT ERROR IN AUTH FLOW:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
      error: error.message,
    });
  }
};

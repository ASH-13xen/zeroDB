import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Initialize the Google Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body; // The token sent from your React frontend

    // 1. Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // 2. Extract user details from Google's payload
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatar } = payload;

    // 3. Check if user already exists in zeroDB
    let user = await User.findOne({ googleId });

    // 4. If not, create a new user
    if (!user) {
      user = await User.create({
        googleId,
        name,
        email,
        avatar,
      });
    }

    // 5. Generate our own zeroDB JWT for future API requests
    const token = jwt.sign(
      { id: user._id, role: "developer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }, // Token lasts for 7 days
    );

    // 6. Check your MODE environment variable to set secure cookies if in prod
    const isProd = process.env.MODE === "prod";

    // Send the response
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token, // Frontend will save this token in LocalStorage or Cookies
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ success: false, message: "Invalid Google Token" });
  }
};

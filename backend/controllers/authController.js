import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register User (Manual Signup)
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Register Request:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({ user: newUser, token });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ message: "Something went wrong while creating the account." });
  }
};

// Login User (Manual Login)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login Request:", req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // If user signed up with Google, they may not have a password
    if (!user.password) {
      return res.status(400).json({ message: "This account was created using Google. Please log in with Google or set a password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({ user, token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Something went wrong while logging in." });
  }
};

// Google Authentication (OAuth Login)
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    console.log("Google Token Received:", token);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, sub } = ticket.getPayload();
    console.log("Google Payload:", ticket.getPayload());

    let user = await User.findOne({ email });

    if (!user) {
      // If user does not exist, create a new one without a password
      user = await User.create({ name, email, googleId: sub });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({ user, token: jwtToken });
  } catch (error) {
    console.error("Google Authentication Failed:", error);
    res.status(500).json({ message: "Google Authentication Failed!" });
  }
};

// Allow Google Users to Set a Password
export const updatePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log("Update Password Request:", req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully! You can now log in manually." });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Something went wrong while updating the password." });
  }
};

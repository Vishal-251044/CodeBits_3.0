import express from 'express';
import User from '../models/User.js'; 
import bcrypt from 'bcryptjs';

const router = express.Router();

// Update user details route
router.put('/update', async (req, res) => {
  const { email, name, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If a new password is provided, hash it
    let updatedPassword = user.password;
    if (password) {
      updatedPassword = await bcrypt.hash(password, 10);
    }

    // Update user details
    user.name = name || user.name;
    user.password = updatedPassword;

    await user.save();

    res.json({ success: true, message: "User details updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating user details" });
  }
});

export default router;

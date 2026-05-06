// backend/controllers/authController.js
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import process from 'process';

export const registerUser = async (req, res) => {
  try {
    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const loginUser = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret not set" });
    }


// Takes a payload ({ userId, email })
// Signs it with JWT_SECRET (must be private)
// Returns a token string valid for 1 hour
// After verifying credentials, you build a payload (e.g. { userId: user._id, email: user.email }).
// You sign it with your secret: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }).
// The result is a compact token string (header.payload.signature).
// Sending the token to the client
// You return the token in the JSON response:
// { message: "Login successful", token, user: { id, name, email } }.
// Client receives this token and must store it for subsequent requests.

  const token = jwt.sign({ userId: user._id, email: user.email, name: user.name, profilePhoto: user.profilePhoto }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

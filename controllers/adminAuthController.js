import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';

/* REGISTER ADMIN */

export const registerAdmin = async (req, res) => {
  try {

    const {
      username,
      email,
      password,
      role
    } = req.body;

    /* Validation */

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    /* Check existing admin */

    const existingAdmin = await Admin.findOne({
      $or: [
        {
          email: email.trim().toLowerCase()
        },
        {
          username: username.trim()
        }
      ]
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    /* Create admin */

    const admin = await Admin.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || 'admin'
    });

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      adminId: admin._id
    });

  } catch (error) {

    console.error('Register admin error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/* LOGIN ADMIN */

export const loginAdmin = async (req, res) => {
  try {

    const {
      email,
      password
    } = req.body;

    /* Validation */

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    /* Find admin */

    const admin = await Admin.findOne({
      email: email.trim().toLowerCase()
    });

    console.log('[login] looking for:', email.trim().toLowerCase());
    console.log('[login] admin found:', !!admin);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    /* Compare password */

    const isMatch =
      await admin.comparePassword(password);

    console.log('[login] password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    /* Check JWT secret */

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT secret missing'
      });
    }

    /* Generate token */

    const token = jwt.sign(
      {
        adminId: admin._id,
        role: admin.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    /* Response */

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {

    console.error('Login admin error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
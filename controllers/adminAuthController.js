import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';
import { adminView } from '../middleware/auth.js';
import {
  COOKIES,
  clearAuthCookies,
  setAuthCookies,
  signToken,
  verifyToken,
} from '../utils/tokens.js';
import { normalizeRole } from '../config/rbac.js';

// Compared against when the account does not exist, so response time does not
// reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const issueSession = (res, admin) => {
  const base = { sub: String(admin._id), role: normalizeRole(admin.role), v: admin.tokenVersion };
  setAuthCookies(res, 'admin', {
    access: signToken('admin', 'access', base),
    refresh: signToken('admin', 'refresh', base),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');

  const ok = await bcrypt.compare(password, admin?.password ?? DUMMY_HASH);
  if (!admin || !ok || !admin.isActive) throw new AppError(401, 'Invalid credentials');

  admin.lastLoginAt = new Date();
  await admin.save();

  issueSession(res, admin);
  res.json({ success: true, admin: adminView(admin) });
};

export const refresh = async (req, res) => {
  const token = req.cookies?.[COOKIES.admin.refresh];
  if (!token) throw new AppError(401, 'No refresh token');

  let payload;
  try {
    payload = verifyToken(token, { aud: 'admin', typ: 'refresh' });
  } catch {
    clearAuthCookies(res, 'admin');
    throw new AppError(401, 'Session expired, please log in again');
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) {
    clearAuthCookies(res, 'admin');
    throw new AppError(401, 'Session is no longer valid');
  }

  issueSession(res, admin);
  res.json({ success: true, admin: adminView(admin) });
};

export const logout = async (req, res) => {
  clearAuthCookies(res, 'admin');
  res.json({ success: true });
};

export const logoutEverywhere = async (req, res) => {
  req.admin.tokenVersion += 1;
  await req.admin.save();
  clearAuthCookies(res, 'admin');
  res.json({ success: true });
};

export const me = (req, res) => res.json({ success: true, admin: adminView(req.admin) });

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin._id).select('+password');

  if (!(await admin.comparePassword(currentPassword))) {
    throw new AppError(400, 'Current password is incorrect');
  }

  admin.password = newPassword;
  admin.tokenVersion += 1; // sign out other devices
  await admin.save();

  issueSession(res, admin);
  res.json({ success: true, message: 'Password updated' });
};

/* ---------- staff management (superadmin only) ---------- */

export const createStaff = async (req, res) => {
  const { username, email, password, role } = req.body;
  const exists = await Admin.exists({ $or: [{ email }, { username }] });
  if (exists) throw new AppError(409, 'A staff member with that email or username already exists');

  const staff = await Admin.create({ username, email, password, role });
  res.status(201).json({ success: true, staff: adminView(staff) });
};

export const listStaff = async (_req, res) => {
  const staff = await Admin.find().sort({ createdAt: 1 });
  res.json({ success: true, staff: staff.map(adminView) });
};

export const updateStaff = async (req, res) => {
  const staff = await Admin.findById(req.params.id);
  if (!staff) throw new AppError(404, 'Staff member not found');

  const { role, isActive } = req.body;
  const isSelf = String(staff._id) === String(req.admin._id);
  const losesSuperadmin =
    normalizeRole(staff.role) === 'superadmin' &&
    ((role && role !== 'superadmin') || isActive === false);

  if (losesSuperadmin) {
    if (isSelf) throw new AppError(400, 'You cannot demote or deactivate yourself');
    const others = await Admin.countDocuments({
      role: 'superadmin',
      isActive: true,
      _id: { $ne: staff._id },
    });
    if (others === 0) throw new AppError(400, 'At least one active super admin is required');
  }

  if (role !== undefined) staff.role = role;
  if (isActive !== undefined) staff.isActive = isActive;
  staff.tokenVersion += 1; // role/status change takes effect immediately
  await staff.save();

  res.json({ success: true, staff: adminView(staff) });
};

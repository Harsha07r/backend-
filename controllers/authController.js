import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  COOKIES,
  clearAuthCookies,
  setAuthCookies,
  signToken,
  verifyToken,
} from '../utils/tokens.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const userView = (u) => ({ id: u._id, name: u.name, email: u.email, profilePhoto: u.profilePhoto });

const issueSession = (res, user) => {
  const base = { sub: String(user._id), v: user.tokenVersion };
  const tokens = {
    access: signToken('user', 'access', base),
    refresh: signToken('user', 'refresh', base),
  };
  setAuthCookies(res, 'user', tokens);
  return tokens;
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ success: true, message: 'Registered successfully', user: userView(user) });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Invalid credentials');

  const tokens = issueSession(res, user);
  // `token` is returned for clients that still use bearer auth; new clients should use the cookie.
  res.json({ success: true, token: tokens.access, user: userView(user) });
};

export const refresh = async (req, res) => {
  const token = req.cookies?.[COOKIES.user.refresh];
  if (!token) throw new AppError(401, 'No refresh token');
  try {
    const payload = verifyToken(token, { aud: 'user', typ: 'refresh' });
    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.v) throw new Error('stale');
    issueSession(res, user);
    res.json({ success: true, user: userView(user) });
  } catch {
    clearAuthCookies(res, 'user');
    throw new AppError(401, 'Session expired, please log in again');
  }
};

export const logout = (_req, res) => {
  clearAuthCookies(res, 'user');
  res.json({ success: true });
};

export const me = (req, res) => res.json({ success: true, user: userView(req.user) });

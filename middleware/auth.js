import Admin from '../models/Admin.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { COOKIES, verifyToken } from '../utils/tokens.js';
import { can, normalizeRole } from '../config/rbac.js';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Authenticates a request for the given audience ('admin' | 'user').
 * Accepts either an `Authorization: Bearer` header or the httpOnly cookie.
 * Cookie-authenticated writes must also send `X-Requested-With: XMLHttpRequest`,
 * which a cross-site form post cannot do (CSRF defence).
 */
export const authenticate =
  (aud, { optional = false } = {}) =>
  async (req, _res, next) => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.cookies?.[COOKIES[aud].access];

    if (!token) {
      if (optional) return next();
      throw new AppError(401, 'Authentication required');
    }

    if (!bearer && UNSAFE.has(req.method) && req.get('x-requested-with') !== 'XMLHttpRequest') {
      throw new AppError(403, 'Missing X-Requested-With header');
    }

    let payload;
    try {
      payload = verifyToken(token, { aud, typ: 'access' });
    } catch {
      if (optional) return next();
      throw new AppError(401, 'Invalid or expired session');
    }

    if (aud === 'admin') {
      const admin = await Admin.findById(payload.sub);
      if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) {
        if (optional) return next();
        throw new AppError(401, 'Session is no longer valid');
      }
      req.admin = admin;
    } else {
      const user = await User.findById(payload.sub).select('-password');
      if (!user) {
        if (optional) return next();
        throw new AppError(401, 'Session is no longer valid');
      }
      req.user = user;
    }
    next();
  };

export const authenticateAdmin = authenticate('admin');
export const authenticateUser = authenticate('user');
export const optionalUser = authenticate('user', { optional: true });

/** Requires the logged in admin to hold every listed permission. */
export const requirePermission =
  (...permissions) =>
  (req, _res, next) => {
    const role = req.admin?.role;
    if (!role || !permissions.every((p) => can(role, p))) {
      throw new AppError(403, 'You do not have permission to do that');
    }
    next();
  };

export const adminView = (admin) => ({
  id: admin._id,
  username: admin.username,
  email: admin.email,
  role: normalizeRole(admin.role),
  isActive: admin.isActive,
  lastLoginAt: admin.lastLoginAt,
});

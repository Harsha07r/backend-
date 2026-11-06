import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';

// `aud` separates admin tokens from customer tokens, `typ` separates access from
// refresh tokens, so one kind of token can never be replayed as another.

export const COOKIES = {
  admin: { access: 'rh_admin_at', refresh: 'rh_admin_rt' },
  user: { access: 'rh_user_at', refresh: 'rh_user_rt' },
};

const TTL = {
  access: { seconds: 15 * 60 },
  refresh: { seconds: 7 * 24 * 60 * 60 },
};

export const signToken = (aud, typ, payload) =>
  jwt.sign({ ...payload, typ }, env.JWT_SECRET, {
    audience: aud,
    expiresIn: TTL[typ].seconds,
    algorithm: 'HS256',
  });

export const verifyToken = (token, { aud, typ }) => {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    audience: aud,
    algorithms: ['HS256'],
  });
  if (payload.typ !== typ) throw new Error('Wrong token type');
  return payload;
};

const baseCookie = () => ({
  httpOnly: true,
  secure: isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export const setAuthCookies = (res, aud, { access, refresh }) => {
  res.cookie(COOKIES[aud].access, access, {
    ...baseCookie(),
    path: '/',
    maxAge: TTL.access.seconds * 1000,
  });
  res.cookie(COOKIES[aud].refresh, refresh, {
    ...baseCookie(),
    path: `/api/${aud === 'admin' ? 'admin' : 'auth'}`,
    maxAge: TTL.refresh.seconds * 1000,
  });
};

export const clearAuthCookies = (res, aud) => {
  res.clearCookie(COOKIES[aud].access, { ...baseCookie(), path: '/' });
  res.clearCookie(COOKIES[aud].refresh, {
    ...baseCookie(),
    path: `/api/${aud === 'admin' ? 'admin' : 'auth'}`,
  });
};

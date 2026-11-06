import Admin from '../models/Admin.js';
import { env } from '../config/env.js';

/**
 * Makes sure at least one super admin exists. Safe to run on every start:
 * it never deletes accounts, never resets a password, and logs no credentials.
 */
export const ensureSuperAdmin = async () => {
  if (await Admin.exists({ role: 'superadmin', isActive: true })) return;

  const email = env.ADMIN_EMAIL?.toLowerCase();
  if (!email) {
    console.warn('[bootstrap] No super admin exists and ADMIN_EMAIL is not set.');
    return;
  }

  // An older install created this account with the legacy "admin" role: promote it.
  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.role = 'superadmin';
    existing.isActive = true;
    await existing.save();
    console.log(`[bootstrap] Promoted ${email} to superadmin.`);
    return;
  }

  if (!env.ADMIN_PASSWORD) {
    console.warn('[bootstrap] ADMIN_PASSWORD is not set, cannot create the first super admin.');
    return;
  }

  await Admin.create({ username: 'admin', email, password: env.ADMIN_PASSWORD, role: 'superadmin' });
  console.log(`[bootstrap] Created super admin ${email}.`);
};

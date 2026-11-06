// Role based access control for the admin dashboard.
//
//   superadmin  - everything, including managing staff accounts
//   manager     - tours, enquiries (bookings), contact messages
//   support     - read/update enquiries and contact messages only
//
// "admin" is the legacy role value from older records and behaves like "manager".

export const ROLES = ['superadmin', 'manager', 'support'];
export const LEGACY_ROLES = ['admin'];

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard:read',
  BOOKINGS_READ: 'bookings:read',
  BOOKINGS_UPDATE: 'bookings:update',
  CONTACTS_READ: 'contacts:read',
  CONTACTS_UPDATE: 'contacts:update',
  TOURS_WRITE: 'tours:write',
  STAFF_MANAGE: 'staff:manage',
};

const P = PERMISSIONS;

const MATRIX = {
  superadmin: ['*'],
  manager: [
    P.DASHBOARD_READ,
    P.BOOKINGS_READ,
    P.BOOKINGS_UPDATE,
    P.CONTACTS_READ,
    P.CONTACTS_UPDATE,
    P.TOURS_WRITE,
  ],
  support: [
    P.DASHBOARD_READ,
    P.BOOKINGS_READ,
    P.BOOKINGS_UPDATE,
    P.CONTACTS_READ,
    P.CONTACTS_UPDATE,
  ],
};

export const normalizeRole = (role) => (role === 'admin' ? 'manager' : role);

export const can = (role, permission) => {
  const granted = MATRIX[normalizeRole(role)];
  if (!granted) return false;
  return granted.includes('*') || granted.includes(permission);
};

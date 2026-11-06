import { Router } from 'express';
import * as c from '../controllers/adminAuthController.js';
import { authenticateAdmin, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { PERMISSIONS } from '../config/rbac.js';
import * as v from '../validators/index.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: v.login }), c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);

router.use(authenticateAdmin);
router.get('/me', c.me);
router.post('/logout-all', c.logoutEverywhere);
router.post('/password', validate({ body: v.changePassword }), c.changePassword);

// Staff accounts are managed by super admins only. There is no public registration.
const staff = Router();
staff.use(requirePermission(PERMISSIONS.STAFF_MANAGE));
staff.get('/', c.listStaff);
staff.post('/', validate({ body: v.createStaff }), c.createStaff);
staff.patch('/:id', validate({ params: v.idParams, body: v.updateStaff }), c.updateStaff);
router.use('/staff', staff);

export default router;

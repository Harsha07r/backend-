import { Router } from 'express';
import * as c from '../controllers/contactController.js';
import { authenticateAdmin, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { PERMISSIONS as P } from '../config/rbac.js';
import * as v from '../validators/index.js';

const router = Router();

router.post('/', formLimiter, validate({ body: v.createContact }), c.submitContact);

router.use(authenticateAdmin);
router.get('/', requirePermission(P.CONTACTS_READ), validate({ query: v.listContactsQuery }), c.listContacts);
router.patch(
  '/:id',
  requirePermission(P.CONTACTS_UPDATE),
  validate({ params: v.idParams, body: v.updateContact }),
  c.updateContact
);

export default router;

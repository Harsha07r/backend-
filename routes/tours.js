import { Router } from 'express';
import * as c from '../controllers/tourController.js';
import { authenticateAdmin, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS as P } from '../config/rbac.js';
import * as v from '../validators/index.js';

const router = Router();

// Public (cacheable, used by server rendered pages and the sitemap)
router.get('/', validate({ query: v.listToursQuery }), c.listTours);
router.get('/slugs', c.listSlugs);

// Staff with tours:write. Declared before /:slug so "admin" is never read as a slug.
const admin = Router();
admin.use(authenticateAdmin, requirePermission(P.TOURS_WRITE));
admin.get('/', c.listAllTours);
admin.post('/', validate({ body: v.createTour }), c.createTour);
admin.get('/:id', validate({ params: v.idParams }), c.getTourById);
admin.put('/:id', validate({ params: v.idParams, body: v.updateTour }), c.updateTour);
admin.delete('/:id', validate({ params: v.idParams }), c.deleteTour);
router.use('/admin', admin);

router.get('/:slug', validate({ params: v.slugParams }), c.getTour);

export default router;

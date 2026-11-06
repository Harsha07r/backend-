import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import * as v from '../validators/index.js';

const router = Router();

router.post('/register', loginLimiter, validate({ body: v.registerUser }), c.registerUser);
router.post('/login', loginLimiter, validate({ body: v.login }), c.loginUser);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticateUser, c.me);

export default router;

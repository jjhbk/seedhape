import { Router } from 'express';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { merchants } from '../db/schema/index.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// POST /internal/sync-user — called by Next.js Clerk webhook handler
router.post('/sync-user', async (req, res, next) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== process.env['JWT_SECRET']) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const { clerkUserId, email, businessName } = req.body as {
      clerkUserId: string;
      email: string;
      businessName: string;
    };

    if (!clerkUserId || !email) {
      throw new AppError(400, 'Missing required fields', 'INVALID_INPUT');
    }

    await db
      .insert(merchants)
      .values({ clerkUserId, email, businessName: businessName || email.split('@')[0] || '' })
      .onConflictDoUpdate({
        target: merchants.clerkUserId,
        set: { email, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as syncRouter };

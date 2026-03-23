import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pgPool } from '@/lib/postgres';

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email', code: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    const result = await pgPool.query<{ id: string }>(
      `
      INSERT INTO waitlist_signups (email, source)
      VALUES ($1, $2)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
      `,
      [parsed.data.email, 'marketing_page'],
    );

    return NextResponse.json({
      ok: true,
      alreadyExists: result.rowCount === 0,
    });
  } catch (error) {
    console.error('[api/waitlist] DB write failed', error);
    const message = error instanceof Error ? error.message : 'Unknown DB error';

    return NextResponse.json(
      {
        error: 'Could not save waitlist entry',
        code: 'DB_WRITE_FAILED',
        ...(process.env['NODE_ENV'] !== 'production' && { debug: message }),
      },
      { status: 500 },
    );
  }
}

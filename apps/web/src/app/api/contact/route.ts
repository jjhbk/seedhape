import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pgPool } from '@/lib/postgres';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().max(200).optional(),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(4000),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid form payload', code: 'INVALID_INPUT' }, { status: 400 });
  }

  const input = parsed.data;

  try {
    await pgPool.query(
      `
      INSERT INTO contact_submissions (name, email, subject, company, message, source)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        input.name,
        input.email,
        input.subject ?? null,
        input.company ?? null,
        input.message,
        'marketing_page',
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/contact] DB write failed', error);
    const message = error instanceof Error ? error.message : 'Unknown DB error';

    return NextResponse.json(
      {
        error: 'Could not save contact form',
        code: 'DB_WRITE_FAILED',
        ...(process.env['NODE_ENV'] !== 'production' && { debug: message }),
      },
      { status: 500 },
    );
  }
}

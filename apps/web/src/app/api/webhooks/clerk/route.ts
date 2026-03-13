import { headers } from 'next/headers';
import { Webhook } from 'svix';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';
const CLERK_WEBHOOK_SECRET = process.env['CLERK_WEBHOOK_SECRET'] ?? '';

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
  };
};

export async function POST(req: Request) {
  const headersList = await headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const body = await req.text();

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkUserEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id: clerkUserId, email_addresses, primary_email_address_id, first_name, last_name } = event.data;
    const primaryEmail = email_addresses.find(e => e.id === primary_email_address_id)?.email_address;
    if (!primaryEmail) return new Response('No email', { status: 400 });

    const businessName = [first_name, last_name].filter(Boolean).join(' ') || primaryEmail.split('@')[0] || '';

    // Upsert merchant via internal API endpoint
    await fetch(`${API_URL}/internal/sync-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env['JWT_SECRET'] ?? '',
      },
      body: JSON.stringify({ clerkUserId, email: primaryEmail, businessName }),
    }).catch(() => null);
  }

  return new Response('OK', { status: 200 });
}

'use client';

import { FormEvent, useState } from 'react';

type WaitlistState = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

type ContactState = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

export function LeadCaptureForms() {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlist, setWaitlist] = useState<WaitlistState>({
    loading: false,
    message: null,
    error: null,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<ContactState>({
    loading: false,
    message: null,
    error: null,
  });

  async function submitWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWaitlist({ loading: true, message: null, error: null });

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: waitlistEmail }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setWaitlist({
        loading: false,
        message: null,
        error: body?.error ?? 'Could not join the waitlist right now.',
      });
      return;
    }

    setWaitlist({
      loading: false,
      message: body?.alreadyExists
        ? 'You are already on the waitlist. We will keep you posted.'
        : 'You are on the waitlist. We will reach out soon.',
      error: null,
    });
    setWaitlistEmail('');
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContact({ loading: true, message: null, error: null });

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        company: company || undefined,
        subject: subject || undefined,
        message,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setContact({
        loading: false,
        message: null,
        error: body?.error ?? 'Could not submit your message right now.',
      });
      return;
    }

    setContact({
      loading: false,
      message: 'Thanks for contacting us. We will get back to you shortly.',
      error: null,
    });
    setName('');
    setEmail('');
    setCompany('');
    setSubject('');
    setMessage('');
  }

  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-10">
        <div id="waitlist" className="scroll-mt-28 bg-white border border-gray-200 rounded-3xl p-8 md:p-10 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase mb-3">Waitlist</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Join the waitlist
          </h2>
          <p className="text-gray-500 max-w-2xl mb-7">
            Want early updates, launch invites, and priority onboarding support? Drop your email below.
          </p>

          <form onSubmit={submitWaitlist} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={waitlist.loading}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold px-6 py-3 text-sm transition-colors"
            >
              {waitlist.loading ? 'Joining...' : 'Join waitlist'}
            </button>
          </form>

          {waitlist.message && <p className="mt-3 text-sm text-emerald-600">{waitlist.message}</p>}
          {waitlist.error && <p className="mt-3 text-sm text-red-500">{waitlist.error}</p>}
        </div>

        <div id="contact-us" className="scroll-mt-28 bg-white border border-gray-200 rounded-3xl p-8 md:p-10 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase mb-3">Contact us</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Let us help you get started
          </h2>
          <p className="text-gray-500 max-w-2xl mb-7">
            Share your use case and we will reach out with setup guidance.
          </p>

          <form onSubmit={submitContact} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company (optional)"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <textarea
              required
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you want to build..."
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-y"
            />

            <button
              type="submit"
              disabled={contact.loading}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold px-6 py-3 text-sm transition-colors"
            >
              {contact.loading ? 'Sending...' : 'Send message'}
            </button>
          </form>

          {contact.message && <p className="mt-3 text-sm text-emerald-600">{contact.message}</p>}
          {contact.error && <p className="mt-3 text-sm text-red-500">{contact.error}</p>}
        </div>
      </div>
    </section>
  );
}

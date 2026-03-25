import type { Metadata } from 'next';
import Link from 'next/link';
import { JetBrains_Mono, Playfair_Display, Source_Serif_4 } from 'next/font/google';
import styles from './page.module.css';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'] });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], weight: ['300', '400', '600'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: '340 Million People. Zero Tooling. | SeedhaPe Blog',
  description:
    "India has the world's best payment network and the world's largest tooling gap for UPI receivers. The story behind SeedhaPe.",
};

export default function BlogPage() {
  return (
    <article className={`${styles.essayPage} ${sourceSerif.className}`}>
      <header className="hero">
        <div className={`kicker ${jetbrains.className}`}>The gap nobody is building for</div>
        <h1 className={playfair.className}>
          340 Million People.
          <br />
          <em>Zero Tooling.</em>
        </h1>
        <p className="subtitle">
          India has the world&apos;s best payment network. And the world&apos;s biggest gap between
          who can receive money and who can do anything useful with it.
        </p>
        <div className="byline">
          <div className={`avatar ${playfair.className}`}>JJ</div>
          <div className="byline-text">
            <strong>Jathin Jagannath</strong>
            Founder, SeedhaPe · Published March 2025
          </div>
        </div>
      </header>

      <div className="divider">
        <hr />
      </div>

      <section className="body">
        <p>
          Last year, UPI processed <strong>131 billion transactions</strong>. One hundred and
          thirty-one billion. A number so large it&apos;s almost decorative, until you look at who
          is behind it.
        </p>

        <p>
          NPCI&apos;s merchant ecosystem has roughly 350 million registered UPI receivers. Payment
          aggregators - Razorpay, Cashfree, PayU, all of them combined - serve somewhere between
          10 and 12 million registered merchants.
        </p>

        <div className="stat-block">
          <span className={`stat-number ${playfair.className}`}>340M</span>
          <span className="stat-label">
            UPI receivers transacting every day
            <br />
            with no tooling, no records, no automation around their payments.
          </span>
        </div>

        <p>That is not a rounding error. That is the entire point.</p>

        <h2 className={playfair.className}>Why does this gap exist?</h2>

        <p>
          This is the question worth asking before building anything. Because a gap this large,
          sitting on top of infrastructure this good, doesn&apos;t persist by accident. There&apos;s a
          concrete reason for it.
        </p>

        <p>
          Every payment solution ever built in India has assumed one thing at the merchant end: a
          registered business. GST number. Current account. Minimum transaction volume to justify
          onboarding. A technical team to integrate an API.
        </p>

        <p>
          Those aren&apos;t arbitrary product decisions. They&apos;re legal requirements for licensed
          Payment Aggregators under RBI&apos;s guidelines. KYC is mandated under PMLA. Settlement
          floats exist for fraud protection. The fees charged by aggregators aren&apos;t greed - UPI
          MDR was set to zero in 2020. What they charge is for the value-added layer on top:
          reconciliation, fraud scoring, checkouts, refunds.
        </p>

        <blockquote className={`${playfair.className} pull-quote`}>
          &quot;The system works exactly as designed. It just wasn&apos;t designed for everyone.&quot;
        </blockquote>

        <p>
          Below the formal threshold, outside the registered business layer, there is nothing. Not
          bad products. Nothing.
        </p>

        <h2 className={playfair.className}>Three problems nobody is solving</h2>

        <p>
          Apps like AutoAlert proved merchants want this - a million downloads just for a voice
          alert when payment arrives. Nobody built what comes next.
        </p>

        <div className="problem-grid">
          <article className="problem-card" data-num="01">
            <h4 className={playfair.className}>The Digital Delivery Problem</h4>
            <p>
              India has an explosion of solo digital sellers - coaching notes, astrology reports,
              PDFs, resume templates, local recipe books. They sell via WhatsApp and Instagram.
              Payment happens on UPI. Delivery is manual, delayed, and entirely dependent on the
              seller being online. There is no automated digital fulfillment layer that doesn&apos;t
              require a payment gateway. For every sale, someone is waiting.
            </p>
          </article>

          <article className="problem-card" data-num="02">
            <h4 className={playfair.className}>The Reconciliation Problem</h4>
            <p>
              A temple receiving 200 UPI donations on a Saturday is manually checking a phone
              screen. No receipts. No donor records. No 80G certificate generation. No goal
              tracking. This affects every religious institution, NGO, community fund, and local
              charity in India, which is an enormous number. The money arrives. The paper trail
              doesn&apos;t.
            </p>
          </article>

          <article className="problem-card" data-num="03">
            <h4 className={playfair.className}>The Friction Cost Problem</h4>
            <p>
              You can register for GST voluntarily, even below the INR 40 lakh threshold. But
              voluntary registration means mandatory monthly return filing, compliance overhead,
              and ongoing accounting costs that make no economic sense for a home baker, a solo
              creator, or a community fund with irregular income. The formal system doesn&apos;t lock
              them out. It just asks too much in return for too little.
            </p>
          </article>
        </div>

        <h2 className={playfair.className}>The insight behind SeedhaPe</h2>

        <p>
          Going back to first principles: what does every UPI receiver already have that no
          gateway can improve on?
        </p>

        <p>A notification.</p>

        <p>
          When money arrives on any UPI ID - personal, merchant, anything - the app sends a push
          notification. That notification contains everything: amount, sender VPA, transaction
          reference ID, timestamp. A licensed Payment Aggregator isn&apos;t giving you any information
          that notification doesn&apos;t already contain.
        </p>

        <div className="highlight-box">
          <p>
            <strong>The key insight:</strong> If you&apos;re not aggregating funds - if the
            merchant&apos;s own UPI ID receives the money directly - you don&apos;t need a PA license.
            You&apos;re not in the payment flow. You&apos;re just the intelligence layer sitting on top of
            a notification.
          </p>
        </div>

        <p>
          SeedhaPe listens to those notifications using Android&apos;s{' '}
          <code className={jetbrains.className}>NotificationListenerService</code>, matches
          incoming payments to pending orders, and auto-fulfills them. No gateway. No API
          integration. No regulatory surface area beyond what the merchant already has.
        </p>

        <h3 className={playfair.className}>How it works</h3>

        <div className="flow">
          <div className="flow-step">
            <div className={`step-icon ${jetbrains.className}`}>01</div>
            <div className="step-content">
              <strong>Merchant creates an order</strong>
              <span>A digital product, a donation link, a service booking, anything with a price attached.</span>
            </div>
          </div>
          <div className="flow-step">
            <div className={`step-icon ${jetbrains.className}`}>02</div>
            <div className="step-content">
              <strong>Customer pays on any UPI app</strong>
              <span>To the merchant&apos;s own UPI ID. No redirect. No checkout page required.</span>
            </div>
          </div>
          <div className="flow-step">
            <div className={`step-icon ${jetbrains.className}`}>03</div>
            <div className="step-content">
              <strong>Notification fires</strong>
              <span>SeedhaPe reads the incoming payment notification in real time.</span>
            </div>
          </div>
          <div className="flow-step">
            <div className={`step-icon ${jetbrains.className}`}>04</div>
            <div className="step-content">
              <strong>Auto-fulfillment triggers</strong>
              <span>Product delivered. Receipt sent. Record created. In seconds, automatically.</span>
            </div>
          </div>
        </div>

        <h2 className={playfair.className}>What this actually unlocks</h2>

        <p>
          SeedhaPe is the first proof of concept. The bigger vision is a full financial operating
          system for India&apos;s pre-formal economy - reconciliation, receipts, digital delivery,
          donor management, basic analytics - all triggered by a notification, not a license.
        </p>

        <p>Starting exactly where every existing solution stops.</p>

        <p>
          The 340 million aren&apos;t underserved because the problem is technically hard. They&apos;re
          underserved because every product was built looking up, toward enterprise, toward scale,
          toward the registered merchant with a current account and a dev team. Nobody built
          looking sideways at the person transacting right now, rationally outside the formal
          system, with nothing around it.
        </p>

        <p>That&apos;s the gap. And it&apos;s the most interesting gap in Indian fintech right now.</p>
      </section>

      <section className="closing">
        <div className="closing-inner">
          <h2 className={playfair.className}>Built for the 340 million.</h2>
          <p>
            SeedhaPe is in early access. If you&apos;re a solo creator, a small community, an NGO,
            or anyone receiving UPI payments with no tooling around it, we&apos;re building for you.
          </p>
          <Link href="/contact#waitlist" className={`cta-btn ${jetbrains.className}`}>
            Join the waitlist
          </Link>
        </div>
      </section>
    </article>
  );
}

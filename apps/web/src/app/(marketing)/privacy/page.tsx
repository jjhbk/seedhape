import Link from 'next/link';

const EFFECTIVE_DATE = 'March 20, 2026';

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:mt-10 prose-h2:text-2xl prose-h3:text-lg">
          <p>
            This Privacy Policy explains how SeedhaPe (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses,
            stores, and shares information when you use our website, API, and Android mobile application
            (the &quot;Services&quot;).
          </p>

          <h2>1. Information We Collect</h2>
          <h3>1.1 Account and business information</h3>
          <ul>
            <li>Business name, email address, UPI ID, webhook URL, and account identifiers.</li>
            <li>API key metadata and device registration details.</li>
          </ul>

          <h3>1.2 Payment and transaction-related information</h3>
          <ul>
            <li>Order ID, amount, status, timestamps, and transaction reference fields (for example UTR).</li>
            <li>Payer/sender name where available from supported payment notification sources.</li>
            <li>Payment app package/source metadata used for payment verification.</li>
          </ul>

          <h3>1.3 Android app data and permissions</h3>
          <p>The SeedhaPe Android app may request and use the following permissions:</p>
          <ul>
            <li>
              <strong>Notification access</strong> (Notification Listener Service): to detect incoming UPI
              payment notifications and verify orders.
            </li>
            <li>
              <strong>SMS permissions</strong> (<code>READ_SMS</code>, <code>RECEIVE_SMS</code>): used as a
              fallback to read bank credit SMS messages when notification parsing is unavailable.
            </li>
            <li>
              <strong>Foreground service/data sync</strong>: to keep verification sync running reliably.
            </li>
            <li>
              <strong>Internet access</strong>: to securely send verification events to SeedhaPe servers.
            </li>
          </ul>
          <p>
            We do not use these permissions for advertising or contact-list profiling. We use them only for payment
            verification, fraud prevention, and service reliability.
          </p>

          <h3>1.4 Technical and log information</h3>
          <ul>
            <li>IP address, device identifiers, app version, device model, request logs, and error logs.</li>
          </ul>

          <h2>2. How We Use Information</h2>
          <ul>
            <li>To provide payment order creation, verification, and webhook delivery.</li>
            <li>To prevent fraud, abuse, duplicate matches, and unauthorized access.</li>
            <li>To support dispute handling and merchant support workflows.</li>
            <li>To improve performance, reliability, and security of the Services.</li>
            <li>To comply with applicable legal obligations.</li>
          </ul>

          <h2>3. Legal Basis (where applicable)</h2>
          <ul>
            <li>Performance of a contract (providing the Services requested by you).</li>
            <li>Legitimate interests (security, fraud prevention, reliability, support).</li>
            <li>Compliance with legal obligations.</li>
            <li>Consent, where required by law.</li>
          </ul>

          <h2>4. Sharing of Information</h2>
          <p>We do not sell personal information.</p>
          <p>We may share information with:</p>
          <ul>
            <li>Service providers that host infrastructure, process logs, or deliver files/webhooks on our behalf.</li>
            <li>Your configured webhook endpoint(s), based on your account settings.</li>
            <li>Authorities or regulators when legally required.</li>
            <li>Successors in connection with a merger, acquisition, or asset sale (with appropriate safeguards).</li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>
            We retain data for as long as needed to provide the Services, maintain security/fraud controls, resolve
            disputes, and satisfy legal/accounting obligations. Retention periods may vary by data type and use case.
          </p>

          <h2>6. Data Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational safeguards to protect data. No method of
            transmission or storage is 100% secure, but we continuously improve controls to reduce risk.
          </p>

          <h2>7. Your Choices and Rights</h2>
          <ul>
            <li>You can update business profile information from the dashboard settings.</li>
            <li>You can disconnect the mobile device and revoke API keys.</li>
            <li>You can disable notification/SMS permissions from Android settings (core verification may stop).</li>
            <li>
              You may request access, correction, or deletion of your data, subject to legal or security retention
              requirements.
            </li>
          </ul>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            The Services are not directed to children under 13 (or the equivalent age in your jurisdiction), and we do
            not knowingly collect personal information from children.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Your information may be processed in countries other than your own. Where required, we apply safeguards
            appropriate to such transfers.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised version on this page and
            update the effective date.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            For privacy questions or requests, contact us at{' '}
            <a href="mailto:support@seedhape.com">support@seedhape.com</a>.
          </p>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link href="/" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            ← Back to SeedhaPe
          </Link>
        </div>
      </div>
    </div>
  );
}

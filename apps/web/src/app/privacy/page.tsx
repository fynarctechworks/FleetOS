import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — FleetOS',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-primary hover:underline">&larr; Back to FleetOS</Link>
      <h1 className="mt-4 text-3xl font-bold text-text-dark">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: March 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-text-dark">
        <section>
          <h2 className="text-lg font-semibold">1. Information We Collect</h2>
          <p className="mt-2">
            FleetOS collects information necessary to provide fleet management services:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Account information: name, phone number, email address</li>
            <li>Company details: company name, GST number, PAN number, address</li>
            <li>Vehicle data: registration numbers, GPS location (for drivers using the driver app)</li>
            <li>Financial data: freight amounts, payment records, salary information</li>
            <li>Driver information: name, phone, licence number (last 4 digits of Aadhaar only)</li>
            <li>Usage data: app interactions, feature usage for improving our services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Providing fleet management, trip tracking, and financial reporting services</li>
            <li>Generating LR/Bilty documents, salary slips, and GST reports</li>
            <li>Sending WhatsApp notifications for trip updates, compliance alerts, and EWB expiry</li>
            <li>GPS tracking for real-time fleet monitoring (only with driver consent)</li>
            <li>Improving service quality and user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Data Protection (DPDP Act 2023)</h2>
          <p className="mt-2">
            In compliance with the Digital Personal Data Protection Act, 2023 (India):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>We collect personal data only with explicit consent</li>
            <li>Data is processed only for stated purposes</li>
            <li>You have the right to access, correct, or erase your personal data</li>
            <li>We do not store full Aadhaar numbers — only last 4 digits for identification</li>
            <li>Bank account details are encrypted at rest</li>
            <li>Data is stored on Supabase servers (Singapore region) with encryption</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Data Sharing</h2>
          <p className="mt-2">
            We do not sell your personal data. We share data only with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Your consignees — tracking links showing LR status only (no company data)</li>
            <li>Meta (WhatsApp) — for delivering notification messages</li>
            <li>Google Maps — for route and GPS services</li>
            <li>Government authorities — when required by law (GST returns, E-Way Bills)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Data Retention</h2>
          <p className="mt-2">
            We retain your data for as long as your account is active. Financial records are
            retained for 8 years as required by Indian tax law. You may request account deletion
            at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Security</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Row-Level Security (RLS) ensures complete data isolation between companies</li>
            <li>All connections use TLS encryption</li>
            <li>JWT-based authentication with role-based access control</li>
            <li>No API keys or secrets stored in client applications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Contact</h2>
          <p className="mt-2">
            For privacy-related inquiries, contact us at: privacy@fleetos.in
          </p>
        </section>
      </div>
    </div>
  );
}

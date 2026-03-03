import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — FleetOS',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-primary hover:underline">&larr; Back to FleetOS</Link>
      <h1 className="mt-4 text-3xl font-bold text-text-dark">Terms of Service</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: March 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-text-dark">
        <section>
          <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By using FleetOS, you agree to these Terms of Service. FleetOS is a Transport
            Management System designed for Indian fleet operators. If you do not agree, do not
            use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Services</h2>
          <p className="mt-2">FleetOS provides:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>LR (Lorry Receipt / Bilty) generation and management</li>
            <li>Trip planning, tracking, and P&L analysis</li>
            <li>Diesel entry tracking with theft detection</li>
            <li>GPS fleet tracking via the driver app</li>
            <li>Compliance document management with expiry alerts</li>
            <li>Financial reports including GSTR-1/3B summaries</li>
            <li>WhatsApp notifications for trip updates and alerts</li>
            <li>Driver salary management and payslip generation</li>
            <li>Vendor management and payment tracking</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. User Responsibilities</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>You are responsible for the accuracy of all data entered into FleetOS</li>
            <li>You must obtain driver consent before enabling GPS tracking</li>
            <li>You must not use the platform for illegal activities</li>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>GST reports are generated from your data — verify with your CA before filing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Data Accuracy</h2>
          <p className="mt-2">
            FleetOS auto-calculates GST amounts, trip P&L, and diesel mileage based on
            user-entered data. These calculations are for reference only. Users should verify
            all financial data with their chartered accountant before use in tax filings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. E-Way Bill Disclaimer</h2>
          <p className="mt-2">
            FleetOS provides manual E-Way Bill tracking (number + expiry). It does not
            integrate with the NIC E-Way Bill portal. Users are responsible for generating
            E-Way Bills through the official portal and entering the details into FleetOS.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Service Availability</h2>
          <p className="mt-2">
            We strive for 99.9% uptime but do not guarantee uninterrupted service. The mobile
            app supports offline mode for critical operations (LR creation, diesel entries)
            that sync when connectivity is restored.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Limitation of Liability</h2>
          <p className="mt-2">
            FleetOS is provided &ldquo;as is&rdquo; without warranties. We are not liable for
            data loss, financial discrepancies, or consequences arising from incorrect data
            entry. Our total liability is limited to the fees paid for the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Governing Law</h2>
          <p className="mt-2">
            These terms are governed by the laws of India. Disputes shall be resolved in the
            courts of Visakhapatnam, Andhra Pradesh.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Contact</h2>
          <p className="mt-2">
            For questions about these terms, contact us at: legal@fleetos.in
          </p>
        </section>
      </div>
    </div>
  );
}

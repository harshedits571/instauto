import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', fontFamily: 'var(--font-sans)', color: '#0f172a', lineHeight: 1.6 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontSize: '14px', marginBottom: '24px', textDecoration: 'none' }}>
        <ArrowLeft size={16} />
        <span>Back to InstaAuto</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <FileText size={28} color="#4f46e5" />
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Terms of Service</h1>
      </div>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>Last Updated: October 2026</p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>1. Acceptance of Terms</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          By creating an account or connecting your Instagram profile with InstaAuto, you agree to these Terms and abide by Meta&apos;s Community Guidelines and Platform Terms.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>2. Permitted Use</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          InstaAuto provides tools to automate direct replies to comments on your Instagram Reels. You agree not to use the service to distribute spam, malicious links, phishing material, or harmful content.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>3. Compliance with Meta Platform Terms</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          All messaging operations are routed through official Meta Graph API endpoints. Users must maintain an active Creator or Business Instagram account in good standing.
        </p>
      </section>
    </div>
  );
}

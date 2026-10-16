import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', fontFamily: 'var(--font-sans)', color: '#0f172a', lineHeight: 1.6 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontSize: '14px', marginBottom: '24px', textDecoration: 'none' }}>
        <ArrowLeft size={16} />
        <span>Back to InstaAuto</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <ShieldCheck size={28} color="#10b981" />
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Privacy Policy</h1>
      </div>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>Last Updated: October 2026</p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>1. Information We Collect</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          When you connect your Instagram Creator or Business account with InstaAuto, we access public information provided through the official Meta Graph API: your Instagram username, name, profile photo, and public Reel media. We only process comments and messages strictly necessary to fulfill automated comment-to-DM triggers requested by you.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>2. How We Use Information</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          We use your account data exclusively to detect configured keywords on your Reels and dispatch automated direct messages via Meta&apos;s official Private Replies and Send APIs. We do not sell your data, use it for advertising, or access private messages beyond the automated reply triggers you configure.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>3. Data Retention &amp; Security</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          All Meta OAuth access tokens are encrypted. You may disconnect your account at any time from the Instagram Connect page, which immediately revokes our access and purges your tokens from our server.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>4. Data Deletion Instructions</h2>
        <p style={{ color: '#334155', fontSize: '14px' }}>
          In accordance with Meta Platform Terms, you can request full deletion of your user data at any time by visiting our Data Deletion page or disconnecting your app under Facebook Settings &gt; Apps and Websites.
        </p>
      </section>
    </div>
  );
}

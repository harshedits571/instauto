import { ShieldCheck, CheckCircle2, Lock, Sparkles } from 'lucide-react';

export default function SafetyBadge() {
  return (
    <div className="safety-banner">
      <div className="safety-banner-left">
        <div className="safety-badge-icon">
          <ShieldCheck size={20} />
        </div>
        <div className="safety-text">
          <h4>Zero Ban Guarantee: Official Meta Graph API Architecture</h4>
          <p>
            Unlike unofficial bots or scrapers, this system uses Meta&apos;s verified <strong>Private Replies Endpoint</strong>. 
            Your Instagram password is never required, avoiding shadowbans and suspension triggers.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <span className="pill pill-success">
          <CheckCircle2 size={12} />
          Jitter Delays Active
        </span>
        <span className="pill pill-subtle">
          <Lock size={12} />
          OAuth 2.0 Encrypted
        </span>
      </div>
    </div>
  );
}

'use client';

import { ShieldCheck, Plus, User as UserIcon, Sparkles } from 'lucide-react';
import { User, InstagramAccount } from '@/types';

interface HeaderProps {
  user: User;
  account: InstagramAccount;
  onOpenCreateModal: () => void;
  onOpenAuthModal?: () => void;
}

export default function Header({ 
  user, 
  account, 
  onOpenCreateModal, 
  onOpenAuthModal 
}: HeaderProps) {
  return (
    <header className="top-header">
      <div className="header-title-area">
        <h2>Comment-to-DM Engine</h2>
        {account.isConnected ? (
          <p>Connected to <strong>@{account.username}</strong> ({account.facebookPageName})</p>
        ) : (
          <p style={{ color: '#b45309' }}>No Instagram account connected yet. Go to Instagram Connect to link your account.</p>
        )}
      </div>

      <div className="header-actions">
        {account.isConnected ? (
          <div className="pill pill-success" title="Compliant with Meta Official Graph API. No bot logins, zero risk of account bans.">
            <ShieldCheck size={14} />
            <span>Anti-Ban: 100% Meta Verified</span>
          </div>
        ) : (
          <a href="/connect" className="pill" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
            <span>Connect Instagram</span>
          </a>
        )}

        {/* User profile / login button */}
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onOpenAuthModal}
          title="Account profile and switch workspace"
        >
          <UserIcon size={14} />
          <span>{user.name}</span>
        </button>

        {/* Create Automation Button */}
        <button 
          className="btn btn-primary"
          onClick={onOpenCreateModal}
        >
          <Plus size={16} />
          <span>New Automation</span>
        </button>
      </div>
    </header>
  );
}

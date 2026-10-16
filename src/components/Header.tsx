'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, User as UserIcon, LogOut } from 'lucide-react';
import { User, InstagramAccount } from '@/types';
import { logOut } from '@/lib/firebase';
import { clearAllStoredData } from '@/lib/storage';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoggedIn = mounted && !!user.id && user.id !== 'usr_default';

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logOut();
      clearAllStoredData();
      window.location.reload();
    }
  };

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h2>Comment-to-DM Engine</h2>
        {isLoggedIn && account.isConnected ? (
          <p>Connected to <strong>@{account.username}</strong> ({account.facebookPageName})</p>
        ) : isLoggedIn ? (
          <p style={{ color: '#b45309' }}>No Instagram account linked. Go to Instagram Connect to link your account.</p>
        ) : (
          <p style={{ color: '#64748b' }}>Instagram Comment-to-DM Automation • Sign in to connect your account</p>
        )}
      </div>

      <div className="header-actions">
        {account.isConnected && isLoggedIn ? (
          <div className="pill pill-success" title="Compliant with Meta Official Graph API. No bot logins, zero risk of account bans.">
            <ShieldCheck size={14} />
            <span>Anti-Ban: 100% Meta Verified</span>
          </div>
        ) : null}

        {/* User profile / login button */}
        {isLoggedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              className="btn btn-secondary btn-sm" 
              style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <UserIcon size={14} />
              )}
              <span style={{ fontWeight: 600 }}>{user.name}</span>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: '#fecaca', padding: '6px 10px' }}
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <button 
            className="btn btn-primary btn-sm" 
            onClick={onOpenAuthModal}
            style={{ 
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
              boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              fontWeight: 700
            }}
          >
            <UserIcon size={14} />
            <span>Sign In / Register</span>
          </button>
        )}

        {/* Create Automation Button */}
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (!isLoggedIn && onOpenAuthModal) {
              onOpenAuthModal();
            } else {
              onOpenCreateModal();
            }
          }}
        >
          <Plus size={16} />
          <span>New Automation</span>
        </button>
      </div>
    </header>
  );
}


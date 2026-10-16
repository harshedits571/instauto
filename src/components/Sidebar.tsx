'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Zap, 
  MessageSquare, 
  Instagram, 
  PlaySquare, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  Radio
} from 'lucide-react';
import { InstagramAccount } from '@/types';

interface SidebarProps {
  account: InstagramAccount;
  activeAutomationsCount: number;
}

export default function Sidebar({ account, activeAutomationsCount }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Zap },
    { 
      name: 'Automations', 
      href: '/automations', 
      icon: MessageSquare, 
      badge: activeAutomationsCount > 0 ? activeAutomationsCount : undefined 
    },
    { name: 'Test Simulator', href: '/simulator', icon: PlaySquare },
    { name: 'Instagram Connect', href: '/connect', icon: Instagram },
    { name: 'Analytics & Logs', href: '/analytics', icon: BarChart3 },
    { name: 'Anti-Ban Engine', href: '/connect#safety', icon: ShieldCheck },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon">
          <Instagram size={20} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <h1>InstaAuto</h1>
          <span>Official Meta Partner</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
              {item.badge !== undefined && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Connected Account Status */}
      <div className="sidebar-footer">
        <Link href="/connect" style={{ display: 'block' }}>
          <div className="account-card-mini">
            {account.isConnected && account.profilePicture ? (
              <img 
                src={account.profilePicture} 
                alt={account.username} 
                className="account-avatar"
              />
            ) : (
              <div 
                className="account-avatar" 
                style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
              >
                <Instagram size={16} />
              </div>
            )}
            <div className="account-info">
              <div className="account-name">
                {account.isConnected ? `@${account.username}` : 'No Account Linked'}
              </div>
              <div className="account-status">
                <span 
                  className="status-dot" 
                  style={{ background: account.isConnected ? 'var(--success)' : '#f59e0b' }}
                ></span>
                <span style={{ color: account.isConnected ? 'var(--success-text)' : '#b45309' }}>
                  {account.isConnected ? 'Meta API Active' : 'Click to Connect'}
                </span>
              </div>
            </div>
            <Radio size={14} color={account.isConnected ? "#10b981" : "#f59e0b"} />
          </div>
        </Link>
      </div>
    </aside>
  );
}

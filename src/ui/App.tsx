import { useState } from 'react'
import DocsTab from './tabs/DocsTab'
import CopyTab from './tabs/CopyTab'
import UsersTab from './tabs/UsersTab'
import HandoffTab from './tabs/HandoffTab'
import DSTab from './tabs/DSTab'

type Tab = 'docs' | 'copy' | 'users' | 'handoff' | 'ds'

interface TabConfig {
  id: Tab
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'docs',    label: 'Docs',    icon: '📄' },
  { id: 'copy',    label: 'Copy',    icon: '✍️' },
  { id: 'users',   label: 'Users',   icon: '👥' },
  { id: 'handoff', label: 'Handoff', icon: '🚀' },
  { id: 'ds',      label: 'DS',      icon: '🧩' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('docs')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          color: #1a1a2e;
          background: #f8f8fc;
          overflow-x: hidden;
        }

        /* ── Header ── */
        .header {
          background: linear-gradient(135deg, #0a1628 0%, #1a2d5a 100%);
          padding: 14px 16px 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .logo {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #0066cc, #00a3ff);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,102,204,0.4);
        }

        .header-title {
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .header-subtitle {
          color: rgba(255,255,255,0.45);
          font-size: 10px;
          font-weight: 400;
          margin-top: 1px;
        }

        /* ── Tab Navigation ── */
        .tab-nav {
          display: flex;
          gap: 2px;
        }

        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: rgba(255,255,255,0.45);
          font-size: 11px;
          font-weight: 500;
          padding: 8px 4px 9px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          white-space: nowrap;
          letter-spacing: 0.3px;
        }

        .tab-btn:hover {
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.05);
        }

        .tab-btn.active {
          color: #ffffff;
          border-bottom-color: #0099ff;
          background: rgba(0,153,255,0.08);
        }

        .tab-icon {
          font-size: 12px;
          line-height: 1;
        }

        /* ── Content area ── */
        .tab-content {
          padding: 16px;
          min-height: calc(100vh - 82px);
        }

        /* ── Shared UI Components ── */
        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }

        .card {
          background: #ffffff;
          border: 1px solid #e8e8f0;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .card-title {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .card-desc {
          font-size: 11px;
          color: #6b7280;
          line-height: 1.5;
        }

        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #0066cc, #0088ff);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          letter-spacing: 0.2px;
          box-shadow: 0 2px 8px rgba(0,102,204,0.25);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0055bb, #0077ee);
          box-shadow: 0 4px 12px rgba(0,102,204,0.35);
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          width: 100%;
          background: transparent;
          color: #0066cc;
          border: 1.5px solid #0066cc;
          border-radius: 8px;
          padding: 9px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(0,102,204,0.06);
        }

        .label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
        }

        .input, .select, .textarea {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 12px;
          color: #1a1a2e;
          background: #fff;
          transition: border-color 0.15s;
          font-family: inherit;
          outline: none;
        }

        .input:focus, .select:focus, .textarea:focus {
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
        }

        .textarea {
          resize: vertical;
          min-height: 72px;
          line-height: 1.5;
        }

        .form-group {
          margin-bottom: 12px;
        }

        /* ── Status badges ── */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .badge-pass { background: #dcfce7; color: #166534; }
        .badge-warn { background: #fef9c3; color: #854d0e; }
        .badge-fail { background: #fee2e2; color: #991b1b; }
        .badge-info { background: #dbeafe; color: #1e40af; }

        /* ── Progress bar ── */
        .progress-wrap {
          background: #e5e7eb;
          border-radius: 4px;
          height: 4px;
          margin: 8px 0;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #0066cc, #0099ff);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-label {
          font-size: 10px;
          color: #6b7280;
          text-align: center;
          margin-top: 4px;
        }

        /* ── Score ring ── */
        .score-ring {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #0a1628, #1a2d5a);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 12px;
          color: white;
        }

        .score-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          flex-shrink: 0;
          position: relative;
        }

        .score-pass { background: rgba(34,197,94,0.25); color: #4ade80; border: 2px solid #4ade80; }
        .score-warn { background: rgba(234,179,8,0.25); color: #facc15; border: 2px solid #facc15; }
        .score-fail { background: rgba(239,68,68,0.25); color: #f87171; border: 2px solid #f87171; }

        .score-info h3 { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
        .score-info p  { font-size: 11px; color: rgba(255,255,255,0.55); }

        /* ── Finding item ── */
        .finding {
          border-left: 3px solid;
          padding: 10px 12px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 8px;
          background: white;
        }

        .finding-fail  { border-color: #ef4444; background: #fff5f5; }
        .finding-warn  { border-color: #f59e0b; background: #fffbeb; }
        .finding-pass  { border-color: #22c55e; background: #f0fdf4; }

        .finding-text  { font-size: 11px; color: #374151; line-height: 1.5; }
        .finding-name  { font-size: 11px; font-weight: 600; color: #1a1a2e; margin-bottom: 3px; }
        .finding-action {
          font-size: 10px;
          color: #6b7280;
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }

        .navigate-btn {
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          padding: 3px 8px;
          font-size: 10px;
          color: #6b7280;
          cursor: pointer;
          margin-top: 6px;
          transition: all 0.15s;
        }

        .navigate-btn:hover { border-color: #0066cc; color: #0066cc; }

        /* ── User card ── */
        .user-card {
          background: white;
          border: 1px solid #e8e8f0;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
        }

        .user-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0066cc, #0099ff);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .user-name { font-size: 12px; font-weight: 600; color: #1a1a2e; }
        .user-profile { font-size: 10px; color: #6b7280; }

        .user-feedback {
          font-size: 11px;
          color: #374151;
          line-height: 1.6;
          padding: 10px;
          background: #f8f9ff;
          border-radius: 8px;
          margin-bottom: 10px;
          border-left: 3px solid #0066cc;
          font-style: italic;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .tag {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .tag-pain { background: #fee2e2; color: #991b1b; }
        .tag-suggest { background: #dbeafe; color: #1e40af; }

        /* ── Empty state ── */
        .empty {
          text-align: center;
          padding: 32px 16px;
          color: #9ca3af;
        }

        .empty-icon { font-size: 32px; margin-bottom: 8px; }
        .empty-title { font-size: 13px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
        .empty-desc { font-size: 11px; line-height: 1.5; }

        /* ── Divider ── */
        .divider {
          height: 1px;
          background: #e8e8f0;
          margin: 14px 0;
        }

        /* ── Scrollable results ── */
        .results-scroll {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .results-scroll::-webkit-scrollbar { width: 4px; }
        .results-scroll::-webkit-scrollbar-track { background: transparent; }
        .results-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

        /* ── Criterion accordion ── */
        .criterion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: white;
          border: 1px solid #e8e8f0;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 4px;
          transition: background 0.1s;
        }

        .criterion-header:hover { background: #f8f9ff; }
        .criterion-header.open { border-radius: 8px 8px 0 0; border-bottom-color: transparent; }

        .criterion-body {
          background: white;
          border: 1px solid #e8e8f0;
          border-top: none;
          border-radius: 0 0 8px 8px;
          padding: 10px 12px;
          margin-bottom: 4px;
        }

        .criterion-left { display: flex; align-items: center; gap: 8px; }
        .criterion-name { font-size: 11px; font-weight: 600; color: #1a1a2e; }
        .criterion-score { font-size: 11px; font-weight: 700; }
        .score-green { color: #16a34a; }
        .score-yellow { color: #ca8a04; }
        .score-red { color: #dc2626; }

        .chevron { font-size: 10px; color: #9ca3af; transition: transform 0.15s; }
        .chevron.open { transform: rotate(180deg); }

        /* ── Copy issue ── */
        .issue-type-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .issue-ortografia  { background: #fee2e2; color: #991b1b; }
        .issue-semantica   { background: #fef3c7; color: #92400e; }
        .issue-tono        { background: #dbeafe; color: #1e40af; }
        .issue-optimizacion { background: #f3e8ff; color: #6b21a8; }
        .issue-redundancia { background: #fce7f3; color: #9d174d; }
        .issue-tecnicismo  { background: #d1fae5; color: #065f46; }
        .issue-consistencia { background: #ede9fe; color: #5b21b6; }
        .issue-voz_marca    { background: #fef3c7; color: #78350f; }

        /* ── DS issue badges ── */
        .issue-ds-broken_component   { background: #fee2e2; color: #991b1b; }
        .issue-ds-local_component    { background: #ffedd5; color: #9a3412; }
        .issue-ds-detached_component { background: #fef9c3; color: #854d0e; }
        .issue-ds-hardcoded_fill     { background: #fef9c3; color: #854d0e; }
        .issue-ds-hardcoded_text     { background: #fef9c3; color: #854d0e; }
        .issue-ds-visual_override    { background: #dbeafe; color: #1e40af; }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0,102,204,0.2);
          border-top-color: #0066cc;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        /* ── Copy frame header ── */
        .frame-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: linear-gradient(135deg, #0a1628, #1a2d5a);
          border-radius: 8px 8px 0 0;
          color: white;
        }

        .frame-result-body {
          background: white;
          border: 1px solid #e8e8f0;
          border-top: none;
          border-radius: 0 0 8px 8px;
          padding: 10px;
          margin-bottom: 10px;
        }
      `}</style>

      <div className="header">
        <div className="header-top">
          <div className="logo">✦</div>
          <div>
            <div className="header-title">Designer Buddy</div>
            <div className="header-subtitle">BCP · COE Diseño Estratégico</div>
          </div>
        </div>
        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="tab-content">
        {activeTab === 'docs'    && <DocsTab />}
        {activeTab === 'copy'    && <CopyTab />}
        {activeTab === 'users'   && <UsersTab />}
        {activeTab === 'handoff' && <HandoffTab />}
        {activeTab === 'ds'      && <DSTab />}
      </div>
    </>
  )
}

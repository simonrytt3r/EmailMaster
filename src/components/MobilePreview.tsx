'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MobilePreviewProps {
  subject: string;
  body: string;
  senderName?: string;
  onClose: () => void;
}

function getPreviewText(body: string): string {
  return body.replace(/\n+/g, ' ').trim().slice(0, 100);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function MobilePreviewContent({
  subject,
  body,
  senderName = 'Alex',
  onClose,
}: MobilePreviewProps) {
  const previewText = getPreviewText(body);
  const subjectLen = subject.length;
  const bodyWords = wordCount(body);
  const isSubjectLong = subjectLen > 40;
  const isBodyLong = bodyWords > 120;
  const subjectTruncated = subject.length > 40 ? subject.slice(0, 40) + '…' : subject;
  const previewTruncated = previewText.length > 85 ? previewText.slice(0, 85) + '…' : previewText;

  // Lock body scroll and handle Escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return (
    // Full-screen overlay — scrollable so tall content never clips
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Centre wrapper — min-h-full keeps it centred even when short */}
      <div className="min-h-full flex items-center justify-center py-8 px-4">
        {/* Modal panel — stop clicks bubbling to backdrop */}
        <div
          className="relative w-full max-w-[340px] flex flex-col items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="text-white font-semibold text-[17px]">Mobile Preview</h3>
              <p className="text-white/50 text-[12px] mt-0.5">How it looks in iOS Mail</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Inbox snippet ────────────────────────────────────────────── */}
          <div className="w-full rounded-[14px] border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              Inbox List View
            </p>
            <div className="bg-white mx-2 mb-2 rounded-[10px] px-3 py-2.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[14px] font-bold">{senderName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-gray-900">{senderName}</span>
                  <span className="text-[11px] text-gray-400">now</span>
                </div>
                <p className={`text-[13px] font-medium truncate ${isSubjectLong ? 'text-orange-500' : 'text-gray-800'}`}>
                  {subjectTruncated}
                </p>
                <p className="text-[12px] text-gray-400 truncate mt-0.5">{previewTruncated}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#007AFF] flex-shrink-0 mt-2" />
            </div>
            {(isSubjectLong || isBodyLong) && (
              <div className="px-3 pb-3 space-y-1">
                {isSubjectLong && (
                  <p className="text-[11px] text-amber-300">
                    ⚠ Subject is {subjectLen} chars — aim for ≤40 on mobile
                  </p>
                )}
                {isBodyLong && (
                  <p className="text-[11px] text-amber-300">
                    ⚠ Body is {bodyWords} words — most readers drop off after ~100
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Phone frame ──────────────────────────────────────────────── */}
          <div
            style={{
              width: '300px',
              flexShrink: 0,
              background: '#1C1C1E',
              borderRadius: '44px',
              padding: '10px',
              boxShadow: '0 0 0 1px #3A3A3C, 0 40px 80px rgba(0,0,0,0.8)',
            }}
          >
            {/* Screen */}
            <div
              style={{
                borderRadius: '36px',
                background: '#F2F2F7',
                height: '520px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Status bar */}
              <div style={{ background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 4px', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#000' }}>9:41</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                    <rect x="0" y="7" width="3" height="5" rx="1" fill="#000" />
                    <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" fill="#000" />
                    <rect x="9" y="2" width="3" height="10" rx="1" fill="#000" />
                    <rect x="13.5" y="0" width="3" height="12" rx="1" fill="#000" opacity="0.3" />
                  </svg>
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <circle cx="8" cy="11" r="1" fill="#000" />
                    <path d="M4.5 7.5C5.7 6.3 6.8 5.8 8 5.8s2.3.5 3.5 1.7" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M1.5 4.5C3.4 2.6 5.6 1.8 8 1.8s4.6.8 6.5 2.7" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '24px', height: '12px', borderRadius: '3px', border: '1px solid rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: '2px 4px 2px 2px', background: 'rgba(0,0,0,0.8)', borderRadius: '1px' }} />
                    </div>
                    <div style={{ width: '2px', height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '0 1px 1px 0' }} />
                  </div>
                </div>
              </div>

              {/* Nav bar */}
              <div style={{ background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}>
                <span style={{ color: '#007AFF', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Inbox
                </span>
                <span style={{ fontSize: '12px', color: '#8E8E93' }}>1 of 24</span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Email header */}
              <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#000', lineHeight: '1.3', marginBottom: '6px' }}>{subject}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{senderName.charAt(0).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#3C3C43' }}>{senderName} <span style={{ color: '#8E8E93' }}>to me</span></span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8E8E93' }}>now</span>
                </div>
              </div>

              {/* Email body — scrollable inside the phone */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
                <pre style={{ margin: 0, padding: '16px', fontSize: '14px', color: '#1C1C1E', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '1.55' }}>
                  {body}
                </pre>
              </div>

              {/* Bottom toolbar */}
              <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-around', padding: '10px 16px', flexShrink: 0 }}>
                {[
                  <svg key="a" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg>,
                  <svg key="b" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
                  <svg key="c" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H7.5l-1-1H5a2 2 0 00-2 2z" /></svg>,
                  <svg key="d" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
                  <svg key="e" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                ]}
              </div>
            </div>
          </div>

          {/* ── Stats row ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 text-[11px] text-white/40 pb-2">
            <span>{subjectLen} char subject</span>
            <span>·</span>
            <span>{bodyWords} word body</span>
            {!isSubjectLong && !isBodyLong && (
              <>
                <span>·</span>
                <span className="text-green-400">✓ Mobile-friendly</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap in a portal so it renders at document.body, escaping any parent
// CSS transform/filter that would break `fixed` positioning.
export default function MobilePreview(props: MobilePreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(<MobilePreviewContent {...props} />, document.body);
}

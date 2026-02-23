'use client';

import { useEffect } from 'react';

interface MobilePreviewProps {
  subject: string;
  body: string;
  senderName?: string;
  onClose: () => void;
}

// Derive the inbox preview text (first non-empty line of body, stripped of whitespace)
function getPreviewText(body: string): string {
  return body.replace(/\n+/g, ' ').trim().slice(0, 100);
}

// Count words
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export default function MobilePreview({
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* Backdrop close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Container */}
      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm">

        {/* Modal header */}
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-white font-semibold text-[17px]">Mobile Preview</h3>
            <p className="text-white/50 text-[12px] mt-0.5">How it looks on iOS Mail</p>
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

        {/* ── Inbox snippet ─────────────────────────────────────────────── */}
        <div className="w-full bg-white/8 rounded-[14px] border border-white/10 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1.5">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              Inbox List View
            </p>
          </div>

          {/* Simulated inbox row */}
          <div className="bg-white mx-2 mb-2 rounded-[10px] px-3 py-2.5 flex items-start gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[14px] font-bold">
                {senderName.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-gray-900 truncate">{senderName}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">now</span>
              </div>
              <p className={`text-[13px] font-medium truncate ${isSubjectLong ? 'text-orange-500' : 'text-gray-800'}`}>
                {subjectTruncated}
              </p>
              <p className="text-[12px] text-gray-400 truncate leading-snug mt-0.5">
                {previewTruncated}
              </p>
            </div>
            {/* Unread dot */}
            <div className="w-2 h-2 rounded-full bg-[#007AFF] flex-shrink-0 mt-2" />
          </div>

          {/* Warnings */}
          {(isSubjectLong || isBodyLong) && (
            <div className="px-3 pb-3 space-y-1.5">
              {isSubjectLong && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[13px]">⚠️</span>
                  <p className="text-[11px] text-amber-300 leading-snug">
                    Subject is {subjectLen} chars — may be cut off on some phones (aim for ≤40)
                  </p>
                </div>
              )}
              {isBodyLong && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[13px]">⚠️</span>
                  <p className="text-[11px] text-amber-300 leading-snug">
                    Body is {bodyWords} words — most mobile readers drop off after ~100 words
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Phone frame ───────────────────────────────────────────────── */}
        <div
          className="w-[300px] flex-shrink-0"
          style={{
            background: '#1C1C1E',
            borderRadius: '44px',
            padding: '10px',
            boxShadow: '0 0 0 1px #3A3A3C, 0 32px 64px rgba(0,0,0,0.7)',
          }}
        >
          {/* Screen */}
          <div
            className="overflow-hidden flex flex-col"
            style={{
              borderRadius: '36px',
              background: '#F2F2F7',
              height: '520px',
            }}
          >
            {/* Status bar */}
            <div
              className="flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0"
              style={{ background: '#FFFFFF' }}
            >
              <span className="text-[13px] font-bold text-gray-900">9:41</span>
              <div className="flex items-center gap-1">
                {/* Signal bars */}
                <svg className="w-4 h-3" viewBox="0 0 17 12" fill="none">
                  <rect x="0" y="7" width="3" height="5" rx="1" fill="#000" />
                  <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" fill="#000" />
                  <rect x="9" y="2" width="3" height="10" rx="1" fill="#000" />
                  <rect x="13.5" y="0" width="3" height="12" rx="1" fill="#000" opacity="0.3" />
                </svg>
                {/* Wifi */}
                <svg className="w-4 h-3" viewBox="0 0 16 12" fill="none">
                  <path d="M8 10.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="#000" />
                  <path d="M4.5 7.5C5.7 6.3 6.8 5.7 8 5.7s2.3.6 3.5 1.8" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1.5 4.5C3.4 2.6 5.6 1.7 8 1.7s4.6.9 6.5 2.8" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {/* Battery */}
                <div className="flex items-center gap-0.5">
                  <div className="w-6 h-3 rounded-[3px] border border-black/30 relative overflow-hidden">
                    <div className="absolute inset-0.5 right-1 bg-black/80 rounded-[1px]" />
                  </div>
                  <div className="w-0.5 h-1.5 bg-black/30 rounded-r-[1px]" />
                </div>
              </div>
            </div>

            {/* Email nav bar */}
            <div
              className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
              style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.12)' }}
            >
              <button className="text-[#007AFF] text-[15px] flex items-center gap-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Inbox</span>
              </button>
              <p className="text-[12px] text-gray-500">1 of 24</p>
              <div className="flex items-center gap-4">
                <svg className="w-4 h-4 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                <svg className="w-4 h-4 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Email header */}
            <div
              className="px-4 py-3 border-b flex-shrink-0"
              style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.08)' }}
            >
              <h2 className="text-[15px] font-bold text-gray-900 leading-snug">{subject}</h2>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">
                      {senderName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] font-medium text-gray-700">{senderName} </span>
                    <span className="text-[11px] text-gray-400">to me</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400">now</span>
              </div>
            </div>

            {/* Email body — scrollable */}
            <div className="flex-1 overflow-y-auto" style={{ background: '#FFFFFF' }}>
              <div className="px-4 py-4">
                <pre
                  className="whitespace-pre-wrap font-sans leading-relaxed"
                  style={{ fontSize: '14px', color: '#1C1C1E' }}
                >
                  {body}
                </pre>
              </div>
            </div>

            {/* Bottom toolbar */}
            <div
              className="flex items-center justify-around px-4 py-3 border-t flex-shrink-0"
              style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.08)' }}
            >
              {[
                // Archive
                <svg key="archive" className="w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                </svg>,
                // Move
                <svg key="move" className="w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>,
                // Flag
                <svg key="flag" className="w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H7.5l-1-1H5a2 2 0 00-2 2z" />
                </svg>,
                // Reply
                <svg key="reply" className="w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>,
                // Compose
                <svg key="compose" className="w-5 h-5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>,
              ]}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[11px] text-white/40">
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
  );
}

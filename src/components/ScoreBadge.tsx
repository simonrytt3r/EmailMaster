'use client';

import { useEffect, useState } from 'react';

function getScoreColor(pct: number): string {
  if (pct >= 0.8) return '#34C759';
  if (pct >= 0.6) return '#FF9500';
  return '#FF3B30';
}

interface RingProps {
  score: number;
  max: number;
  svgSize: number;
  radius: number;
  strokeWidth: number;
  fontSize: number;
  sublabel?: string;
}

function Ring({ score, max, svgSize, radius, strokeWidth, fontSize, sublabel }: RingProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, [score]);

  const pct = Math.min(Math.max(score / max, 0), 1);
  const color = getScoreColor(pct);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = animated ? circumference * (1 - pct) : circumference;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: svgSize, height: svgSize }}
    >
      {/* SVG ring */}
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          className="ring-track"
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </svg>

      {/* Center label */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span
          style={{
            fontSize,
            color,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score}
        </span>
        {sublabel && (
          <span
            style={{
              fontSize: Math.max(fontSize * 0.42, 9),
              color: '#8E8E93',
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Category score badge (0-10 scale) ────────────────────────────────────────
interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (size === 'sm') {
    return <Ring score={score} max={10} svgSize={44} radius={18} strokeWidth={3.5} fontSize={13} />;
  }
  if (size === 'lg') {
    return <Ring score={score} max={10} svgSize={64} radius={26} strokeWidth={5} fontSize={18} />;
  }
  return <Ring score={score} max={10} svgSize={52} radius={21} strokeWidth={4} fontSize={15} />;
}

// ─── Overall score badge (0-100 scale, large ring) ────────────────────────────
export function OverallScoreBadge({ score }: { score: number }) {
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Needs Work' : 'Weak';
  return (
    <Ring
      score={score}
      max={100}
      svgSize={120}
      radius={52}
      strokeWidth={8}
      fontSize={34}
      sublabel={label}
    />
  );
}

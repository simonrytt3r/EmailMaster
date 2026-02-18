interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number, max: number = 10): string {
  const pct = score / max;
  if (pct >= 0.8) return 'text-green-400 bg-green-400/10 border-green-400/30';
  if (pct >= 0.6) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
  return 'text-red-400 bg-red-400/10 border-red-400/30';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const sizeClass = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  }[size];

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-lg border flex items-center justify-center font-bold flex-shrink-0`}
    >
      {score}
    </div>
  );
}

export function OverallScoreBadge({ score }: { score: number }) {
  let colorClass = '';
  let label = '';

  if (score >= 80) {
    colorClass = 'text-green-400 border-green-400/40 bg-green-400/10';
    label = 'Strong';
  } else if (score >= 60) {
    colorClass = 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10';
    label = 'Needs Work';
  } else {
    colorClass = 'text-red-400 border-red-400/40 bg-red-400/10';
    label = 'Weak';
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-2xl border-2 ${colorClass}`}>
      <span className="text-4xl font-bold">{score}</span>
      <span className="text-xs font-medium opacity-80">/100</span>
      <span className="text-xs font-semibold mt-1 opacity-90">{label}</span>
    </div>
  );
}

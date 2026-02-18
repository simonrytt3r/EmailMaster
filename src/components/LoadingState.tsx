interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Analyzing your email...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      {/* iOS-style activity indicator */}
      <div className="relative w-12 h-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 left-[50%] w-[2px] h-[6px] rounded-full bg-ios-text-2 dark:bg-ios-text-2"
            style={{
              transformOrigin: '50% 24px',
              transform: `rotate(${i * 30}deg)`,
              opacity: (i + 1) / 12,
              animation: `spin 1s steps(12, end) infinite`,
              animationDelay: `${(i / 12) - 1}s`,
            }}
          />
        ))}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Message */}
      <div className="text-center">
        <p className="text-[15px] font-medium text-ios-text dark:text-white">{message}</p>
        <p className="text-[13px] text-ios-text-2 mt-1">Usually takes 10–20 seconds</p>
      </div>

      {/* Step pills */}
      <div className="flex gap-2 mt-1">
        {['Parsing email', 'Applying rubric', 'Generating insights'].map((step, i) => (
          <div
            key={step}
            className="px-3 py-1 rounded-full text-[12px] bg-ios-secondary dark:bg-ios-dark-secondary text-ios-text-2 animate-pulse"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

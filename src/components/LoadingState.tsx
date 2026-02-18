interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Analyzing your email...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800" />
        <div className="absolute inset-0 rounded-full border-4 border-turf-green border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">This usually takes 10-20 seconds</p>
      </div>
      <div className="flex gap-1 mt-2">
        {['Parsing email...', 'Applying rubric...', 'Generating insights...'].map((step, i) => (
          <div
            key={step}
            className="px-3 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

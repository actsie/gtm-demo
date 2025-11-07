import { useState } from 'react';

interface ErrorDisplayProps {
  error: {
    message: string;
    raw: string;
  };
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs underline hover:no-underline"
        >
          {showRaw ? 'Hide' : 'Show'} raw error
        </button>
      </div>

      {showRaw && (
        <pre className="mt-3 p-3 bg-red-200 dark:bg-red-950 rounded text-xs overflow-auto max-h-48">
          {error.raw}
        </pre>
      )}
    </div>
  );
}

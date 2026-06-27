'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-xl font-semibold text-slate-200">Something went wrong</h2>
      <p className="text-slate-400 text-sm max-w-md text-center">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Try again
      </button>
    </div>
  );
}

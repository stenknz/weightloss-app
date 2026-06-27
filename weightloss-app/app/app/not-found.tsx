import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-semibold text-slate-200">Page not found</h2>
      <p className="text-slate-400">The page you are looking for does not exist.</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Go to Dashboard
      </Link>
    </div>
  );
}

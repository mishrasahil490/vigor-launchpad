import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-2 text-center px-4">
      <p className="font-display text-5xl font-bold text-brand-600">404</p>
      <p className="text-ink-600 dark:text-ink-200">This page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-3">Back to Dashboard</Link>
    </div>
  );
}

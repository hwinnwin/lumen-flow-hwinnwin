export function SimpleSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

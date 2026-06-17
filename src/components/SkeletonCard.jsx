const SkeletonCard = () => (
  <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-5">
    <div className="flex items-start justify-between">
      <div className="h-9 w-12 animate-pulse rounded-md bg-white/8" />
      <div className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-white/8" />
    </div>
    <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
    <div className="mt-auto flex flex-col gap-1.5">
      <div className="h-5 w-20 animate-pulse rounded-full bg-white/5" />
      <div className="h-4 w-28 animate-pulse rounded bg-white/5" />
    </div>
  </div>
);

export default SkeletonCard;

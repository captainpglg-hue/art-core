export default function ArtCoreLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-64 rounded-2xl bg-white/5 mb-10" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[3/4] rounded-xl bg-white/5" />
            <div className="h-3 rounded bg-white/5 w-3/4" />
            <div className="h-2 rounded bg-white/5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

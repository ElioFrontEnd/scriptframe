/**
 * Shown while a signed-in page's data is being fetched on the server. Matching
 * the real layout's shapes keeps the transition from jumping.
 */
export default function Loading() {
  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="shimmer h-9 w-52 rounded-[8px]" />
          <div className="shimmer mt-3 h-4 w-28 rounded" />
        </div>
        <div className="shimmer h-11 w-36 rounded-[10px]" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="shimmer aspect-video w-full" />
            <div className="p-4">
              <div className="shimmer h-4 w-3/4 rounded" />
              <div className="shimmer mt-2.5 h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

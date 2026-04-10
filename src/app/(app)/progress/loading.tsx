export default function ProgressLoading() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-2 h-3 w-40 animate-pulse bg-surface-container-high" />
        <div className="h-10 w-56 animate-pulse bg-surface-container-high" />
      </section>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse bg-surface-container"
          />
        ))}
      </div>
      <div className="h-32 animate-pulse bg-surface-container-high" />
    </div>
  );
}

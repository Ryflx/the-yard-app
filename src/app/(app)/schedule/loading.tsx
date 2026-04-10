export default function ScheduleLoading() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-2 h-3 w-32 animate-pulse bg-surface-container-high" />
        <div className="h-10 w-48 animate-pulse bg-surface-container-high" />
      </section>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-20 animate-pulse bg-surface-container-high"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse bg-surface-container-high" />
      <div className="h-20 animate-pulse bg-surface-container-low" />
      <div className="h-20 animate-pulse bg-surface-container-low" />
    </div>
  );
}

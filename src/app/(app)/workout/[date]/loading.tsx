export default function WorkoutLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-3 w-20 animate-pulse bg-surface-container-high" />
      <div>
        <div className="h-10 w-64 animate-pulse bg-surface-container-high" />
        <div className="mt-2 h-[2px] w-12 bg-primary-container" />
      </div>
      <div className="h-32 animate-pulse bg-surface-container-high" />
      <div className="h-48 animate-pulse bg-surface-container-high" />
      <div className="h-48 animate-pulse bg-surface-container-high" />
    </div>
  );
}

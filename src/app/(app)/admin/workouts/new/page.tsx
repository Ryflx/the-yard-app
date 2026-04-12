import { WorkoutTextInput } from "@/components/workout-text-input";

export default function NewWorkoutPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-6 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
        ADD WORKOUT
      </h1>
      <WorkoutTextInput />
    </div>
  );
}

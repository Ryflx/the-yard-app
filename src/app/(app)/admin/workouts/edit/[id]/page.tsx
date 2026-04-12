import { getWorkoutById } from "@/app/actions";
import { notFound } from "next/navigation";
import { ParsedWorkoutEditor } from "@/components/parsed-workout-editor";
import type { ParsedSection } from "@/lib/workout-parser";
import type { ClassType, WodFormat, WodScoreType, WodMovement, SectionExercise } from "@/db/schema";

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await getWorkoutById(parseInt(id));
  if (!workout) return notFound();

  const sections: ParsedSection[] = workout.sections.map((s, i) => ({
    type: s.type,
    sortOrder: i,
    exercises: (s.exercises as SectionExercise[]) ?? [],
    sets: s.sets ?? undefined,
    liftName: s.liftName ?? undefined,
    wodFormat: (s.wodFormat as WodFormat) ?? undefined,
    wodScoreType: (s.wodScoreType as WodScoreType) ?? undefined,
    wodRounds: s.wodRounds ?? undefined,
    wodInterval: s.wodInterval ?? undefined,
    timeCap: s.timeCap ?? undefined,
    wodName: s.wodName ?? undefined,
    rxWeights: s.rxWeights ?? undefined,
    wodMovements: (s.wodMovements as WodMovement[]) ?? undefined,
    wodDescription: s.wodDescription ?? undefined,
  }));

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <ParsedWorkoutEditor
        classType={workout.classType as ClassType}
        title={workout.title}
        date={workout.date}
        sections={sections}
        editingWorkoutId={workout.id}
      />
    </div>
  );
}

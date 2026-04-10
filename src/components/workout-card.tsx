import Link from "next/link";
import { format, isToday, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkoutCardProps {
  workout: {
    id: number;
    date: string;
    title: string;
    sections: {
      type: string;
      liftName: string | null;
      exercises: { name: string }[];
    }[];
  };
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const date = parseISO(workout.date);
  const today = isToday(date);
  const olympicSection = workout.sections.find(
    (s) => s.type === "OLYMPIC LIFT"
  );

  return (
    <Link href={`/workout/${workout.date}`}>
      <Card
        className={cn(
          "transition-colors hover:border-primary/50",
          today && "border-primary"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{workout.title}</CardTitle>
            <div className="flex items-center gap-2">
              {today && (
                <Badge variant="default" className="text-xs">
                  Today
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {format(date, "d MMM")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {olympicSection?.liftName && (
            <p className="mb-2 text-sm font-medium text-primary">
              {olympicSection.liftName}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {workout.sections.map((section, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {section.type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

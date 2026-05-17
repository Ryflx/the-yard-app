import { getWeaknessSignals } from "@/app/actions";
import { db } from "@/db";
import { skillCourses } from "@/db/schema";
import { Wizard } from "@/components/programming/wizard";

export default async function NewProgrammingPage() {
  const [signals, courses] = await Promise.all([
    getWeaknessSignals(),
    db.select().from(skillCourses).orderBy(skillCourses.category, skillCourses.difficulty),
  ]);
  return <Wizard initialSignals={signals} courses={courses} />;
}

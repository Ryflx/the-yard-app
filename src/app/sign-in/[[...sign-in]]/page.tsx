import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <Link href="/" className="flex flex-col items-center gap-2">
        <span className="material-symbols-outlined text-4xl text-primary-container">
          fitness_center
        </span>
        <h1 className="font-headline text-xl font-black uppercase tracking-widest">
          THE YARD PECKHAM
        </h1>
      </Link>
      <SignIn />
    </div>
  );
}

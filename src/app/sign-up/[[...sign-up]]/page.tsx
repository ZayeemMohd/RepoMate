import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4 py-12">
      <div className="bg-blue/80 w-full max-w-md rounded-2xl p-6 shadow-xl backdrop-blur-sm dark:bg-slate-900/60 sm:p-8">
        <div className="mx-auto w-full">
          <SignUp />
        </div>
      </div>
    </div>
  );
}

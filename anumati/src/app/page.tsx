"use client";

import dynamic from "next/dynamic";

const LoginForm = dynamic(
  () => import("@/components/forms/login-form").then((mod) => ({ default: mod.LoginForm })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div> },
);

export default function LoginPortal() {
  return (
    <div className="flex h-screen w-full bg-white">
      {/* Left: Image (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop"
          alt="Modern campus architecture"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-8 left-8">
          <span className="text-2xl font-bold text-white drop-shadow-lg">Anumati</span>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 md:p-12 xl:p-24">
        <LoginForm />
      </div>
    </div>
  );
}

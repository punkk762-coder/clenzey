import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-base-200 lg:grid lg:grid-cols-2">
      {children}
    </div>
  );
}

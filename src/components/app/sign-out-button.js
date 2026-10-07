"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

export function SignOutButton({ className, label = "Log out" }) {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={cn(className)}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

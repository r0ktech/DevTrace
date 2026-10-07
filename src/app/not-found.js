import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="mt-1 max-w-sm text-sm text-fg-3">This page doesn&apos;t exist, or it belongs to an account you can&apos;t access.</p>
      <Button asChild variant="secondary" className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}

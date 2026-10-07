"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This page couldn't load its analytics"
      description="DevTrace couldn't read your data from the database. If this keeps happening, check that the database is reachable."
      action={
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
      }
    />
  );
}

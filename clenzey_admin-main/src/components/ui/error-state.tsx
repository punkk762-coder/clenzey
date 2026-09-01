"use client";

import { AlertTriangle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="p-8">
      <Alert
        variant="error"
        icon={AlertTriangle}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
        className="flex-col items-center text-center sm:flex-row sm:text-left"
      >
        {message}
      </Alert>
    </div>
  );
}

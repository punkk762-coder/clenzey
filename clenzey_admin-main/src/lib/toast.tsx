"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ToastType = "default" | "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (message: string, type: ToastType = "default") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="toast toast-end toast-bottom z-[100]">
        {toasts.map((t) => (
          <Alert
            key={t.id}
            variant={
              t.type === "success"
                ? "success"
                : t.type === "error"
                  ? "error"
                  : t.type === "warning"
                    ? "warning"
                    : t.type === "info"
                      ? "info"
                      : "default"
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-6 min-h-6 px-1"
                onClick={() => removeToast(t.id)}
              >
                ✕
              </Button>
            }
            className="shadow-lg"
          >
            {t.message}
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToastContext() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("toast() must be used within ToastProvider");
  return ctx;
}

function createToast(type: ToastType) {
  return (message: string) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("clenzey-toast", { detail: { message, type } }),
    );
  };
}

export const toast = Object.assign(
  (message: string) => createToast("default")(message),
  {
    success: createToast("success"),
    error: createToast("error"),
    warning: createToast("warning"),
    info: createToast("info"),
  },
);

export function ToastListener() {
  const { addToast } = useToastContext();

  React.useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      addToast(message, type);
    };
    window.addEventListener("clenzey-toast", handler);
    return () => window.removeEventListener("clenzey-toast", handler);
  }, [addToast]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/status-dot";
import { useAuth } from "@/lib/auth/context";
import { getApiErrorMessage } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === "authenticated") {
      router.replace("/overview");
    }
  }, [auth.status, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword) return;
    setSubmitting(true);
    try {
      await auth.login(trimmedUsername, trimmedPassword);
      toast.success("Welcome back");
      router.replace("/overview");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Invalid credentials."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="relative hidden flex-col justify-between bg-neutral px-12 py-10 text-neutral-content lg:flex">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold">Clenzey</span>
          <Badge variant="signal" size="sm" uppercase>
            Operations Terminal
          </Badge>
          <span className="ml-auto text-xs uppercase tracking-widest text-neutral-content/50">
            V 1.0 · Internal
          </span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-content/60">
              Operations Terminal
            </p>
            <h2 className="text-4xl font-bold leading-tight">
              Run the network with precision.
            </h2>
            <p className="max-w-sm text-base text-neutral-content/70">
              Live bookings, partner dispatch, geofence coverage and corporate
              quotations — managed from a single terminal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {["Live Bookings", "Online Partners", "Coverage Zones"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-lg border border-neutral-content/10 bg-neutral-content/5 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot variant="success" pulse />
                    <span className="text-xs uppercase tracking-widest text-neutral-content/70">
                      {label}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-neutral-content/40">
          <span>Clenzey · Bengaluru</span>
          <span>Secure Channel</span>
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mb-8 flex items-center lg:hidden">
          <span className="text-xl font-bold text-primary">Clenzey</span>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="space-y-3">
              <Badge variant="outline" size="sm" className="w-fit gap-1.5">
                <Lock className="h-3 w-3" />
                Whitelist-only Access
              </Badge>
              <div className="space-y-1">
                <CardTitle className="text-2xl">Sign in to Clenzey</CardTitle>
                <CardDescription>
                  Enter your admin credentials to access the operations terminal.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <fieldset className="fieldset gap-2 p-0">
                  <legend className="fieldset-legend text-xs uppercase tracking-widest">
                    Username
                  </legend>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={submitting}
                  />
                </fieldset>

                <fieldset className="fieldset gap-2 p-0">
                  <legend className="fieldset-legend text-xs uppercase tracking-widest">
                    Password
                  </legend>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </fieldset>

                <Button
                  type="submit"
                  disabled={submitting || !username.trim() || !password.trim()}
                  className="mt-1 w-full"
                >
                  {submitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      Sign in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="divider my-0" />
              <div className="flex items-center justify-between text-xs text-base-content/50">
                <span>© 2026 Clenzey Tech</span>
                <div className="flex gap-4">
                  <span className="link link-hover">Support</span>
                  <span className="link link-hover">Privacy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

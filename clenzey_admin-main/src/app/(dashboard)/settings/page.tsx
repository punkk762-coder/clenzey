"use client";

import { useQuery } from "@tanstack/react-query";
import { Link2, Loader2, UserRound } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusLabel } from "@/components/ui/status-dot";
import { healthApi } from "@/lib/api/health";
import { apiUrl } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { useSocketStatus } from "@/hooks/useSocketStatus";
import type { AdminRole } from "@/types";

const ROLE_LABEL: Record<AdminRole, string> = {
  OPERATIONS: "Operations",
  SUPPORT: "Support",
  FINANCE: "Finance",
  SUPER_ADMIN: "Super Admin",
};

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

function ConnectionStatus({
  connected,
  loading,
  error,
}: {
  connected: boolean;
  loading?: boolean;
  error?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-base-content/55">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking…
      </div>
    );
  }

  if (error) {
    return <StatusLabel variant="error">Unreachable</StatusLabel>;
  }

  return (
    <StatusLabel variant={connected ? "success" : "warning"} pulse={connected}>
      {connected ? "Connected" : "Disconnected"}
    </StatusLabel>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const socketConnected = useSocketStatus();

  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["health", "ready"],
    queryFn: () => healthApi.ready(),
    refetchInterval: 60_000,
    retry: 1,
  });

  const apiHealthy = health?.status === "ready";

  return (
    <PageStack>
      <PageHeader
        eyebrow="System · Settings"
        title="System Configurations"
        description="View your admin session and verify API connectivity."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Your admin session and role permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-base-content/55">Username</span>
              <span className="font-medium">{user?.username ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-base-content/55">Phone</span>
              <span className="font-mono">{user?.phone ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-base-content/55">Role</span>
              <Badge variant="signal" size="sm">
                {user?.role ? ROLE_LABEL[user.role] : "—"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-base-content/55">User ID</span>
              <span className="font-mono text-xs">{user?.id ?? "—"}</span>
            </div>
            <p className="border-t border-base-300 pt-3 text-xs text-base-content/45">
              Session tokens are issued via{" "}
              <span className="font-mono">/admin/auth/login</span> and refreshed
              through <span className="font-mono">/admin/auth/refresh</span>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <CardTitle>Connectivity</CardTitle>
            </div>
            <CardDescription>
              REST API health and realtime socket status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-base-300 bg-base-200/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">REST API</div>
                      <div className="truncate font-mono text-xs text-base-content/55">
                        {apiUrl}
                      </div>
                      {health && !healthError && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            variant={
                              health.checks?.database === "ok"
                                ? "success"
                                : "destructive"
                            }
                            size="xs"
                          >
                            Database {health.checks?.database ?? "—"}
                          </Badge>
                          <Badge
                            variant={
                              health.checks?.redis === "ok"
                                ? "success"
                                : "destructive"
                            }
                            size="xs"
                          >
                            Redis {health.checks?.redis ?? "—"}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <ConnectionStatus
                      connected={apiHealthy}
                      error={healthError}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-base-300 bg-base-200/50 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Realtime stream</div>
                    <div className="truncate font-mono text-xs text-base-content/55">
                      {SOCKET_URL}
                    </div>
                  </div>
                  <ConnectionStatus connected={socketConnected} />
                </div>

                {healthError && (
                  <Alert
                    variant="error"
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refetchHealth()}
                      >
                        Retry
                      </Button>
                    }
                  >
                    API health check failed
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageStack>
  );
}

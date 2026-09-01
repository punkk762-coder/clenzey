"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { RoleGate } from "@/components/auth/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/errors";
import { API_MAX_PAGE_SIZE } from "@/lib/api/params";
import { payrollApi } from "@/lib/api/payroll";
import { partnersApi } from "@/lib/api/partners";
import { dateShort, inr } from "@/lib/utils/format";
import type { Partner } from "@/types";

function partnerOptionLabel(partner: Partner): string {
  const name = partner.fullName?.trim() || "Unnamed partner";
  if (partner.phone) {
    return `${name} · ${partner.phone}`;
  }
  return name;
}

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [partnerId, setPartnerId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [attendancePeriod, setAttendancePeriod] = useState("");
  const [absentDays, setAbsentDays] = useState("0");

  const partnersQuery = useQuery({
    queryKey: ["partners", "payroll"],
    queryFn: () => partnersApi.list({ limit: API_MAX_PAGE_SIZE }),
  });

  const runsQuery = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: () => payrollApi.listRuns({ limit: 20, offset: 0 }),
  });

  const salaryQuery = useQuery({
    queryKey: ["partner-salary", partnerId],
    queryFn: () => payrollApi.getSalary(partnerId),
    enabled: !!partnerId,
  });

  useEffect(() => {
    if (!partnerId) {
      setSalaryAmount("");
      return;
    }
    if (salaryQuery.data?.monthlySalary != null) {
      setSalaryAmount(String(salaryQuery.data.monthlySalary));
    } else if (!salaryQuery.isLoading) {
      setSalaryAmount("");
    }
  }, [partnerId, salaryQuery.data, salaryQuery.isLoading]);

  const setSalaryMutation = useMutation({
    mutationFn: () =>
      payrollApi.setSalary(partnerId, {
        monthlySalary: Number.parseFloat(salaryAmount),
        isPayrollActive: true,
      }),
    onSuccess: () => {
      toast.success("Salary updated");
      queryClient.invalidateQueries({ queryKey: ["partner-salary", partnerId] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to update salary")),
  });

  const attendanceMutation = useMutation({
    mutationFn: () =>
      payrollApi.setAttendance(
        partnerId,
        attendancePeriod,
        Number.parseInt(absentDays, 10),
      ),
    onSuccess: () => toast.success("Attendance recorded"),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Failed to set attendance")),
  });

  const reprocessMutation = useMutation({
    mutationFn: ({ period, pid }: { period: string; pid: string }) =>
      payrollApi.reprocessRun(period, pid),
    onSuccess: () => {
      toast.success("Payroll reprocess queued");
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Reprocess failed")),
  });

  const runs = runsQuery.data?.runs ?? [];
  const partners = partnersQuery.data ?? [];
  const partnerNameById = useMemo(
    () =>
      new Map(
        partners.map((partner) => [
          partner.id,
          partner.fullName?.trim() || "Unnamed partner",
        ]),
      ),
    [partners],
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow="Finance · Payroll"
        title="Payroll"
        description="Manage partner salaries, attendance, and payroll run history."
      />

      <RoleGate allow="finance">
        <Card>
          <CardHeader>
            <CardTitle>Partner salary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partner-select">Partner</Label>
              {partnersQuery.isLoading ? (
                <p className="text-sm opacity-60">Loading partners…</p>
              ) : partnersQuery.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-error">Failed to load partners.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => partnersQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : partners.length === 0 ? (
                <p className="text-sm opacity-60">No partners available.</p>
              ) : (
                <Select
                  value={partnerId || undefined}
                  onValueChange={setPartnerId}
                >
                  <SelectTrigger id="partner-select">
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent disablePortal>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partnerOptionLabel(partner)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Monthly salary (INR)</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
              />
            </div>
            {salaryQuery.data && (
              <div className="md:col-span-2 text-sm opacity-70">
                Current:{" "}
                {salaryQuery.data.monthlySalary != null
                  ? inr(salaryQuery.data.monthlySalary)
                  : "Not set"}{" "}
                · Payroll{" "}
                {salaryQuery.data.isPayrollActive ? "active" : "inactive"}
              </div>
            )}
            <div className="md:col-span-2">
              <Button
                variant="signal"
                disabled={!partnerId || !salaryAmount || setSalaryMutation.isPending}
                onClick={() => setSalaryMutation.mutate()}
              >
                {setSalaryMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save salary
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="attendance-partner">Partner</Label>
              <Select
                value={partnerId || undefined}
                onValueChange={setPartnerId}
                disabled={partners.length === 0}
              >
                <SelectTrigger id="attendance-partner">
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent disablePortal>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partnerOptionLabel(partner)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-period">Period</Label>
              <MonthPicker
                id="attendance-period"
                value={attendancePeriod}
                onChange={setAttendancePeriod}
                placeholder="Select month"
              />
            </div>
            <div className="space-y-2">
              <Label>Absent days</Label>
              <Input
                type="number"
                min="0"
                value={absentDays}
                onChange={(e) => setAbsentDays(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                disabled={
                  !partnerId || !attendancePeriod || attendanceMutation.isPending
                }
                onClick={() => attendanceMutation.mutate()}
              >
                Record attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </RoleGate>

      <Card>
        <CardHeader>
          <CardTitle>Payroll runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin opacity-60" />
          ) : runsQuery.isError ? (
            <ErrorState
              message="Failed to load payroll runs"
              onRetry={() => runsQuery.refetch()}
            />
          ) : runs.length === 0 ? (
            <p className="text-sm opacity-60">No payroll runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono">{run.payrollPeriod}</TableCell>
                    <TableCell className="text-sm">
                      {partnerNameById.get(run.partnerId) ??
                        `${run.partnerId.slice(0, 8)}…`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          run.status === "PROCESSED"
                            ? "signal"
                            : run.status === "FAILED"
                              ? "destructive"
                              : "muted"
                        }
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.netAmount ? inr(Number.parseFloat(run.netAmount)) : "—"}
                    </TableCell>
                    <TableCell className="text-sm opacity-70">
                      {run.processedAt ? dateShort(run.processedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <RoleGate allow="finance">
                        {run.status === "FAILED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reprocessMutation.isPending}
                            onClick={() =>
                              reprocessMutation.mutate({
                                period: run.payrollPeriod,
                                pid: run.partnerId,
                              })
                            }
                          >
                            Reprocess
                          </Button>
                        )}
                      </RoleGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageStack>
  );
}

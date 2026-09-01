"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Wand2 } from "lucide-react";
import { toast } from "@/lib/toast";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField, FormFieldAction } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
import { PillTabs } from "@/components/ui/pill-tabs";
import { slotsApi } from "@/lib/api/slots";
import { getApiErrorMessage } from "@/lib/api/errors";
import { servicesApi } from "@/lib/api/services";
import { dateTime } from "@/lib/utils/format";

const SLOT_TABS = [
  { value: "generate", label: "Generate slots", icon: Wand2 },
  { value: "inventory", label: "Slot inventory", icon: CalendarClock },
] as const;

type SlotTab = (typeof SLOT_TABS)[number]["value"];

export default function SlotsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SlotTab>("generate");

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const [listFilter, setListFilter] = useState({
    serviceId: "",
    fromAt: "",
    toAt: "",
  });

  const [form, setForm] = useState({
    serviceId: "",
    fromDate: "",
    toDate: "",
    startHour: 8,
    endHour: 20,
    slotDurationMin: 60,
    capacity: 5,
  });

  const canList =
    !!listFilter.serviceId && !!listFilter.fromAt && !!listFilter.toAt;

  const {
    data: slots = [],
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsQueryError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ["slots", "admin", listFilter],
    queryFn: () =>
      slotsApi.listAdmin({
        serviceId: listFilter.serviceId,
        fromAt: listFilter.fromAt,
        toAt: listFilter.toAt,
      }),
    enabled: canList,
  });

  const generate = useMutation({
    mutationFn: () => slotsApi.generate(form),
    onSuccess: (res) => {
      const generated = res.data.data?.generated ?? 0;
      const skipped = res.data.data?.skipped ?? 0;
      toast.success(
        `${generated} slot${generated === 1 ? "" : "s"} generated (${skipped} skipped)`,
      );
      setListFilter({
        serviceId: form.serviceId,
        fromAt: form.fromDate,
        toAt: form.toDate,
      });
      setTab("inventory");
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't generate slots")),
  });

  const updateCapacity = useMutation({
    mutationFn: ({ slotId, capacity }: { slotId: string; capacity: number }) =>
      slotsApi.updateCapacity(slotId, capacity),
    onSuccess: () => {
      toast.success("Slot capacity updated");
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Couldn't update capacity")),
  });

  const sortedSlots = useMemo(
    () =>
      [...slots].sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    [slots],
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow="Operations · Scheduling"
        title="Time Slots Management"
        description="Generate scheduled-booking windows and manage slot capacity from the admin API."
      />

      <div className="card admin-shell-card bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-6 py-4">
          <PillTabs
            value={tab}
            onChange={setTab}
            options={SLOT_TABS}
            ariaLabel="Time slots views"
          />
        </div>

        <div className="p-6">
          {tab === "generate" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (form.endHour <= form.startHour) {
                  toast.error("End hour must be after start hour");
                  return;
                }
                if (form.toDate < form.fromDate) {
                  toast.error("To date must be on or after from date");
                  return;
                }
                generate.mutate();
              }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <FormField label="Service">
                  <Select
                    value={form.serviceId}
                    onValueChange={(v) => setForm({ ...form, serviceId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="From date">
                  <DatePicker
                    value={form.fromDate}
                    onChange={(fromDate) => setForm({ ...form, fromDate })}
                    placeholder="From date"
                    max={form.toDate || undefined}
                  />
                </FormField>
                <FormField label="To date">
                  <DatePicker
                    value={form.toDate}
                    onChange={(toDate) => setForm({ ...form, toDate })}
                    placeholder="To date"
                    min={form.fromDate || undefined}
                  />
                </FormField>
                <FormField label="Capacity per slot">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: parseInt(e.target.value, 10) })
                    }
                  />
                </FormField>
                <FormField label="Start hour">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={form.startHour}
                    onChange={(e) =>
                      setForm({ ...form, startHour: parseInt(e.target.value, 10) })
                    }
                  />
                </FormField>
                <FormField label="End hour">
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={form.endHour}
                    onChange={(e) =>
                      setForm({ ...form, endHour: parseInt(e.target.value, 10) })
                    }
                  />
                </FormField>
                <FormField label="Slot length (min)">
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    value={form.slotDurationMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slotDurationMin: parseInt(e.target.value, 10),
                      })
                    }
                  />
                </FormField>
                <FormFieldAction>
                  <Button
                    type="submit"
                    variant="signal"
                    disabled={
                      generate.isPending ||
                      !form.serviceId ||
                      !form.fromDate ||
                      !form.toDate
                    }
                    className="w-full"
                  >
                    <Wand2 className="h-4 w-4" />
                    {generate.isPending ? "Generating…" : "Generate slots"}
                  </Button>
                </FormFieldAction>
              </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <FormField label="Service">
                  <Select
                    value={listFilter.serviceId}
                    onValueChange={(v) =>
                      setListFilter({ ...listFilter, serviceId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="From date">
                  <DatePicker
                    value={listFilter.fromAt}
                    onChange={(fromAt) =>
                      setListFilter({ ...listFilter, fromAt })
                    }
                    placeholder="From date"
                    max={listFilter.toAt || undefined}
                  />
                </FormField>
                <FormField label="To date">
                  <DatePicker
                    value={listFilter.toAt}
                    onChange={(toAt) => setListFilter({ ...listFilter, toAt })}
                    placeholder="To date"
                    min={listFilter.fromAt || undefined}
                  />
                </FormField>
                <FormFieldAction>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!canList}
                    onClick={() => refetchSlots()}
                  >
                    Load slots
                  </Button>
                </FormFieldAction>
              </div>

              {!canList && (
                <p className="text-sm opacity-60">
                  Select a service and date range to load slots.
                </p>
              )}

              {canList && slotsLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin opacity-60" />
                </div>
              )}

              {canList && slotsError && (
                <div className="py-8 text-center">
                  <p className="text-sm text-error">
                    {getApiErrorMessage(slotsQueryError, "Failed to load slots")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => refetchSlots()}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {canList && !slotsLoading && !slotsError && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Update</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSlots.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center opacity-60">
                            No slots in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedSlots.map((slot) => (
                          <SlotRow
                            key={slot.id}
                            slot={slot}
                            onUpdate={(capacity) =>
                              updateCapacity.mutate({ slotId: slot.id, capacity })
                            }
                            updating={
                              updateCapacity.isPending &&
                              updateCapacity.variables?.slotId === slot.id
                            }
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-6">
          <p className="flex items-start gap-2 text-sm opacity-60">
            <CalendarClock className="mt-0.5 h-4 w-4 text-primary shrink-0" />
            Slots are unique by service and start time. Re-running the generator
            only fills gaps. Capacity cannot be set below the current reservation
            count.
          </p>
        </div>
      </div>
    </PageStack>
  );
}

function SlotRow({
  slot,
  onUpdate,
  updating,
}: {
  slot: {
    id: string;
    startAt: string;
    endAt: string;
    reservedCount: number;
    capacity: number;
    isActive: boolean;
  };
  onUpdate: (capacity: number) => void;
  updating: boolean;
}) {
  const [capacity, setCapacity] = useState(String(slot.capacity));

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{dateTime(slot.startAt)}</TableCell>
      <TableCell className="font-mono text-xs">{dateTime(slot.endAt)}</TableCell>
      <TableCell>{slot.reservedCount}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={slot.reservedCount}
          compact
          className="w-20"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </TableCell>
      <TableCell>{slot.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="outline"
          disabled={updating || Number(capacity) < slot.reservedCount}
          onClick={() => onUpdate(parseInt(capacity, 10))}
        >
          {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

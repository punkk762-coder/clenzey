"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Ticket } from "lucide-react";
import { toast } from "@/lib/toast";

import { CouponForm } from "@/components/coupons/CouponForm";
import type { CouponFormValues } from "@/components/coupons/CouponForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageStack } from "@/components/layout/PageStack";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { couponsApi } from "@/lib/api/coupons";
import { getApiErrorMessage } from "@/lib/api/errors";
import { dateShort, inr } from "@/lib/utils/format";
import type { Coupon } from "@/types";

function normalizeDiscountType(
  type: string | undefined,
): "PERCENTAGE" | "FLAT" {
  const upper = (type ?? "PERCENTAGE").toUpperCase();
  if (upper === "FLAT" || upper === "FIXED" || upper === "FIXED_AMOUNT") {
    return "FLAT";
  }
  return "PERCENTAGE";
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : "";
}

export default function CouponsPage() {
  const [tab, setTab] = useState<"ALL" | "ACTIVE">("ACTIVE");
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["coupons", tab],
    queryFn: () => couponsApi.list(tab === "ACTIVE"),
  });

  const createMutation = useMutation({
    mutationFn: (data: CouponFormValues) =>
      couponsApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created successfully");
      handleCloseForm();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create coupon"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CouponFormValues) =>
      couponsApi.update(
        editingCoupon!.id,
        data as unknown as Record<string, unknown>
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon updated successfully");
      handleCloseForm();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update coupon"));
    },
  });

  function handleCloseForm() {
    setShowForm(false);
    setEditingCoupon(null);
  }

  function handleNewCoupon() {
    setEditingCoupon(null);
    setShowForm(true);
  }

  function handleEditCoupon(coupon: Coupon) {
    setEditingCoupon(coupon);
    setShowForm(true);
  }

  function handleSubmit(data: CouponFormValues) {
    if (editingCoupon) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  // Convert Coupon to CouponFormValues for pre-filling the form
  function couponToFormValues(coupon: Coupon): Partial<CouponFormValues> {
    return {
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: normalizeDiscountType(coupon.discountType),
      discountValue: parseFloat(coupon.discountValue),
      minOrderAmount: parseFloat(coupon.minOrderAmount),
      maxDiscountAmount: coupon.maxDiscountAmount
        ? parseFloat(coupon.maxDiscountAmount)
        : undefined,
      usageLimit: coupon.usageLimit ?? undefined,
      perUserLimit: coupon.perUserLimit ?? undefined,
      validFrom: toDateInputValue(coupon.validFrom),
      validUntil: toDateInputValue(coupon.validUntil),
      firstBookingOnly: coupon.firstBookingOnly,
      applicableServiceIds: coupon.applicableServiceIds ?? [],
    };
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Catalogue · Promotions"
        title="Coupons"
        description="Percentage and flat discounts with usage limits, eligibility windows, and category restrictions."
        actions={
          <Button variant="signal" size="sm" onClick={handleNewCoupon}>
            <Plus className="h-4 w-4" />
            New coupon
          </Button>
        }
      />

      {/* Tab switcher above the table */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "ACTIVE" | "ALL")}>
        <TabsList>
          <TabsTrigger value="ACTIVE">Active</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Coupons table with Data_Table styling */}
      <DataTableWrapper
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && coupons.length === 0}
        columns={7}
        emptyMessage="No coupons yet"
        onRetry={() => refetch()}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4">Code</TableHead>
              <TableHead className="px-6 py-4">Discount</TableHead>
              <TableHead className="px-6 py-4">Min order</TableHead>
              <TableHead className="px-6 py-4">Usage</TableHead>
              <TableHead className="px-6 py-4">Valid until</TableHead>
              <TableHead className="px-6 py-4">Status</TableHead>
              <TableHead className="w-10 px-6 py-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold tracking-tight">
                      {c.code}
                    </span>
                  </div>
                  {c.description && (
                    <div className="mt-1 text-xs opacity-60">
                      {c.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="num text-sm font-semibold">
                    {c.discountType === "PERCENTAGE"
                      ? `${parseFloat(c.discountValue)}%`
                      : inr(c.discountValue)}
                  </span>
                  {c.maxDiscountAmount && (
                    <div className="num text-xs opacity-60">
                      max {inr(c.maxDiscountAmount)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="num text-xs">
                    {inr(c.minOrderAmount)}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="num text-xs">
                    {c.usageCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </span>
                </TableCell>
                <TableCell className="min-w-[7rem] whitespace-nowrap px-6 py-4">
                  <span className="text-xs">
                    {c.validUntil ? dateShort(c.validUntil) : "No expiry"}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={c.isActive ? "success" : "muted"}>
                    {c.isActive ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditCoupon(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit {c.code}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {/* Create / Edit coupon sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <SheetContent className="flex h-full max-h-screen w-full flex-col overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-base-300 px-6 pb-4 pt-8">
            <SheetTitle>
              {editingCoupon ? "Edit Coupon" : "New Coupon"}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <CouponForm
              key={editingCoupon?.id ?? "new"}
              defaultValues={
                editingCoupon ? couponToFormValues(editingCoupon) : undefined
              }
              onSubmit={handleSubmit}
              isSubmitting={
                createMutation.isPending || updateMutation.isPending
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </PageStack>
  );
}

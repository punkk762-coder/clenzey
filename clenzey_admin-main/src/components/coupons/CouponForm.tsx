"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { servicesApi } from "@/lib/api/services";

// --- Zod Schema ---

export const couponFormSchema = z
  .object({
    code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
    description: z.string().max(200, "Description must be 200 characters or less").optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FLAT"], {
      required_error: "Discount type is required",
    }),
    discountValue: z.coerce
      .number({ invalid_type_error: "Must be a number" })
      .positive("Discount value must be greater than 0"),
    minOrderAmount: z.coerce
      .number({ invalid_type_error: "Must be a number" })
      .min(0, "Minimum order amount cannot be negative"),
    maxDiscountAmount: z.coerce
      .number({ invalid_type_error: "Must be a number" })
      .positive("Max discount must be greater than 0")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    usageLimit: z.coerce
      .number({ invalid_type_error: "Must be a number" })
      .int("Must be a whole number")
      .min(1, "Usage limit must be at least 1")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    perUserLimit: z.coerce
      .number({ invalid_type_error: "Must be a number" })
      .int("Must be a whole number")
      .min(1, "Per-user limit must be at least 1")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    validFrom: z.string().optional().or(z.literal("")),
    validUntil: z.string().optional().or(z.literal("")),
    firstBookingOnly: z.boolean().default(false),
    applicableServiceIds: z.array(z.string()).default([]),
  })
  .refine(
    (data) => data.discountType !== "PERCENTAGE" || data.discountValue <= 100,
    { message: "Percentage discount cannot exceed 100%", path: ["discountValue"] }
  )
  .refine(
    (data) => {
      if (!data.validFrom || !data.validUntil) return true;
      return new Date(data.validUntil) >= new Date(data.validFrom);
    },
    { message: "End date must be on or after start date", path: ["validUntil"] }
  );

export type CouponFormValues = z.infer<typeof couponFormSchema>;

// --- Props ---

type CouponFormProps = {
  defaultValues?: Partial<CouponFormValues>;
  onSubmit: (data: CouponFormValues) => void;
  isSubmitting?: boolean;
};

// --- Component ---

export function CouponForm({ defaultValues, onSubmit, isSubmitting }: CouponFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "PERCENTAGE",
      discountValue: undefined as unknown as number,
      minOrderAmount: 0,
      maxDiscountAmount: undefined,
      usageLimit: undefined,
      perUserLimit: undefined,
      validFrom: "",
      validUntil: "",
      firstBookingOnly: false,
      applicableServiceIds: [],
      ...defaultValues,
    },
  });

  // Reset form when defaultValues changes (e.g., switching to edit mode)
  useEffect(() => {
    if (defaultValues) {
      reset({
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: undefined as unknown as number,
        minOrderAmount: 0,
        maxDiscountAmount: undefined,
        usageLimit: undefined,
        perUserLimit: undefined,
        validFrom: "",
        validUntil: "",
        firstBookingOnly: false,
        applicableServiceIds: [],
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  // Fetch services for multi-select
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const selectedServiceIds = watch("applicableServiceIds");
  const validFrom = watch("validFrom");
  const validUntil = watch("validUntil");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-8">
      {/* Code */}
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          placeholder="e.g. WELCOME20"
          {...register("code")}
          aria-invalid={!!errors.code}
        />
        {errors.code && (
          <p className="text-xs text-error">{errors.code.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Optional description"
          {...register("description")}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-xs text-error">{errors.description.message}</p>
        )}
      </div>

      {/* Discount Type & Value (side by side) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Discount Type</Label>
          <Controller
            control={control}
            name="discountType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={!!errors.discountType}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FLAT">Flat</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.discountType && (
            <p className="text-xs text-error">{errors.discountType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="discountValue">Discount Value</Label>
          <Input
            id="discountValue"
            type="number"
            step="any"
            placeholder="e.g. 20"
            {...register("discountValue")}
            aria-invalid={!!errors.discountValue}
          />
          {errors.discountValue && (
            <p className="text-xs text-error">{errors.discountValue.message}</p>
          )}
        </div>
      </div>

      {/* Min Order Amount & Max Discount Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minOrderAmount">Min Order Amount</Label>
          <Input
            id="minOrderAmount"
            type="number"
            step="any"
            placeholder="0"
            {...register("minOrderAmount")}
            aria-invalid={!!errors.minOrderAmount}
          />
          {errors.minOrderAmount && (
            <p className="text-xs text-error">{errors.minOrderAmount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxDiscountAmount">Max Discount Amount</Label>
          <Input
            id="maxDiscountAmount"
            type="number"
            step="any"
            placeholder="Optional"
            {...register("maxDiscountAmount")}
            aria-invalid={!!errors.maxDiscountAmount}
          />
          {errors.maxDiscountAmount && (
            <p className="text-xs text-error">{errors.maxDiscountAmount.message}</p>
          )}
        </div>
      </div>

      {/* Usage Limit & Per-User Limit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usageLimit">Usage Limit</Label>
          <Input
            id="usageLimit"
            type="number"
            step="1"
            placeholder="Optional"
            {...register("usageLimit")}
            aria-invalid={!!errors.usageLimit}
          />
          {errors.usageLimit && (
            <p className="text-xs text-error">{errors.usageLimit.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="perUserLimit">Per-User Limit</Label>
          <Input
            id="perUserLimit"
            type="number"
            step="1"
            placeholder="Optional"
            {...register("perUserLimit")}
            aria-invalid={!!errors.perUserLimit}
          />
          {errors.perUserLimit && (
            <p className="text-xs text-error">{errors.perUserLimit.message}</p>
          )}
        </div>
      </div>

      {/* Validity Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="validFrom">Valid From</Label>
          <Controller
            control={control}
            name="validFrom"
            render={({ field }) => (
              <DatePicker
                id="validFrom"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Valid from"
                max={validUntil || undefined}
                aria-invalid={!!errors.validFrom}
                className={cn(errors.validFrom && "input-error")}
              />
            )}
          />
          {errors.validFrom && (
            <p className="text-xs text-error">{errors.validFrom.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="validUntil">Valid Until</Label>
          <Controller
            control={control}
            name="validUntil"
            render={({ field }) => (
              <DatePicker
                id="validUntil"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Valid until"
                min={validFrom || undefined}
                aria-invalid={!!errors.validUntil}
                className={cn(errors.validUntil && "input-error")}
              />
            )}
          />
          {errors.validUntil && (
            <p className="text-xs text-error">{errors.validUntil.message}</p>
          )}
        </div>
      </div>

      {/* First Booking Only Toggle */}
      <div className="flex items-center justify-between rounded-box border border-base-300 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="firstBookingOnly">First Booking Only</Label>
          <p className="text-xs opacity-60">
            Restrict this coupon to first-time bookings
          </p>
        </div>
        <Controller
          control={control}
          name="firstBookingOnly"
          render={({ field }) => (
            <Switch
              id="firstBookingOnly"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Applicable Services Multi-Select */}
      <div className="space-y-2">
        <Label>Applicable Services</Label>
        <p className="text-xs opacity-60">
          Leave empty to apply to all services
        </p>
        <Controller
          control={control}
          name="applicableServiceIds"
          render={({ field }) => (
            <div className="flex min-h-[42px] flex-wrap gap-2 rounded-box border border-base-300 p-3">
              {services.map((service) => {
                const isSelected = field.value.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        field.onChange(field.value.filter((id) => id !== service.id));
                      } else {
                        field.onChange([...field.value, service.id]);
                      }
                    }}
                  >
                    <Badge variant={isSelected ? "signal" : "muted"}>
                      {service.name}
                    </Badge>
                  </button>
                );
              })}
              {services.length === 0 && (
                <span className="text-xs opacity-60">
                  No services available
                </span>
              )}
            </div>
          )}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="signal"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving…" : defaultValues ? "Update Coupon" : "Create Coupon"}
      </Button>
    </form>
  );
}

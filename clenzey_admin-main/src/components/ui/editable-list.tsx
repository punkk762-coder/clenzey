"use client";

import * as React from "react";
import { Pencil, Trash2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const rowSurface =
  "group rounded-lg border border-base-300/70 bg-base-100 shadow-sm transition-all duration-150 hover:border-primary/20 hover:shadow-md";

type EditableListProps = React.HTMLAttributes<HTMLDivElement> & {
  emptyMessage?: string;
  isEmpty?: boolean;
};

export function EditableList({
  className,
  children,
  emptyMessage,
  isEmpty,
  ...props
}: EditableListProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {isEmpty && emptyMessage ? (
        <EditableListEmpty message={emptyMessage} />
      ) : (
        children
      )}
    </div>
  );
}

export function EditableListEmpty({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-base-300/80 bg-base-200/30 px-4 py-6 text-center text-sm text-base-content/55",
        className,
      )}
    >
      {message}
    </div>
  );
}

type EditableListItemProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

export function EditableListItem({
  title,
  description,
  icon: Icon,
  iconClassName,
  onRemove,
  removeLabel = "Remove item",
  className,
}: EditableListItemProps) {
  return (
    <div className={cn(rowSurface, "flex items-start gap-3 px-3 py-2.5", className)}>
      {Icon ? (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-sm font-medium leading-snug text-base-content">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs leading-relaxed text-base-content/60">
            {description}
          </div>
        ) : null}
      </div>
      {onRemove ? (
        <EditableListRemoveButton
          onClick={onRemove}
          label={removeLabel}
        />
      ) : null}
    </div>
  );
}

type EditableListRowProps = {
  children: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  className?: string;
  align?: "start" | "center";
};

export function EditableListRow({
  children,
  onRemove,
  removeLabel = "Remove item",
  onEdit,
  editLabel = "Edit item",
  className,
  align = "start",
}: EditableListRowProps) {
  return (
    <div
      className={cn(
        rowSurface,
        "flex gap-3 px-3 py-3",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {(onEdit || onRemove) && (
        <EditableListActions>
          {onEdit ? (
            <EditableListActionButton
              icon={Pencil}
              onClick={onEdit}
              label={editLabel}
            />
          ) : null}
          {onRemove ? (
            <EditableListRemoveButton
              onClick={onRemove}
              label={removeLabel}
            />
          ) : null}
        </EditableListActions>
      )}
    </div>
  );
}

export function EditableListActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {children}
    </div>
  );
}

export function EditableListActionButton({
  icon: Icon,
  onClick,
  label,
  className,
}: {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-base-content/45 transition-colors hover:bg-base-200 hover:text-base-content",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function EditableListRemoveButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <EditableListActionButton
      icon={Trash2}
      onClick={onClick}
      label={label ?? "Remove item"}
      className={cn(
        "hover:bg-error/10 hover:text-error",
        className,
      )}
    />
  );
}

export function EditableListAddPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-base-300/80 bg-base-200/20 p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SelectableList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

export function SelectableListItem({
  selected = false,
  onSelect,
  children,
  className,
}: {
  selected?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        rowSurface,
        "flex w-full items-center gap-3 px-3 py-2.5 text-left",
        selected && "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-md",
        className,
      )}
    >
      {children}
    </button>
  );
}

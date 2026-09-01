import { cn } from "@/lib/utils/cn";

/** Shared corner radius for every form control and inline action button. */
export const formRadiusClass = "!rounded-lg";

/** Shared single-line control styles for inputs, selects, and date pickers. */
export const formControlClass = cn(
  "input input-bordered input-sm",
  formRadiusClass,
  "h-9 min-h-9 w-full bg-base-100 px-3 text-sm leading-normal",
  "focus:outline-none focus:ring-0",
);

/** Compact control for dense table/toolbar layouts. */
export const formControlCompactClass = cn(
  "input input-bordered input-xs",
  formRadiusClass,
  "h-8 min-h-8 w-full bg-base-100 px-2.5 text-xs leading-normal",
  "focus:outline-none focus:ring-0",
);

export const textareaControlClass = cn(
  "textarea textarea-bordered textarea-sm",
  formRadiusClass,
  "min-h-[88px] w-full bg-base-100 px-3 py-2 text-sm leading-relaxed resize-y",
  "focus:outline-none focus:ring-0",
);

export const formLabelClass = "block text-sm font-medium leading-none opacity-80";

export const formFieldClass = "flex flex-col gap-2";

export const formErrorClass = "text-xs text-error";

/** Match `formControlClass` height and radius on row action buttons. */
export const formActionButtonClass = cn(
  "btn-sm h-9 min-h-9 py-0 leading-none",
  formRadiusClass,
);

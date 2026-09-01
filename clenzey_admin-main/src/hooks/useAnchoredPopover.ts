"use client";

import { useEffect, type RefObject } from "react";

type ToggleEvent = Event & {
  newState: "open" | "closed";
};

function positionPopover(
  trigger: HTMLElement,
  popover: HTMLElement,
): void {
  const rect = trigger.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const gap = 4;
  const viewportPadding = 8;

  let top = rect.bottom + gap;
  let left = rect.left;

  if (top + popoverRect.height > window.innerHeight - viewportPadding) {
    top = Math.max(viewportPadding, rect.top - popoverRect.height - gap);
  }

  if (left + popoverRect.width > window.innerWidth - viewportPadding) {
    left = Math.max(
      viewportPadding,
      window.innerWidth - popoverRect.width - viewportPadding,
    );
  }

  popover.style.position = "fixed";
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.margin = "0";
}

export function useAnchoredPopover(
  triggerRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger || !popover.matches(":popover-open")) return;
      positionPopover(trigger, popover);
    };

    const handleToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === "open") {
        requestAnimationFrame(() => {
          updatePosition();
          requestAnimationFrame(updatePosition);
        });
      }
    };

    popover.addEventListener("toggle", handleToggle);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      popover.removeEventListener("toggle", handleToggle);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [triggerRef, popoverRef]);
}

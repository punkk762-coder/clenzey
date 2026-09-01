import type { DetailedHTMLProps, HTMLAttributes } from "react";

type CalendarDateElement = HTMLElement & { value: string };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "calendar-date": DetailedHTMLProps<
        HTMLAttributes<CalendarDateElement> & {
          value?: string;
          min?: string;
          max?: string;
          locale?: string;
        },
        CalendarDateElement
      >;
      "calendar-month": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export {};

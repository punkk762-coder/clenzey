import { bookingStatusEnum } from "../../../db/schema/enums.ts";

export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type ActorType = "ADMIN" | "CONSUMER" | "PARTNER" | "SYSTEM";

type Transition = {
  allowedActors: ActorType[];
  from: BookingStatus;
  to: BookingStatus;
};

const TRANSITIONS: Transition[] = [
  { allowedActors: ["SYSTEM"], from: "PENDING", to: "PAYMENT_PENDING" },
  { allowedActors: ["SYSTEM"], from: "PENDING", to: "CONFIRMED" },
  {
    allowedActors: ["CONSUMER", "ADMIN", "SYSTEM"],
    from: "PENDING",
    to: "CANCELLED",
  },

  { allowedActors: ["SYSTEM"], from: "PAYMENT_PENDING", to: "CONFIRMED" },
  {
    allowedActors: ["CONSUMER", "ADMIN", "SYSTEM"],
    from: "PAYMENT_PENDING",
    to: "CANCELLED",
  },

  {
    allowedActors: ["SYSTEM", "ADMIN"],
    from: "CONFIRMED",
    to: "PROFESSIONAL_ASSIGNED",
  },
  {
    allowedActors: ["SYSTEM", "ADMIN"],
    from: "PROFESSIONAL_ASSIGNED",
    to: "CONFIRMED",
  },
  {
    allowedActors: ["CONSUMER", "ADMIN", "SYSTEM"],
    from: "CONFIRMED",
    to: "CANCELLED",
  },

  {
    allowedActors: ["PARTNER", "ADMIN"],
    from: "PROFESSIONAL_ASSIGNED",
    to: "PROFESSIONAL_EN_ROUTE",
  },
  {
    allowedActors: ["CONSUMER", "PARTNER", "ADMIN"],
    from: "PROFESSIONAL_ASSIGNED",
    to: "CANCELLED",
  },
  {
    allowedActors: ["PARTNER", "ADMIN"],
    from: "PROFESSIONAL_ASSIGNED",
    to: "NO_SHOW",
  },

  {
    allowedActors: ["PARTNER", "ADMIN"],
    from: "PROFESSIONAL_EN_ROUTE",
    to: "CHECKED_IN",
  },
  {
    allowedActors: ["ADMIN"],
    from: "PROFESSIONAL_EN_ROUTE",
    to: "IN_PROGRESS",
  },
  {
    allowedActors: ["CONSUMER", "PARTNER", "ADMIN"],
    from: "PROFESSIONAL_EN_ROUTE",
    to: "CANCELLED",
  },
  {
    allowedActors: ["PARTNER", "ADMIN"],
    from: "PROFESSIONAL_EN_ROUTE",
    to: "NO_SHOW",
  },

  {
    allowedActors: ["PARTNER", "ADMIN"],
    from: "CHECKED_IN",
    to: "IN_PROGRESS",
  },
  { allowedActors: ["ADMIN"], from: "CHECKED_IN", to: "CANCELLED" },
  { allowedActors: ["PARTNER", "ADMIN"], from: "CHECKED_IN", to: "NO_SHOW" },

  {
    allowedActors: ["PARTNER", "ADMIN"],
    from: "IN_PROGRESS",
    to: "COMPLETED",
  },
  { allowedActors: ["ADMIN"], from: "IN_PROGRESS", to: "CANCELLED" },

  { allowedActors: ["SYSTEM", "ADMIN"], from: "CANCELLED", to: "REFUNDED" },
  { allowedActors: ["SYSTEM", "ADMIN"], from: "COMPLETED", to: "REFUNDED" },
  { allowedActors: ["SYSTEM", "ADMIN"], from: "NO_SHOW", to: "REFUNDED" },
];

const TERMINAL_STATES: BookingStatus[] = ["REFUNDED"];

export const isTerminal = (status: BookingStatus): boolean =>
  TERMINAL_STATES.includes(status);

export const canTransition = (
  from: BookingStatus,
  to: BookingStatus,
  actor: ActorType,
): boolean => {
  return TRANSITIONS.some(
    (t) =>
      t.from === from && t.to === to && t.allowedActors.includes(actor),
  );
};

export const validTransitionsFrom = (
  from: BookingStatus,
): BookingStatus[] => {
  return [...new Set(TRANSITIONS.filter((t) => t.from === from).map((t) => t.to))];
};

export const validTransitionsFromForActor = (
  from: BookingStatus,
  actor: ActorType,
): BookingStatus[] => {
  return [
    ...new Set(
      TRANSITIONS.filter(
        (t) => t.from === from && t.allowedActors.includes(actor),
      ).map((t) => t.to),
    ),
  ];
};

export const isCancellableByConsumer = (status: BookingStatus): boolean =>
  canTransition(status, "CANCELLED", "CONSUMER");

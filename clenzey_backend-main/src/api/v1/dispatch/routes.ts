import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireOperationsAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as dispatchController from "./controllers.ts";
import * as dispatchValidation from "./validations.ts";

const dispatchAdminRoutes: Router = express.Router();

dispatchAdminRoutes.get(
  "/dispatch/jobs/failed",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, dispatchValidation.listFailedJobsRequest],
  dispatchController.listFailedJobs,
);

dispatchAdminRoutes.post(
  "/dispatch/jobs/:queueName/:jobId/retry",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, dispatchValidation.retryFailedJobRequest],
  dispatchController.retryFailedJob,
);

dispatchAdminRoutes.get(
  "/dispatch/escalated",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  dispatchController.listEscalatedBookings,
);

dispatchAdminRoutes.post(
  "/dispatch/bookings/:bookingId/instant",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, dispatchValidation.bookingDispatchRequest],
  dispatchController.triggerInstantDispatch,
);

dispatchAdminRoutes.post(
  "/dispatch/bookings/:bookingId/redispatch",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, dispatchValidation.redispatchRequest],
  dispatchController.triggerRedispatch,
);

dispatchAdminRoutes.post(
  "/dispatch/bookings/:bookingId/scheduled-assign",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, dispatchValidation.bookingDispatchRequest],
  dispatchController.triggerScheduledAssign,
);

dispatchAdminRoutes.post(
  "/dispatch/bookings/:bookingId/revalidate",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, dispatchValidation.bookingDispatchRequest],
  dispatchController.triggerRevalidate,
);

dispatchAdminRoutes.post(
  "/dispatch/scheduled-batch/run",
  [requireAuth(["ADMIN"]), requireOperationsAdmin],
  dispatchController.triggerScheduledBatch,
);

export default dispatchAdminRoutes;

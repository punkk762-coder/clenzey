import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import * as notificationsController from "./controllers.ts";
import * as notificationsValidation from "./validations.ts";

const notificationsRoutes: Router = express.Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags:
 *       - notifications
 *     summary: List own notifications (paginated, filter by read/unread)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by read/unread status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Paginated notifications list
 *       401:
 *         description: Unauthorized
 */
notificationsRoutes.get(
  "/unread-count",
  [requireAuth(["CONSUMER", "PARTNER", "ADMIN"])],
  notificationsController.getUnreadCount,
);

notificationsRoutes.get(
  "/",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    notificationsValidation.listNotificationsRequest,
  ],
  notificationsController.listNotifications,
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags:
 *       - notifications
 *     summary: Mark a single notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
notificationsRoutes.patch(
  "/:id/read",
  [
    requireAuth(["CONSUMER", "PARTNER", "ADMIN"]),
    notificationsValidation.validateNotificationIdParam,
  ],
  notificationsController.markAsRead,
);

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     tags:
 *       - notifications
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
notificationsRoutes.post(
  "/read-all",
  [requireAuth(["CONSUMER", "PARTNER", "ADMIN"])],
  notificationsController.markAllAsRead,
);

export default notificationsRoutes;

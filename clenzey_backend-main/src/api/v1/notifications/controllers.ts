import type { RequestHandler } from "express";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as notificationsService from "./service.ts";

/**
 * List notifications for the authenticated user with pagination and optional read/unread filter.
 */
export const listNotifications: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const { isRead, limit, offset } = (
    req as unknown as {
      validatedQuery: { isRead?: boolean; limit?: number; offset?: number };
    }
  ).validatedQuery;

  const result = await notificationsService.listNotifications(userId, {
    ...(isRead !== undefined && { isRead }),
    ...(limit !== undefined && { limit }),
    ...(offset !== undefined && { offset }),
  });

  return sendResponse(res, { data: result });
});

/**
 * Mark a single notification as read.
 */
export const markAsRead: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const notificationId = req.params["id"] as string;
  const notification = await notificationsService.markAsRead(notificationId, userId);

  return sendResponse(res, { data: { notification } });
});

/**
 * Mark all notifications as read for the authenticated user.
 */
export const markAllAsRead: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const result = await notificationsService.markAllAsRead(userId);

  return sendResponse(res, { data: result });
});

export const getUnreadCount: RequestHandler = tryCatchUtil(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError();

  const unreadCount = await notificationsService.getUnreadCount(userId);

  return sendResponse(res, { data: { unreadCount } });
});

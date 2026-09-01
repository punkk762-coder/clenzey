import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as skillsService from "./service.ts";

const MAX_PAGINATION_LIMIT = 100;

const parsePagination = (query: Record<string, unknown>) => {
  const opts: { limit?: number; offset?: number } = {};
  if (query["limit"]) {
    const limit = parseInt(String(query["limit"]), 10);
    opts.limit = Math.min(Math.max(limit, 1), MAX_PAGINATION_LIMIT);
  }
  if (query["offset"]) {
    opts.offset = Math.max(parseInt(String(query["offset"]), 10), 0);
  }
  return opts;
};

// ─── Admin Controllers ────────────────────────────────────────────

/**
 * POST /admin/partners/:id/skills
 * Assign service skills to a partner.
 */
export const assignSkills: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const { serviceIds } = req.body as { serviceIds: string[] };
  const skills = await skillsService.assignSkills(partnerId, serviceIds);
  return sendResponse(res, {
    data: { skills },
    statusCode: HttpStatusCode.Created,
  });
});

/**
 * DELETE /admin/partners/:id/skills/:serviceId
 * Remove a skill assignment from a partner.
 */
export const removeSkill: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const serviceId = req.params["serviceId"] as string;
  await skillsService.removeSkill(partnerId, serviceId);
  return sendResponse(res, { data: { partnerId, serviceId } });
});

/**
 * GET /admin/partners/by-skill/:serviceId
 * List all partners with a specific service skill.
 */
export const listPartnersBySkill: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const serviceId = req.params["serviceId"] as string;
    const opts = parsePagination(req.query as Record<string, unknown>);
    const result = await skillsService.listPartnersBySkill(serviceId, opts);
    return sendResponse(res, { data: result });
  },
);

// ─── Partner Controllers ──────────────────────────────────────────

/**
 * GET /partners/skills
 * Get the authenticated partner's own skills.
 */
export const getMySkills: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.user!.sub;
  const skills = await skillsService.getPartnerSkills(partnerId);
  return sendResponse(res, { data: { skills } });
});

import express, { type Router } from "express";

import { requireAuth } from "../../../middlewares/authMiddleware.ts";
import { requireOperationsAdmin } from "../../../middlewares/requireAdminRoleMiddleware.ts";
import * as skillsController from "./controllers.ts";
import * as skillsValidation from "./validations.ts";

// ─── Admin Skills Routes ──────────────────────────────────────────

const adminSkillsRoutes: Router = express.Router();

/**
 * @openapi
 * /admin/partners/{id}/skills:
 *   post:
 *     tags:
 *       - admin-skills
 *     summary: Assign service skills to a partner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceIds]
 *             properties:
 *               serviceIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: Skills assigned
 *       404:
 *         description: Partner or service not found
 *       422:
 *         description: Validation error
 */
adminSkillsRoutes.post(
  "/partners/:id/skills",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, skillsValidation.assignSkillsRequest],
  skillsController.assignSkills,
);

/**
 * @openapi
 * /admin/partners/{id}/skills/{serviceId}:
 *   delete:
 *     tags:
 *       - admin-skills
 *     summary: Remove a skill assignment from a partner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: serviceId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Skill removed
 */
adminSkillsRoutes.delete(
  "/partners/:id/skills/:serviceId",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, skillsValidation.removeSkillRequest],
  skillsController.removeSkill,
);

/**
 * @openapi
 * /admin/partners/by-skill/{serviceId}:
 *   get:
 *     tags:
 *       - admin-skills
 *     summary: List all partners with a specific service skill
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: serviceId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list of partners with the skill
 */
adminSkillsRoutes.get(
  "/partners/by-skill/:serviceId",
  [requireAuth(["ADMIN"]), requireOperationsAdmin, skillsValidation.listPartnersBySkillRequest],
  skillsController.listPartnersBySkill,
);

// ─── Partner Skills Routes ────────────────────────────────────────

const partnerSkillsRoutes: Router = express.Router();

/**
 * @openapi
 * /partners/skills:
 *   get:
 *     tags:
 *       - partner-skills
 *     summary: View own assigned skills/services
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of partner's assigned skills
 */
partnerSkillsRoutes.get(
  "/skills",
  [requireAuth(["PARTNER"])],
  skillsController.getMySkills,
);

export { adminSkillsRoutes, partnerSkillsRoutes };

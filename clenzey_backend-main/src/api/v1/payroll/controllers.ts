import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { UnauthorizedError } from "../../../errors/appErrors.ts";
import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as incentiveService from "../incentive/service.ts";
import * as payrollService from "./service.ts";

export const getPartnerSalary: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const salary = await payrollService.getPartnerSalary(partnerId);
  return sendResponse(res, { data: { salary } });
});

export const setPartnerSalary: RequestHandler = tryCatchUtil(async (req, res) => {
  const partnerId = req.params["id"] as string;
  const body = req.body as {
    isPayrollActive?: boolean;
    monthlySalary: number;
    salaryEffectiveFrom?: string;
  };

  const partner = await payrollService.setPartnerSalary(partnerId, body);
  return sendResponse(res, { data: { partner } });
});

export const setPartnerAttendance: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.params["id"] as string;
    const period = req.params["period"] as string;
    const { absentDays } = req.body as { absentDays: number };

    const attendance = await payrollService.setPartnerAttendance({
      absentDays,
      partnerId,
      period,
      source: "ADMIN",
    });

    return sendResponse(res, { data: { attendance } });
  },
);

export const listPayrollRuns: RequestHandler = tryCatchUtil(async (req, res) => {
  const filters = (
    req as unknown as {
      validatedQuery: {
        limit?: number;
        offset?: number;
        partnerId?: string;
        payrollPeriod?: string;
        status?: "PENDING" | "PROCESSED" | "FAILED";
      };
    }
  ).validatedQuery;

  const result = await payrollService.listPayrollRuns(filters);
  return sendResponse(res, { data: result });
});

export const reprocessPayrollRun: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const payrollPeriod = req.params["period"] as string;
    const { partnerId } = req.body as { partnerId: string };

    const run = await payrollService.reprocessPayroll({
      partnerId,
      payrollPeriod,
    });

    return sendResponse(res, { data: { run } });
  },
);

export const createIncentiveConfig: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const config = await incentiveService.createConfig(req.body);
    return sendResponse(res, {
      data: { config },
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const updateIncentiveConfig: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const configId = req.params["id"] as string;
    const config = await incentiveService.updateConfig(configId, req.body);
    return sendResponse(res, { data: { config } });
  },
);

export const listIncentiveConfigs: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const filters = (
      req as unknown as {
        validatedQuery: {
          activeOnly?: boolean;
          limit?: number;
          offset?: number;
        };
      }
    ).validatedQuery;

    const configs = await incentiveService.listConfigs(filters);
    return sendResponse(res, { data: { configs } });
  },
);

export const getTotalIncentives: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { from, to } = (
      req as unknown as { validatedQuery: { from: string; to: string } }
    ).validatedQuery;

    const { getTotalIncentives: getTotal } = await import("../earnings/service.ts");
    const totalIncentives = await getTotal(from, to);
    return sendResponse(res, { data: { totalIncentives } });
  },
);

export const setInternalPartnerAttendance: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.params["id"] as string;
    const period = req.params["period"] as string;
    const { absentDays } = req.body as { absentDays: number };

    const attendance = await payrollService.setPartnerAttendance({
      absentDays,
      partnerId,
      period,
      source: "ATTENDANCE_SYSTEM",
    });

    return sendResponse(res, { data: { attendance } });
  },
);

export const getPartnerPayrollBreakdown: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const partnerId = req.user?.sub;
    if (!partnerId) throw new UnauthorizedError();

    const period = req.params["period"] as string;
    const { getPayrollBreakdown } = await import("../earnings/service.ts");
    const breakdown = await getPayrollBreakdown(partnerId, period);

    return sendResponse(res, { data: { breakdown, period } });
  },
);

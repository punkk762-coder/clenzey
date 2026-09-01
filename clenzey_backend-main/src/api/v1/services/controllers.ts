import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import type { QuotationRecord } from "./repository.ts";
import * as servicesService from "./service.ts";

export const listServices: RequestHandler = tryCatchUtil(async (_req, res) => {
  const services = await servicesService.listServices();
  return sendResponse(res, { data: { services } });
});

export const getServiceDetail: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const serviceId = req.params["serviceId"] as string;
    const service = await servicesService.getServiceDetail(serviceId);
    return sendResponse(res, { data: { service } });
  },
);

export const getEstimate: RequestHandler = tryCatchUtil(async (req, res) => {
  const serviceId = req.params["serviceId"] as string;
  const { addonIds, variantId } = req.body;
  const estimate = await servicesService.calculateEstimate(
    serviceId,
    variantId,
    addonIds,
  );
  return sendResponse(res, { data: { estimate } });
});

export const getLargeOfficeEstimate: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const serviceId = req.params["serviceId"] as string;
    const { scope, variantId } = req.body;
    const estimate = await servicesService.calculateLargeOfficeEstimate(
      serviceId,
      variantId,
      scope,
    );
    return sendResponse(res, { data: { estimate } });
  },
);

export const createQuotationRequest: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const { address, name, notes, phone, preferredTime, serviceId, variantId } =
      req.body;

    const consumerId = req.user?.sub;

    const quotation = await servicesService.submitQuotationRequest({
      address,
      ...(consumerId !== undefined && { consumerId }),
      name,
      notes,
      phone,
      preferredTime,
      serviceId,
      variantId,
    });

    return sendResponse(res, {
      data: { id: quotation.id },
      message: "Quotation request submitted successfully.",
      statusCode: HttpStatusCode.Created,
    });
  },
);

export const listAdminQuotations: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const rawStatus = req.query["status"];
    const rawLimit = req.query["limit"];
    const rawOffset = req.query["offset"];
    const status = typeof rawStatus === "string" ? (rawStatus as QuotationRecord["status"]) : undefined;
    const parsedLimit =
      typeof rawLimit === "string" ? parseInt(rawLimit, 10) : undefined;
    const parsedOffset =
      typeof rawOffset === "string" ? parseInt(rawOffset, 10) : undefined;
    const limit =
      parsedLimit !== undefined
        ? Math.min(Math.max(parsedLimit, 1), 100)
        : undefined;
    const offset =
      parsedOffset !== undefined ? Math.max(parsedOffset, 0) : undefined;
    const quotations = await servicesService.listQuotations({
      ...(status !== undefined && { status }),
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    });
    return sendResponse(res, { data: { quotations } });
  },
);

export const updateAdminQuotationStatus: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const id = req.params["id"] as string;
    const status = req.body.status as QuotationRecord["status"];
    const quotedAmount = typeof req.body.quotedAmount === "number" ? req.body.quotedAmount : undefined;
    const quotation = await servicesService.patchQuotationStatus(id, status, quotedAmount);
    return sendResponse(res, { data: { quotation } });
  },
);

export const listConsumerQuotations: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user?.sub;
    if (!consumerId) return sendResponse(res, { data: { quotations: [] } });
    const quotations = await servicesService.listQuotations({ consumerId });
    return sendResponse(res, { data: { quotations } });
  },
);

export const deleteConsumerQuotation: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const id = req.params["id"] as string;
    const consumerId = req.user?.sub;
    if (!consumerId) {
      return sendResponse(res, { data: {}, message: "Unauthorized.", statusCode: 401 });
    }
    const deleted = await servicesService.deleteQuotation(id, consumerId);
    if (!deleted) {
      return sendResponse(res, { data: {}, message: "Request not found or cannot be deleted once a quote has been sent.", statusCode: 404 });
    }
    return sendResponse(res, { data: {}, message: "Site visit request deleted." });
  },
);

export const acceptConsumerQuotation: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const id = req.params["id"] as string;
    const consumerId = req.user?.sub;
    if (!consumerId) {
      return sendResponse(res, { data: {}, message: "Unauthorized.", statusCode: 401 });
    }
    const quotation = await servicesService.acceptQuotation(id, consumerId);
    if (!quotation) {
      return sendResponse(res, { data: {}, message: "Quotation not found or not in QUOTED state.", statusCode: 404 });
    }
    return sendResponse(res, { data: { quotation } });
  },
);

export const createService: RequestHandler = tryCatchUtil(async (req, res) => {
  const service = await servicesService.createService(req.body);
  return sendResponse(res, {
    data: { service },
    statusCode: HttpStatusCode.Created,
  });
});

export const updateService: RequestHandler = tryCatchUtil(async (req, res) => {
  const serviceId = req.params["serviceId"] as string;
  const service = await servicesService.updateService(serviceId, req.body);
  return sendResponse(res, { data: { service } });
});

export const deleteService: RequestHandler = tryCatchUtil(async (req, res) => {
  const serviceId = req.params["serviceId"] as string;
  await servicesService.deleteService(serviceId);
  return sendResponse(res, { message: "Service deleted." });
});

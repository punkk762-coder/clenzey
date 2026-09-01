import type { RequestHandler } from "express";

import { HttpStatusCode } from "axios";

import { sendResponse, tryCatchUtil } from "../../../utilities/commonUtils.ts";
import * as addressesService from "./service.ts";

export const createAddress: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user!.sub;
  const address = await addressesService.createAddress(consumerId, req.body);
  return sendResponse(res, {
    data: { address },
    statusCode: HttpStatusCode.Created,
  });
});

export const listAddresses: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user!.sub;
  const addresses = await addressesService.listAddresses(consumerId);
  return sendResponse(res, { data: { addresses } });
});

export const getAddress: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user!.sub;
  const addressId = req.params["addressId"] as string;
  const address = await addressesService.getAddress(consumerId, addressId);
  return sendResponse(res, { data: { address } });
});

export const getDefaultAddress: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user!.sub;
    const address = await addressesService.getDefaultAddress(consumerId);
    return sendResponse(res, { data: { address } });
  },
);

export const updateAddress: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user!.sub;
  const addressId = req.params["addressId"] as string;
  const address = await addressesService.updateAddress(
    consumerId,
    addressId,
    req.body,
  );
  return sendResponse(res, { data: { address } });
});

export const deleteAddress: RequestHandler = tryCatchUtil(async (req, res) => {
  const consumerId = req.user!.sub;
  const addressId = req.params["addressId"] as string;
  await addressesService.deleteAddress(consumerId, addressId);
  return sendResponse(res, { data: { id: addressId } });
});

export const setDefaultAddress: RequestHandler = tryCatchUtil(
  async (req, res) => {
    const consumerId = req.user!.sub;
    const addressId = req.params["addressId"] as string;
    const address = await addressesService.setDefaultAddress(
      consumerId,
      addressId,
    );
    return sendResponse(res, { data: { address } });
  },
);

import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js/mobile";

import logger from "../configs/loggerConfig.ts";

export const phoneNumberValidator = (value: unknown) => {
  if (typeof value !== "string") {
    return;
  }
  const phone = parsePhoneNumber(value);
  logger.debug(phone);
  const result =
    phone.country === "IN" &&
    phone.countryCallingCode === "91" &&
    isValidPhoneNumber(value) &&
    phone.getType() === "MOBILE";
  return result;
};

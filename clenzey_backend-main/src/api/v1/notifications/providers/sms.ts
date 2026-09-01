import axios from "axios";

import { getMsg91Config } from "../../../../configs/msg91Config.ts";
import { formatPhoneForMsg91 } from "../../../../utilities/phoneUtils.ts";
import logger from "../../../../configs/loggerConfig.ts";

import { withRetry } from "./retry.ts";

const MSG91_SMS_URL = "https://control.msg91.com/api/v5/flow/";

export type SmsResult = {
  sid: string;
};

interface Msg91SmsResponse {
  type: string;
  message: string;
  request_id?: string;
}

/**
 * Sends a flow-based SMS via MSG91 with retry logic (3 attempts, exponential backoff).
 *
 * @param phone - The recipient phone number (any format — will be normalized to digits-only)
 * @param body - The SMS message body (unused with flow API, kept for backward compat)
 * @param templateVariables - Optional template variables to include in the flow request
 * @returns The MSG91 request_id as `sid` for backward compatibility
 */
export const sendSms = async (
  phone: string,
  body: string,
  templateVariables?: Record<string, string>,
): Promise<SmsResult> => {
  let config;
  try {
    config = getMsg91Config();
  } catch {
    logger.warning(
      "MSG91_AUTH_KEY not configured. Skipping SMS send.",
    );
    return { sid: "" };
  }

  const mobile = formatPhoneForMsg91(phone);

  const recipient: Record<string, string> = { mobiles: mobile };
  if (templateVariables) {
    Object.assign(recipient, templateVariables);
  }

  return withRetry(
    async () => {
      const response = await axios.post<Msg91SmsResponse>(
        MSG91_SMS_URL,
        {
          flow_id: config.smsFlowId,
          recipients: [recipient],
        },
        {
          headers: {
            authkey: config.authKey,
            "Content-Type": "application/json",
          },
        },
      );

      logger.info(`SMS sent successfully to ${phone}`, {
        requestId: response.data.request_id,
      });

      return { sid: response.data.request_id ?? "" };
    },
    3,
    1000,
  );
};

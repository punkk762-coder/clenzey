import { envConfig } from "./environmentConfig.ts";

export interface Msg91Config {
  authKey: string;
  smsFlowId: string;
}

function createMsg91Config(): Msg91Config | null {
  const authKey = envConfig.MSG91_AUTH_KEY;

  if (!authKey) {
    return null;
  }

  return {
    authKey,
    smsFlowId: envConfig.MSG91_SMS_FLOW_ID ?? "",
  };
}

const _msg91Config = createMsg91Config();

/**
 * Returns MSG91 config. Throws at call time if MSG91_AUTH_KEY is not set.
 * SMS flow ID may be empty if only auth key is configured.
 */
export function getMsg91Config(): Msg91Config {
  if (!_msg91Config) {
    throw new Error(
      "MSG91 is not configured. Set MSG91_AUTH_KEY environment variable.",
    );
  }
  return _msg91Config;
}

import { check, sleep } from "k6";
import http from "k6/http";

import { API_PREFIX, defaultOptions } from "./config.js";

const CONSUMER_EMAIL = __ENV.CONSUMER_EMAIL || "priya.consumer@clenzey.test";
const CONSUMER_PASSWORD = __ENV.CONSUMER_PASSWORD || "Test@1234";

export const options = {
  ...defaultOptions,
  scenarios: {
    auth_signin: {
      duration: "1m",
      executor: "constant-arrival-rate",
      maxVUs: 60,
      preAllocatedVUs: 30,
      rate: 20,
      timeUnit: "1s",
    },
  },
  thresholds: {
    ...defaultOptions.thresholds,
    "http_req_duration{scenario:auth_signin}": ["p(95)<1200"],
  },
};

export default function authFlowLoad() {
  const signIn = http.post(
    `${API_PREFIX}/consumers/auth/signin`,
    JSON.stringify({
      identifier: CONSUMER_EMAIL,
      password: CONSUMER_PASSWORD,
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  check(signIn, {
    "signin 200": (r) => r.status === 200,
    "signin returns token": (r) => {
      try {
        return Boolean(JSON.parse(r.body).data.accessToken);
      } catch {
        return false;
      }
    },
  });

  if (signIn.status === 200) {
    const token = JSON.parse(signIn.body).data.accessToken;
    const profile = http.get(`${API_PREFIX}/consumers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(profile, {
      "profile 200": (r) => r.status === 200,
    });
  }

  sleep(0.3);
}

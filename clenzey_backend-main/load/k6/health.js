import { check, sleep } from "k6";
import http from "k6/http";

import { API_PREFIX, defaultOptions } from "./config.js";

export const options = {
  ...defaultOptions,
  scenarios: {
    health_smoke: {
      duration: "30s",
      executor: "constant-vus",
      vus: 10,
    },
  },
};

export default function healthLoad() {
  const live = http.get(`${API_PREFIX}/health/live`);
  check(live, {
    "live body has status ok": (r) => JSON.parse(r.body).data.status === "ok",
    "live status 200": (r) => r.status === 200,
  });

  const ready = http.get(`${API_PREFIX}/health/ready`);
  check(ready, {
    "ready status 200 or 503": (r) => r.status === 200 || r.status === 503,
  });

  sleep(0.2);
}

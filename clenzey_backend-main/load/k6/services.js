import { check, sleep } from "k6";
import http from "k6/http";

import { API_PREFIX, defaultOptions } from "./config.js";

export const options = {
  ...defaultOptions,
  scenarios: {
    catalog_read: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      startVUs: 0,
    },
  },
};

export default function servicesLoad() {
  const list = http.get(`${API_PREFIX}/services`);
  check(list, {
    "services list 200": (r) => r.status === 200,
    "services non-empty": (r) => JSON.parse(r.body).data.services.length > 0,
  });

  const body = JSON.parse(list.body);
  const first = body.data?.services?.[0];
  if (first?.id) {
    const detail = http.get(`${API_PREFIX}/services/${first.id}`);
    check(detail, {
      "service detail 200": (r) => r.status === 200,
    });
  }

  sleep(0.5);
}

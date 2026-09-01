import { createLogger, format, transports } from "winston";

import { envConfig } from "./environmentConfig.ts";

const { combine, colorize, json, prettyPrint, splat, timestamp } = format;

const logLevels = {
  debug: 4,
  error: 0,
  http: 3,
  info: 2,
  warning: 1,
};

const devFormat = combine(
  format.errors({ stack: true }),
  splat(),
  timestamp(),
  prettyPrint(),
  colorize({
    all: true,
    colors: {
      debug: "magenta",
      error: "red",
      http: "cyan",
      info: "green",
      warning: "yellow",
    },
  }),
);

const prodFormat = combine(
  format.errors({ stack: true }),
  splat(),
  timestamp(),
  json(),
);

const logger = createLogger({
  format: envConfig.NODE_ENV === "prod" ? prodFormat : devFormat,
  level: envConfig.LOG_LEVEL,
  levels: logLevels,
  transports: [new transports.Console()],
});

export default logger;

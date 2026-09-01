import type { NextFunction, Request, RequestHandler, Response } from "express";

type GuardMiddleware = (
  req: Request,
  res: Response,
  next: MiddlewareResult,
) => Promise<void> | void;

type MiddlewareResult = (
  isMiddlewareSuccess: boolean,
  localFailResponseCode?: number,
  localFailureReason?: string,
) => void;

export const orMiddleware = (middlewares: GuardMiddleware[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let middlewareIndex = 0;
    let allowed = false;
    let failResponseCode = 403;
    let failureReason = "";

    const runNextMiddleware = async (): Promise<void> => {
      if (middlewareIndex >= middlewares.length) {
        if (allowed) {
          next();
          return;
        }

        res.status(failResponseCode).send(failureReason);
        return;
      }

      const currentMiddleware = middlewares[middlewareIndex];
      if (!currentMiddleware) {
        next();
        return;
      }
      middlewareIndex += 1;

      await currentMiddleware(
        req,
        res,
        (
          isMiddlewareSuccess: boolean,
          localFailResponseCode?: number,
          localFailureReason?: string,
        ) => {
          if (isMiddlewareSuccess) {
            allowed = true;
            return;
          }

          if (localFailResponseCode && localFailureReason) {
            failResponseCode = localFailResponseCode;
            failureReason = localFailureReason;
          }
        },
      );

      if (allowed) {
        next();
        return;
      }

      await runNextMiddleware();
    };

    await runNextMiddleware();
  };
};

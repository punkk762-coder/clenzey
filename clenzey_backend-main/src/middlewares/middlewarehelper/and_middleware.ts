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

export const andMiddleware = (middlewares: GuardMiddleware[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let middlewareIndex = 0;
    let allowed = false;
    let failResponseCode = 403;
    let failureReason = "";

    const runNextMiddleware = async (): Promise<void> => {
      if (middlewareIndex >= middlewares.length) {
        next();
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
            allowed = false;
            failResponseCode = localFailResponseCode;
            failureReason = localFailureReason;
          }
        },
      );

      if (allowed) {
        await runNextMiddleware();
        return;
      }

      res.status(failResponseCode).send(failureReason);
    };

    await runNextMiddleware();
  };
};

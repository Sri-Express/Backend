// src/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
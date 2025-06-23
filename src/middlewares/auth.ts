import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  (req as any).userId = 'hardcodedUserId';

  return next();
}
import { Request, Response, NextFunction } from 'express';

export function paginationMiddleware(req: Request, res: Response, next: NextFunction) {
    let { page, limit } = req.query;
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    (req.query as any).page = (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : 1;
    (req.query as any).limit = (!isNaN(parsedLimit) && parsedLimit > 0) ? parsedLimit : 50;
    next();
} 
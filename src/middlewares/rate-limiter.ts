import rateLimit from 'express-rate-limit';

export const analyzeRateLimiterMiddleware = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 10 analyze requests per 5 minutes
    message: 'Too many analysis requests from this IP, please try again in 5 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

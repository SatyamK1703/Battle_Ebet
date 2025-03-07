import redis from '../config/redis.config.js';
import { createError } from '../utils/error.util.js';

// Initialize Redis connection check
//redis.on('error', (err) => console.error('Redis Error:', err));

/**
 * Create a rate limiter middleware
 * @param {string} prefix - Prefix for the Redis key
 * @param {number} limit - Number of requests allowed
 * @param {number} windowInSeconds - Time window in seconds
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
export const rateLimiter = (prefix, limit, windowInSeconds, options = {}) => {
    return async (req, res, next) => {
        try {
            const key = `ratelimit:${prefix}:${req.user?._id || req.ip}`;
            const currentCount = await redis.get(key);
            
            if (currentCount === null) {
                await redis.setex(key, windowInSeconds, 1);
                addRateLimitHeaders(res, limit, limit - 1, windowInSeconds);
                return next();
            }

            const count = parseInt(currentCount);
            const ttl = await redis.ttl(key);

            if (count >= limit) {
                addRateLimitHeaders(res, limit, 0, ttl);
                return res.status(429).json({
                    success: false,
                    message: 'Rate limit exceeded',
                    data: {
                        limit,
                        remaining: 0,
                        resetIn: ttl,
                        resetAt: new Date(Date.now() + (ttl * 1000)).toISOString()
                    }
                });
            }

            await redis.incr(key);
            addRateLimitHeaders(res, limit, limit - count - 1, ttl);
            next();
        } catch (error) {
            console.error('Rate Limiter Error:', error);
            if (options.failOpen) {
                next();
            } else {
                next(createError(500, 'Rate limiting service unavailable'));
            }
        }
    };
};

// Helper function to add rate limit headers
const addRateLimitHeaders = (res, limit, remaining, reset) => {
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', reset);
};

/**
 * Specific rate limiters for different actions
 */
export const betRateLimiter = {
    // Limit placing bets: 5 per minute
    placeBet: rateLimiter('place-bet', 5, 60, { failOpen: true }),
    
    // Limit bet cancellations: 3 per minute
    cancelBet: rateLimiter('cancel-bet', 3, 60),
    
    // Limit bet queries: 30 per minute
    getBets: rateLimiter('get-bets', 30, 60, { failOpen: true })
};

export const authRateLimiter = {
    // Limit login attempts: 5 per 5 minutes
    login: rateLimiter('login', 5, 300),
    
    // Limit registration: 3 per hour
    register: rateLimiter('register', 3, 3600),
    
    // Limit OTP requests: 3 per 5 minutes
    requestOTP: rateLimiter('request-otp', 3, 300)
};

export const walletRateLimiter = {
    // Limit withdrawal requests: 3 per hour
    withdraw: rateLimiter('withdraw', 3, 3600),
    
    // Limit deposit requests: 10 per hour
    deposit: rateLimiter('deposit', 10, 3600),
    
    // Limit balance checks: 30 per minute
    checkBalance: rateLimiter('check-balance', 30, 60, { failOpen: true })
};

// IP-based rate limiter for public endpoints
export const publicRateLimiter = rateLimiter('public', 60, 60, { failOpen: true });

// Stricter rate limiter for sensitive operations
export const strictRateLimiter = (prefix, limit = 3) => {
    return rateLimiter(prefix, limit, 300, { failOpen: false });
};

// Dynamic rate limiter based on user role
export const dynamicRateLimiter = (prefix) => {
    return (req, res, next) => {
        const userRole = req.user?.role || 'public';
        const limits = {
            admin: { limit: 1000, window: 3600 },
            vip: { limit: 100, window: 60 },
            user: { limit: 30, window: 60 },
            public: { limit: 20, window: 60 }
        };

        const { limit, window } = limits[userRole] || limits.public;
        return rateLimiter(prefix, limit, window, { 
            failOpen: userRole === 'admin' 
        })(req, res, next);
    };
}; 
import redisClient from '../config/redis.js';

export const cacheMiddleware = (duration = 3600) => {
    return async (req, res, next) => {
        // Skip cache for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = `cache:${req.originalUrl || req.url}`;

        try {
            // Try to get cached data
            const cachedData = await redisClient.get(cacheKey);
            
            if (cachedData) {
                return res.json({
                    fromCache: true,
                    data: cachedData
                });
            }

            // If no cache, modify res.json to cache the response
            const originalJson = res.json;
            res.json = async function(data) {
                await redisClient.set(cacheKey, data, duration);
                return originalJson.call(this, {
                    fromCache: false,
                    data
                });
            };

            next();
        } catch (error) {
            console.error('Cache Middleware Error:', error);
            // Continue without caching if Redis fails
            next();
        }
    };
};

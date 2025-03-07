import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis configuration options
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const maxRetryTime = 3000; // Maximum retry delay in ms
        const delay = Math.min(times * 100, maxRetryTime);
        return delay;
    },
    reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;
        }
        return false;
    }
};

// Create Redis instance
const redis = new Redis(redisConfig);

// Handle Redis events
redis.on('connect', () => {
    console.log('✅ Redis Connected Successfully');
});

redis.on('error', (error) => {
    console.error('❌ Redis Error:', error.message);
});

redis.on('ready', () => {
    console.log('✅ Redis Client Ready');
});

redis.on('reconnecting', () => {
    console.log('🔄 Redis Reconnecting...');
});

redis.on('end', () => {
    console.log('❌ Redis Connection Ended');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    redis.disconnect();
});

export default redis; 
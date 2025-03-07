import Redis from 'ioredis';

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connect();
    }

    connect() {
        try {
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                console.log('✅ Redis Connected Successfully!');
            });

            this.client.on('ready', () => {
                console.log('⚡ Redis Client Ready and Accepting Commands');
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                console.error('❌ Redis Connection Error:', err);
            });

            this.client.on('end', () => {
                this.isConnected = false;
                console.log('❌ Redis Connection Ended');
            });

            this.client.on('reconnecting', () => {
                console.log('🔄 Redis Client Reconnecting...');
            });

            // Test connection
            this.client.ping().then(() => {
                console.log('🎯 Redis Ping Successful');
            }).catch((err) => {
                console.error('❌ Redis Ping Failed:', err);
            });

        } catch (error) {
            console.error('❌ Redis Initial Connection Failed:', error);
            this.isConnected = false;
        }
    }

    async set(key, value, expiry = 3600) {
        try {
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            await this.client.setex(key, expiry, value);
            return true;
        } catch (error) {
            console.error('Redis Set Error:', error);
            return false;
        }
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            if (!data) return null;
            try {
                return JSON.parse(data);
            } catch {
                return data;
            }
        } catch (error) {
            console.error('Redis Get Error:', error);
            return null;
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Redis Delete Error:', error);
            return false;
        }
    }

    async clearByPattern(pattern) {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            console.error('Redis Clear Pattern Error:', error);
            return false;
        }
    }
}

// Create and export Redis instance
const redisClient = new RedisClient();
export default redisClient;
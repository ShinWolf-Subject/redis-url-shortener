/**
 * URL Shortener using Redis for Database
 * @title URL Shortener Using Redis
 * @name NvClip
 * @author Kiyuu
 * @site https://app.nsu.my.id
 * @since Monday, February 2, 2026
 * @sourcePlatform GITHUB.COM
 */
import Redis from 'ioredis';

let redisClient = null;

export function initializeRedis() {
  if (redisClient) return redisClient;
  
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined in environment variables');
    }
    
    redisClient = new Redis(redisUrl, {
      tls: {},
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Connected to Upstash Redis');
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
    
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    process.exit(1);
  }
}

export function getRedisClient() {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

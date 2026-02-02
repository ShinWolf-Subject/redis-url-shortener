/**
 * URL Shortener using Redis for Database
 * @title URL Shortener Using Redis
 * @name NvClip
 * @author Kiyuu
 * @site https://app.nsu.my.id
 * @since Monday, February 2, 2026
 * @sourcePlatform GITHUB.COM
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getRedisClient } from './utils/redis.js';
import { generateSlug, isValidUrl, isValidAdminKey, calculateUptime } from './utils/index.js';

const app = express();
const redis = getRedisClient();

const limiter = rateLimit({
  windowMs: 100,
  max: 1,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(limiter);
app.use(express.json());

let serverStartTime = Date.now();

async function initializeStats() {
  try {
    const existingStart = await redis.get('clp:uptime:start');
    if (!existingStart) {
      await redis.set('clp:uptime:start', serverStartTime.toString());
      console.log('Initialized new uptime start time');
    } else {
      serverStartTime = parseInt(existingStart);
      console.log('Resumed uptime from:', new Date(serverStartTime).toISOString());
    }
    
    const totalLinks = await redis.get('clp:total_links');
    if (!totalLinks) {
      await redis.set('clp:total_links', '0');
      console.log('Initialized total_links counter');
    }
    
    const totalClicks = await redis.get('clp:total_clicks');
    if (!totalClicks) {
      await redis.set('clp:total_clicks', '0');
      console.log('Initialized total_clicks counter');
    }
    
    const uptime = await redis.get('clp:uptime');
    if (!uptime) {
      const calculatedUptime = calculateUptime(serverStartTime);
      await redis.set('clp:uptime', calculatedUptime);
      console.log('Initialized uptime:', calculatedUptime);
    }
  } catch (error) {
    console.error('Error initializing stats:', error);
  }
}

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    
    const uptime = calculateUptime(serverStartTime);
    await redis.set('clp:uptime', uptime);
    
    res.json({
      success: true,
      status: 'healthy',
      uptime: uptime,
      server_start_time: new Date(serverStartTime).toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const { adminKey } = req.query;
    
    if (!isValidAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing admin key'
      });
    }
    
    const [totalLinks, totalClicks, uptimeStart] = await Promise.all([
      redis.get('clp:total_links') || '0',
      redis.get('clp:total_clicks') || '0',
      redis.get('clp:uptime:start')
    ]);
    
    const currentStartTime = uptimeStart ? parseInt(uptimeStart) : serverStartTime;
    const uptime = calculateUptime(currentStartTime);
    
    await redis.set('clp:uptime', uptime);
    
    res.json({
      success: true,
      database: "NvClip (CLP) Vurneus v4.63.z.t_2.3.r0 Southeast Asia",
      data: {
        total_links: parseInt(totalLinks),
        total_clicks: parseInt(totalClicks),
        uptime: uptime,
        current_time: new Date().toISOString(),
        collections: {
          clp_total_links: await redis.get('clp:total_links'),
          clp_total_clicks: await redis.get('clp:total_clicks'),
          clp_uptime: await redis.get('clp:uptime')
        }
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/clear-uptime', async (req, res) => {
  try {
    const { adminKey } = req.query;
    
    if (!isValidAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing admin key'
      });
    }
    
    const oldUptimeStart = await redis.get('clp:uptime:start');
    const oldUptime = await redis.get('clp:uptime');
    
    const newStartTime = Date.now();
    serverStartTime = newStartTime;
    
    await redis.del('clp:uptime:start');
    await redis.del('clp:uptime');
    await redis.set('clp:uptime:start', newStartTime.toString());
    await redis.set('clp:uptime', '0s');
    
    const verifyStart = await redis.get('clp:uptime:start');
    const verifyUptime = await redis.get('clp:uptime');
    
    console.log('Uptime reset:');
    console.log('  Old start:', oldUptimeStart ? new Date(parseInt(oldUptimeStart)).toISOString() : 'none');
    console.log('  Old uptime:', oldUptime || 'none');
    console.log('  New start:', new Date(newStartTime).toISOString());
    console.log('  Verify start:', verifyStart);
    console.log('  Verify uptime:', verifyUptime);
    
    res.json({
      success: true,
      message: "Uptime counter reset successfully",
      admin: adminKey,
      details: {
        old_start_time: oldUptimeStart ? new Date(parseInt(oldUptimeStart)).toISOString() : null,
        old_uptime: oldUptime,
        new_start_time: new Date(newStartTime).toISOString(),
        verification: {
          clp_uptime_start_set: !!verifyStart,
          clp_uptime_set: !!verifyUptime
        }
      }
    });
  } catch (error) {
    console.error('Error clearing uptime:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/new', async (req, res) => {
  try {
    const { url, slug: customSlug } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }
    
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }
    
    let slug = customSlug || generateSlug();
    
    if (customSlug) {
      const existingUrl = await redis.get(`clp:${slug}`);
      if (existingUrl) {
        return res.status(409).json({
          success: false,
          error: 'Slug already exists'
        });
      }
    } else {
      let attempts = 0;
      while (attempts < 10) {
        const existingUrl = await redis.get(`clp:${slug}`);
        if (!existingUrl) break;
        slug = generateSlug();
        attempts++;
      }
    }
    
    await redis.set(`clp:${slug}`, url);
    
    await redis.incr('clp:total_links');
    
    const shortUrl = `${process.env.APP_DOMAIN}/${slug}`;
    
    res.json({
      success: true,
      result: shortUrl
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/new', async (req, res) => {
  try {
    const { url, slug: customSlug } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required in request body'
      });
    }
    
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }
    
    let slug = customSlug || generateSlug();
    
    if (customSlug) {
      const existingUrl = await redis.get(`clp:${slug}`);
      if (existingUrl) {
        return res.status(409).json({
          success: false,
          error: 'Slug already exists'
        });
      }
    } else {
      let attempts = 0;
      while (attempts < 10) {
        const existingUrl = await redis.get(`clp:${slug}`);
        if (!existingUrl) break;
        slug = generateSlug();
        attempts++;
      }
    }
    
    await redis.set(`clp:${slug}`, url);
    await redis.incr('clp:total_links');
    
    const shortUrl = `${process.env.APP_DOMAIN}/${slug}`;
    
    res.json({
      success: true,
      result: shortUrl
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const reservedRoutes = ['new', 'stats', 'health', 'clear-uptime'];
    if (reservedRoutes.includes(slug)) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found'
      });
    }
    
    const url = await redis.get(`clp:${slug}`);
    
    if (!url) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found'
      });
    }
    
    await redis.incr('clp:total_clicks');
    
    const uptime = calculateUptime(serverStartTime);
    await redis.set('clp:uptime', uptime);
    
    res.redirect(302, url);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeStats();
    
    app.listen(PORT, () => {
      console.log(`Server running on ${process.env.APP_DOMAIN}`);
      console.log(`Health check: ${process.env.APP_DOMAIN}/health`);
      console.log(`Stats: ${process.env.APP_DOMAIN}/stats?adminKey=admin123`);
      console.log(`Clear uptime: ${process.env.APP_DOMAIN}/clear-uptime?adminKey=admin123`);
      console.log(`Create short URL: ${process.env.APP_DOMAIN}/new?url=https://example.com`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

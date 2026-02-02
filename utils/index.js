/**
 * URL Shortener using Redis for Database
 * @title URL Shortener Using Redis
 * @name NvClip
 * @author Kiyuu
 * @site https://app.nsu.my.id
 * @since Monday, February 2, 2026
 * @sourcePlatform GITHUB.COM
 */
import { nanoid } from 'nanoid';

export function generateSlug(length = 8) {
  const min = 4;
  const max = 6;
  const randomLength = Math.floor(Math.random() * (max - min + 1)) + min;
  return nanoid(randomLength);
}

export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getAdminKeys() {
  const adminKeys = [];
  const maxAdminKey = parseInt(process.env.MAX_ADMIN_KEY) || 20;
  
  for (let i = 1; i <= maxAdminKey; i++) {
    const key = process.env[`ADMIN_KEY${i}`];
    if (key) {
      adminKeys.push(key);
    }
  }
  
  return adminKeys;
}

export function isValidAdminKey(key) {
  if (!key) return false;
  const adminKeys = getAdminKeys();
  return adminKeys.includes(key);
}

export function calculateUptime(startTime) {
  if (!startTime) return "0s";
  
  const now = Date.now();
  const diffMs = now - startTime;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

import { getRedisClient, isRedisConnected } from './redisClient.js';

export const getCacheStats = async () => {
  try {
    if (!isRedisConnected()) {
      return { error: 'Redis not connected', isConnected: false };
    }

    const client = getRedisClient();
    if (!client) return { error: 'Redis client unavailable', isConnected: false };

    const dbSize = await client.dbSize();
    const info = await client.info('stats');

    const keys = await client.keys('*');
    const cacheKeysCount = keys.filter(k => k.includes('cache:') || k.includes('-')).length;

    const stats = {
      isConnected: true,
      totalKeys: dbSize,
      cacheKeys: cacheKeysCount,
      info: info,
      timestamp: new Date().toISOString()
    };

    return stats;
  } catch (error) {
    console.error('[Cache Stats] Error:', error.message);
    return { error: error.message, isConnected: false };
  }
};

export const getKeysByPrefix = async (prefix) => {
  try {
    if (!isRedisConnected()) return [];

    const client = getRedisClient();
    if (!client) return [];

    const pattern = `${prefix}:*`;
    const keys = await client.keys(pattern);

    return keys;
  } catch (error) {
    console.error('[Cache] Error fetching keys:', error.message);
    return [];
  }
};

export const getCacheMemoryUsage = async () => {
  try {
    if (!isRedisConnected()) return null;

    const client = getRedisClient();
    if (!client) return null;

    const memoryInfo = await client.info('memory');
    const lines = memoryInfo.split('\r\n');
    const memory = {};

    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        memory[key] = value;
      }
    });

    return {
      usedMemory: memory.used_memory ? parseInt(memory.used_memory) : 0,
      usedMemoryHuman: memory.used_memory_human || 'N/A',
      peakMemory: memory.used_memory_peak ? parseInt(memory.used_memory_peak) : 0,
      peakMemoryHuman: memory.used_memory_peak_human || 'N/A'
    };
  } catch (error) {
    console.error('[Cache] Memory info error:', error.message);
    return null;
  }
};

export const clearCacheByPrefix = async (prefix) => {
  try {
    if (!isRedisConnected()) return 0;

    const client = getRedisClient();
    if (!client) return 0;

    const pattern = `${prefix}:*`;
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(keys);
    }

    return keys.length;
  } catch (error) {
    console.error('[Cache] Clear error:', error.message);
    return 0;
  }
};

export const printCacheReport = async () => {
  try {
    const stats = await getCacheStats();
    const memory = await getCacheMemoryUsage();

    console.log('\n========== REDIS CACHE REPORT ==========');
    console.log(`Connected: ${stats.isConnected}`);
    console.log(`Total Keys: ${stats.totalKeys}`);
    console.log(`Cache Keys: ${stats.cacheKeys}`);

    if (memory) {
      console.log(`\nMemory Usage:`);
      console.log(`  Used: ${memory.usedMemoryHuman}`);
      console.log(`  Peak: ${memory.peakMemoryHuman}`);
    }

    console.log(`Timestamp: ${stats.timestamp}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('[Cache] Report error:', error.message);
  }
};

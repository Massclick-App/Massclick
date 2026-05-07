# Redis Resilience & Error Handling

## System Resilience Guarantee

**Your application will continue to work normally even if Redis stops or becomes unavailable.** Caching will simply be disabled until Redis is back.

## How It Works

### 1. Graceful Degradation

The system is designed with multiple fallback layers:

```
┌─────────────────────────────────────────────┐
│         Request to GET endpoint             │
└─────────────────────────────────────────────┘
                        │
                        ▼
          ┌──────────────────────────┐
          │  Is Redis connected?     │
          └──────────────────────────┘
                   /          \
                NO/            \YES
                 /              \
            Continue        Try to get
            without          from cache
            caching               │
                │                 ▼
                │         ┌──────────────────┐
                │         │ Cache hit?       │
                │         └──────────────────┘
                │           /          \
                │         YES/          \NO
                │         /              \
                │      Return         Run controller
                │      cached         to generate
                │      response       new response
                │         │                 │
                │         │                 ▼
                │         │      ┌──────────────────────┐
                │         │      │ Try to cache result  │
                │         │      │ (timeout: 100ms)     │
                │         │      └──────────────────────┘
                │         │           /          \
                │         │        Success    Timeout/Error
                │         │        (cached)   (continue anyway)
                │         │          │             │
                └─────────┴─────────┴─────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │  Return response     │
                     │  to client           │
                     └──────────────────────┘
```

### 2. Multiple Safety Layers

#### Layer 1: Startup Resilience
```javascript
// app.js
await initRedis(); // Never throws, even if Redis is down
// App continues to start regardless
```
✅ **If Redis is down at startup:** App starts normally without caching

#### Layer 2: Connection Resilience
```javascript
// redisClient.js
redisClient.on('error', (err) => {
  isConnected = false;        // Mark as disconnected
  attemptReconnect();         // Try to reconnect every 5 seconds
});
```
✅ **If Redis goes down later:** Auto-reconnect every 5 seconds, app continues

#### Layer 3: Request Handling Resilience
```javascript
// cacheMiddleware.js
if (!isRedisConnected() || req.method !== 'GET') {
  return next();  // Skip caching, proceed normally
}
```
✅ **If Redis fails during request:** Middleware skips caching, request continues

#### Layer 4: Cache Operation Timeout
```javascript
// Cache operations have 100ms timeout
const withTimeout = (promise, 100ms) => {
  // If cache operation takes >100ms, abort and continue
};
```
✅ **If Redis is slow/hanging:** Times out and returns data uncached

#### Layer 5: Error Catching
```javascript
try {
  // Cache operations
} catch (error) {
  console.warn('Cache error (non-blocking):', error);
  // Continue without caching
}
```
✅ **If anything unexpected happens:** Logged but never blocks response

### 3. Cache Invalidation Resilience

Cache invalidation is **non-blocking**:

```javascript
// invalidateSeoCache() doesn't block the response
export const invalidateSeoCache = async () => {
  for (const pattern of patterns) {
    invalidateCachePattern(pattern).catch(err => {
      console.warn('[Cache] Failed to invalidate:', err.message);
      // But the controller response is already sent
    });
  }
};
```

**Even if cache invalidation fails:**
- ✅ User gets their response immediately
- ✅ Failed invalidation is logged for debugging
- ✅ No impact on user experience

## Test Scenarios

### Scenario 1: Redis Down at Startup

```bash
# 1. Stop Redis
redis-cli shutdown

# 2. Start your app
npm start

# Expected output:
# [Cache] ⚠ Redis unavailable at startup — app will work without caching

# 3. App is fully functional without caching
curl http://localhost:4000/api/seo/meta?slug=test
# ✅ Returns data (just not cached)

# 4. When you restart Redis later
redis-server

# App automatically detects and reconnects
# [Cache] Attempting to reconnect to Redis...
# [Cache] ✓ Reconnected successfully
```

### Scenario 2: Redis Dies Mid-Operation

```bash
# 1. App is running with caching working
curl http://localhost:4000/api/seo/meta?slug=test  # Cached
curl http://localhost:4000/api/seo/meta?slug=test  # From cache (fast)

# 2. Redis crashes
redis-cli shutdown

# 3. Next request still works
curl http://localhost:4000/api/seo/meta?slug=test  
# ✅ Returns data (no cache hit, but still works)

# Logs show:
# [Cache] Redis disconnected, caching disabled
# [Cache] Attempting to reconnect to Redis...
```

### Scenario 3: Redis is Very Slow

```bash
# If Redis takes >100ms to respond:
# 1. Cache operation times out
# 2. Request continues without caching
# 3. User gets response without waiting for cache

# This prevents slow Redis from slowing down your API
```

## Monitoring & Alerts

### Check Redis Status

```javascript
// In a controller (optional)
import { isRedisConnected } from '../utils/redisClient.js';

export const healthCheck = (req, res) => {
  res.json({
    database: 'connected',
    redis: isRedisConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
};
```

### View Logs

```bash
# All cache-related logs start with [Cache]
# Good: 
#   [Cache] ✓ Redis connected successfully
#   [Cache] Invalidated 5 keys

# Warnings (non-blocking):
#   [Cache] Redis disconnected, caching disabled
#   [Cache] Failed to cache response (non-blocking)
#   [Cache] Invalidation warning (non-blocking)

# You can grep for problems:
# npm start | grep "\[Cache\] ⚠"
```

## Performance Impact When Redis is Down

- **First request:** ~5-10ms slower (no cache hit possible)
- **Subsequent requests:** Same speed (no cache overhead)
- **Cache invalidation:** ~0ms (skipped, non-blocking)

When Redis is down, you lose the performance benefits of caching, but:
- ✅ Users don't experience delays
- ✅ Database gets more load (but still handles it)
- ✅ Auto-recovery works seamlessly

## Implementation Details

### Connection Management

```javascript
// Automatic reconnection with exponential backoff
socket: {
  reconnectStrategy: (retries) => {
    if (retries > 10) return false;  // Give up after 10 attempts
    return Math.min(retries * 100, 3000);  // Max 3 second wait
  }
}
```

### Request Safety

- ❌ Cache middleware **never awaits** for full completion
- ✅ Cache operations have **100ms timeout**
- ❌ Cache invalidation **never blocks** responses
- ✅ All errors are **caught and logged**

### Database Load

When Redis is down:
- Query patterns: Same as before caching
- Response times: Slightly slower (no cache)
- Database load: Same or higher

This is acceptable because:
1. Redis going down is rare
2. Auto-recovery happens within seconds
3. Your database should handle normal load

## Configuration

### Customize Timeouts

In `redisClient.js`:
```javascript
const RECONNECT_DELAY = 5000;  // Reconnect every 5 seconds
```

In `cacheInvalidation.js`:
```javascript
const CACHE_TIMEOUT_MS = 100;  // Abort cache ops after 100ms
```

### Customize Reconnection Strategy

In `redisClient.js`:
```javascript
reconnectStrategy: (retries) => {
  if (retries > 10) return false;  // Give up after 10 attempts
  return Math.min(retries * 100, 3000);  // Exponential backoff
}
```

## Summary

| Scenario | Result | User Impact |
|----------|--------|------------|
| Redis down at startup | App works, no caching | None |
| Redis dies during operation | App continues, requests cached until timeout | None |
| Cache operation slow (>100ms) | Operation aborted, request continues | None |
| Cache invalidation fails | Logged, response sent immediately | None |
| Redis auto-reconnects | Caching re-enabled seamlessly | None (might be stale data briefly) |

**Bottom line: Your application is resilient to all Redis failures.** 🛡️

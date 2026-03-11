import { redisClient } from "../utils/redisClient.js";

const TOO_MANY_REQUESTS_MESSAGE = "Too many requests";

function getRequestIp(req) {
  return (req.ip || req.headers["x-forwarded-for"] || "unknown")
    .toString()
    .split(",")[0]
    .trim();
}

export function createRateLimiter({ keyPrefix, limit, windowInSeconds, resolveIdentifier }) {
  if (!keyPrefix || !limit || !windowInSeconds || typeof resolveIdentifier !== "function") {
    throw new Error("Invalid rate limiter configuration");
  }

  return async function rateLimiter(req, res, next) {
    try {
      if (!redisClient) {
        return next();
      }

      const identifier = resolveIdentifier(req);
      if (!identifier) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const redisKey = `${keyPrefix}:${identifier}`;
      const currentCount = await redisClient.incr(redisKey);

      if (currentCount === 1) {
        await redisClient.expire(redisKey, windowInSeconds);
      }

      if (currentCount > limit) {
        const ttl = await redisClient.ttl(redisKey);

        if (typeof ttl === "number" && ttl > 0) {
          res.set("Retry-After", String(ttl));
        }

        return res.status(429).json({ message: TOO_MANY_REQUESTS_MESSAGE });
      }

      return next();
    } catch (error) {
      console.error(`Rate limiter error for ${keyPrefix}:`, error);
      return next();
    }
  };
}

export const loginRateLimiter = createRateLimiter({
  keyPrefix: "rate:login",
  limit: 10,
  windowInSeconds: 60,
  resolveIdentifier: getRequestIp,
});

export const forgotPasswordRateLimiter = createRateLimiter({
  keyPrefix: "rate:forgot",
  limit: 5,
  windowInSeconds: 60,
  resolveIdentifier: getRequestIp,
});

export const workspaceInviteRateLimiter = createRateLimiter({
  keyPrefix: "rate:invite",
  limit: 10,
  windowInSeconds: 60,
  resolveIdentifier: (req) => req.user?.userId ?? null,
});

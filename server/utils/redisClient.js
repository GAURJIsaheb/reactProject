import { Redis } from "@upstash/redis";

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;

let redisClient = null;

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  redisClient = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  console.warn(
    "Upstash Redis rate limiting is disabled because UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing."
  );
}

export { redisClient };

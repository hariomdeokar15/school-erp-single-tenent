import {
  HttpException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { createHmac } from "crypto";

const INCREMENT_WITH_TTL = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
  return count
`;

@Injectable()
export class AuthRateLimitService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly digestKey: string;

  constructor(config: ConfigService) {
    this.digestKey =
      config.get<string>("auth.privateKey") ||
      "local-development-rate-limit-key";
    this.redis = new Redis(config.get<string>("redis.url")!, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      enableOfflineQueue: false,
      retryStrategy: (attempt) => (attempt <= 3 ? attempt * 200 : null),
    });
  }

  async checkLogin(email: string, ipAddress: string): Promise<void> {
    try {
      const ipCount = await this.increment(
        `auth:login:ip:${this.digest(ipAddress)}`,
        60_000,
      );
      const accountKey = `auth:login:failed:${this.digest(email)}`;
      const failures = Number((await this.redis.get(accountKey)) || 0);
      if (ipCount > 30 || failures >= 8) {
        throw new HttpException(
          "Too many sign-in attempts. Try again later.",
          429,
        );
      }
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 429)
        throw error;
      throw new ServiceUnavailableException(
        "Sign-in is temporarily unavailable.",
      );
    }
  }

  async recordFailure(email: string): Promise<void> {
    try {
      await this.increment(
        `auth:login:failed:${this.digest(email)}`,
        15 * 60_000,
      );
    } catch {
      throw new ServiceUnavailableException(
        "Sign-in is temporarily unavailable.",
      );
    }
  }

  async clearFailures(email: string): Promise<void> {
    try {
      await this.redis.del(`auth:login:failed:${this.digest(email)}`);
    } catch {
      throw new ServiceUnavailableException(
        "Sign-in is temporarily unavailable.",
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private async increment(key: string, ttlMs: number): Promise<number> {
    return Number(await this.redis.eval(INCREMENT_WITH_TTL, 1, key, ttlMs));
  }

  private digest(value: string): string {
    return createHmac("sha256", this.digestKey).update(value).digest("hex");
  }
}

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly configService: ConfigService) {}

  isEnabled(flag: string): boolean {
    const enabledFlags = this.configService.get<string[]>("features.enabled", []);
    return enabledFlags.includes(flag);
  }
}

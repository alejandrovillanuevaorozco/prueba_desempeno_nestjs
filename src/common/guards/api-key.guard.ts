import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * ApiKeyGuard
 * 
 * In this guard, I enforce API key authentication for external B2B integrations
 * (such as partner logistics systems inquiring about vehicle maintenance history).
 * I inspect the 'x-api-key' request header and validate it against the comma-separated
 * list of authorized keys configured in the system environment.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  /**
   * I intercept the execution context, extract the 'x-api-key' header from the HTTP request,
   * and verify whether it matches one of the authorized API keys configured in the environment.
   */
  canActivate(context: ExecutionContext): boolean {
    // 1. I switch the execution context to HTTP and retrieve the Express request object
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    // 2. I reject the request if the client did not supply the x-api-key header
    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    // 3. I fetch the authorized API keys from environment configuration
    const validKeysRaw = this.configService.get<string>('API_KEYS', '');
    const validKeys = validKeysRaw
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // 4. I ensure the provided key matches one of the authorized credentials
    if (!validKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    // 5. If valid, I authorize the request to proceed
    return true;
  }
}


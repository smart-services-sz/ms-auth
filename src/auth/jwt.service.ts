import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenService {

  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTTL: number;
  private readonly refreshTTL: number;

  constructor(private readonly jwt: JwtService) {

    if (!process.env.JWT_ACCESS_SECRET)
      throw new Error('JWT_ACCESS_SECRET not defined');

    if (!process.env.JWT_REFRESH_SECRET)
      throw new Error('JWT_REFRESH_SECRET not defined');

    if (!process.env.ACCESS_TOKEN_TTL)
      throw new Error('ACCESS_TOKEN_TTL not defined');

    if (!process.env.REFRESH_TOKEN_TTL)
      throw new Error('REFRESH_TOKEN_TTL not defined');

    this.accessSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTTL = Number(process.env.ACCESS_TOKEN_TTL);
    this.refreshTTL = Number(process.env.REFRESH_TOKEN_TTL);
  }

  generateAccessToken(
    userId: string,
    name: string,
    email: string,
    roles: string[],
    permissions: string[],
    cargo: string | null,
    legajo: string | null,
    area: string | null,
  ) {
    return this.jwt.sign(
      {
        sub: userId,
        name,
        email,
        roles,
        permissions,
        cargo,
        legajo,
        area,
      },
      {
        secret: this.accessSecret,
        expiresIn: this.accessTTL,
      },
    );
  }

  generateRefreshToken(userId: string, tokenId: string) {
    return this.jwt.sign(
      {
        sub: userId,
        jti: tokenId,
      },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTTL,
      },
    );
  }

  verifyRefreshToken(token: string) {
    return this.jwt.verify(token, {
      secret: this.refreshSecret,
    });
  }
}

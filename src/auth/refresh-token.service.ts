import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, plainToken: string, expiresAt: Date) {
    const hash = await bcrypt.hash(plainToken, 10);

    return this.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        tokenHash: hash,
        expiresAt,
        userId,
      },
    });
  }

  async validate(userId: string, plainToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
      },
    });

    for (const token of tokens) {
      const match = await bcrypt.compare(plainToken, token.tokenHash);
      if (match) {
        return token;
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async revoke(tokenId: string, replacedById?: string) {
    return this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        revokedAt: new Date(),
        replacedById,
      },
    });
  }

  async revokeByUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

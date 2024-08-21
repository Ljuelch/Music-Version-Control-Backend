import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class ResetPasswordService {
  constructor(private readonly prisma: PrismaClient) {}

  private get randomResetKey(): string {
    return createHash('md5')
      .update(Math.random() + '.' + new Date().getTime())
      .digest('hex');
  }

  private get latestTimestamp(): Date {
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - 1);
    return timestamp;
  }

  private async deleteExpiredResetKeys(): Promise<void> {
    await this.prisma.tuserresetpassword.deleteMany({
      where: { timestamp: { lt: this.latestTimestamp } },
    });
  }

  async addResetKey(user_id: number, isPrivate: boolean): Promise<string> {
    const { resetKey } = await this.prisma.tuserresetpassword.create({
      data: { user_id, resetKey: this.randomResetKey, isPrivate },
      select: { resetKey: true },
    });

    return resetKey;
  }

  async evaluateResetKey(
    key: string,
    isPrivate: boolean,
  ): Promise<number | null> {
    await this.deleteExpiredResetKeys();

    let result: { user_id: number };
    try {
      result = await this.prisma.tuserresetpassword.delete({
        where: { resetKey: key, isPrivate },
        select: { user_id: true },
      });
    } catch (_) {
      return null;
    }

    return result?.user_id || null;
  }
}

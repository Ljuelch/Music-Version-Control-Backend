import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  static INVALID_SESSION_RESPONSE = {
    success: false,
    reason: 'INVALID_SESSION',
  };

  constructor(private readonly prisma: PrismaClient) {}

  async login(login: string, password: string) {
    let user = await this.prisma.tuser.findFirst({
      where: { username: login },
      select: { password: true, id: true, blocked: true },
    });

    if (!Number.isInteger(user?.id))
      user = await this.prisma.tuser.findFirst({
        where: { email: login },
        select: { password: true, id: true, blocked: true },
      });

    if (!Number.isInteger(user?.id))
      return { success: false, reason: 'USER_DOES_NOT_EXIST' };

    if (user.blocked) return { success: false, reason: 'USER_IS_BLOCKED' };

    if (!(await bcrypt.compare(password, user.password)))
      return { success: false, reason: 'PASSWORD_INCORRECT' };

    let session = (
      await this.prisma.tsession.findFirst({
        where: { user_id: user.id },
        select: { session: true },
      })
    )?.session;

    if (!session) {
      session = randomBytes(32).toString('hex');
      await this.prisma.tsession.create({
        data: {
          user_id: user.id,
          session,
        },
      });
    }

    return { success: true, session };
  }

  async logout(session: string) {
    try {
      const result = await this.prisma.tsession.delete({
        where: { session },
        select: { session: true },
      });

      return result?.session
        ? { success: true }
        : { success: false, reason: 'UNKNOWN' };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async getSession(session: string | Request) {
    session =
      typeof session === 'string' ? session : session['cookies']['session'];
    if (!session) return { exists: false };

    const result = await this.prisma.tsession.findFirst({
      where: {
        session:
          typeof session === 'string' ? session : session['cookies']['session'],
      },
    });

    return {
      exists: result?.session && result?.user_id,
      session: result?.session,
      user_id: result?.user_id,
    };
  }

  async getUserId(session: string | Request) {
    const result = await this.getSession(session);
    return result.exists ? result.user_id : false;
  }

  async validateSession(request: Request) {
    return (await this.getSession(request)).exists;
  }

  async updateSession(session: string) {
    try {
      const result = await this.prisma.tsession.update({
        where: { session },
        data: { timestamp: new Date() },
        select: { session: true },
      });

      return result?.session
        ? { success: true }
        : { success: false, reason: 'UNKNOWN' };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async deleteSessionsByUserId(userId: number) {
    await this.prisma.tsession.deleteMany({
      where: { user_id: userId },
    });
  }
}

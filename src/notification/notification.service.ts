import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Notification as NotificationInterface } from './notification.interface';
import { NotificationParam as NotificationParamInterface } from './notification-param.interface';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async addNotification(
    userId: number,
    notificationTemplateId: number,
    params: NotificationParamInterface[],
  ): Promise<number> {
    const { id } = await this.prisma.tusernotification.create({
      data: {
        user_id: userId,
        notificationTemplateId,
      },
      select: { id: true },
    });

    await this.prisma.tusernotificationparam.createMany({
      data: params.map((param) => ({
        notification_id: id,
        paramKey: param.key,
        paramValue: param.value,
      })),
    });

    return id;
  }

  async getNotificationWithUserId(
    notificationId: number,
    userId: number,
  ): Promise<NotificationInterface | undefined> {
    const notification = await this.prisma.tusernotification.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) return undefined;

    const params = await this.prisma.tusernotificationparam.findMany({
      where: {
        notification_id: notification.id,
      },
      select: {
        paramKey: true,
        paramValue: true,
      },
    });

    return {
      id: notification.id,
      user_id: notification.user_id,
      notificationTemplateId: notification.id,
      timestamp: notification.timestamp,
      isRead: notification.isRead,
      params: params.map((param) => ({
        key: param.paramKey,
        value: param.paramValue,
      })),
    };
  }

  async getNotifications(
    userId: number,
    isRead: boolean = undefined,
    from: number = undefined,
    to: number = undefined,
  ): Promise<NotificationInterface[]> {
    const notifications = await this.prisma.tusernotification.findMany({
      where: {
        user_id: userId,
        isRead,
      },
      orderBy: {
        timestamp: {
          sort: 'desc',
        },
      },
      skip: from,
      take: from === undefined || to === undefined ? undefined : to - from + 1,
    });

    const params = notifications.length
      ? await this.prisma.tusernotificationparam.findMany({
          where: {
            OR: notifications.map((notification) => ({
              notification_id: notification.id,
            })),
          },
          select: {
            notification_id: true,
            paramKey: true,
            paramValue: true,
          },
        })
      : [];

    return notifications.map((notification) => {
      const notificationOut: NotificationInterface = {
        id: notification.id,
        user_id: notification.user_id,
        notificationTemplateId: notification.notificationTemplateId,
        timestamp: notification.timestamp,
        isRead: notification.isRead,
        params: [],
      };

      for (const param of params)
        if (param.notification_id === notification.id)
          notificationOut.params.push({
            key: param.paramKey,
            value: param.paramValue,
          });

      return notificationOut;
    });
  }

  async getCountOfUnreadNotifications() {
    return this.prisma.tusernotification.count({
      where: {
        isRead: false,
      },
    });
  }

  async setNotificationRead(notificationId: number) {
    await this.prisma.tusernotification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async setAllNotificationsRead(userId: number) {
    await this.prisma.tusernotification.updateMany({
      where: {
        user_id: userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async setNotificationUnread(notificationId: number) {
    await this.prisma.tusernotification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: false,
      },
    });
  }

  async setAllNotificationsUnread(userId: number) {
    await this.prisma.tusernotification.updateMany({
      where: {
        user_id: userId,
      },
      data: {
        isRead: false,
      },
    });
  }

  async deleteNotification(notificationId: number) {
    await this.prisma.tusernotificationparam.deleteMany({
      where: {
        notification_id: notificationId,
      },
    });

    await this.prisma.tusernotification.delete({
      where: {
        id: notificationId,
      },
    });
  }

  async deleteAllNotifications(userId: number, isRead: boolean = undefined) {
    for (const notification of await this.getNotifications(userId, isRead))
      await this.deleteNotification(notification.id);
  }
}

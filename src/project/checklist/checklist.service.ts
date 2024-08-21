import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VersionService } from '../version/version.service';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly versionService: VersionService,
  ) {}

  async getProjectIdByEntryId(entryId: number) {
    return (
      await this.prisma.tproject.findFirst({
        select: { id: true },
        where: {
          tprojectversion: {
            some: {
              tprojectchecklist_tprojectchecklist_projectversionIdTotprojectversion:
                {
                  some: { id: entryId },
                },
            },
          },
        },
      })
    )?.id;
  }

  async getProjectVersionByEntryId(entryId: number) {
    return this.prisma.tprojectversion.findFirst({
      select: {
        id: true,
        versionNumber: true,
      },
      where: {
        tprojectchecklist_tprojectchecklist_projectversionIdTotprojectversion: {
          some: { id: entryId },
        },
      },
    });
  }

  async addEntry(
    projectversionId: number,
    userId: number,
    text: string,
    marker: { color: string; start: number; end?: number }[] = [],
  ) {
    try {
      const entry = await this.prisma.tprojectchecklist.create({
        data: {
          projectversionId: projectversionId,
          user_id: userId,
          text: text,
          tprojectchecklistmarker: {
            createMany: {
              data: marker.map((_marker) => ({
                user_id: userId,
                color: _marker.color,
                start: _marker.start,
                end: _marker.end,
              })),
            },
          },
        },
      });
      return { success: true, id: entry.id };
    } catch (error) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async getEntries(
    projectversionId: number,
    checked: boolean | undefined = undefined,
    includeOlder: boolean = false,
  ) {
    const entries = await this.prisma.tprojectchecklist.findMany({
      where: {
        OR: (includeOlder
          ? await this.versionService.getVersionsWithOlder(projectversionId)
          : [{ id: projectversionId }]
        ).map((projectVersion: { id: number }) => ({
          ...(checked === true ? {} : { projectversionId: projectVersion.id }),
          ...(checked !== undefined
            ? { checkedProjectversion_id: checked ? projectVersion.id : null }
            : {}),
        })),
      },
      select: {
        id: true,
        timestamp: true,
        text: true,
        checkedProjectversion_id: true,
        rejected: true,
        tuser: {
          select: {
            id: true,
            username: true,
          },
        },
        tprojectchecklistmarker: {
          select: {
            id: true,
            tuser: {
              select: {
                id: true,
                username: true,
              },
            },
            color: true,
            start: true,
            end: true,
          },
          orderBy: {
            start: 'asc',
          },
        },
      },
    });

    const entriesOut = [];
    // using for-loop instead of 'Array.map', because 'versionService.getVersionNumber' is async
    for (const i in entries) {
      entriesOut.push({
        id: entries[i].id,
        user: entries[i].tuser,
        timestamp: entries[i].timestamp,
        text: entries[i].text,
        checkedVersionNumber: entries[i].checkedProjectversion_id
          ? (
              await this.versionService.getVersionNumber(
                entries[i].checkedProjectversion_id,
              )
            )?.versionNumber || null
          : null,
        rejected: entries[i].rejected,
        marker: entries[i].tprojectchecklistmarker.map(
          ({ id, tuser, color, start, end }) => ({
            id,
            user: tuser,
            color,
            start: start.toNumber(),
            end: end?.toNumber(),
          }),
        ),
      });
    }
    return entriesOut;
  }

  async renameEntry(entryId: number, text: string) {
    try {
      await this.prisma.tprojectchecklist.update({
        where: { id: entryId },
        data: { text },
      });
      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async deleteEntry(entryId: number) {
    try {
      await this.prisma.tprojectchecklistmarker.deleteMany({
        where: {
          tprojectchecklist: { id: entryId },
        },
      });
      await this.prisma.tprojectchecklist.delete({
        where: { id: entryId },
      });
      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async checkEntry(
    entryId: number,
    versionId: number,
    rejected: boolean = false,
  ) {
    try {
      await this.prisma.tprojectchecklist.update({
        where: { id: entryId },
        data: {
          checkedProjectversion_id: versionId,
          rejected,
        },
      });
      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async uncheckEntry(entryId: number) {
    try {
      await this.prisma.tprojectchecklist.update({
        where: { id: entryId },
        data: {
          checkedProjectversion_id: null,
          rejected: null,
        },
      });
      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async getProjectIdByMarkerId(markerId: number) {
    return (
      await this.prisma.tproject.findFirst({
        select: { id: true },
        where: {
          tprojectversion: {
            some: {
              tprojectchecklist_tprojectchecklist_projectversionIdTotprojectversion:
                {
                  some: {
                    tprojectchecklistmarker: {
                      some: { id: markerId },
                    },
                  },
                },
            },
          },
        },
      })
    )?.id;
  }

  async addMarker(
    entryId: number,
    userId: number,
    color: string,
    start: number,
    end?: number,
  ) {
    try {
      const id = (
        await this.prisma.tprojectchecklistmarker.create({
          data: {
            projectchecklist_id: entryId,
            user_id: userId,
            color,
            start,
            end,
          },
        })
      ).id;
      return { success: true, id };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async setMarkerColor(markerId: number, color: string) {
    if (color.length !== 6)
      return { success: false, reason: 'INVALID_COLOR_VALUE' };

    try {
      await this.prisma.tprojectchecklistmarker.update({
        where: { id: markerId },
        data: { color },
      });
      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async deleteMarker(markerIds: number[]) {
    try {
      await this.prisma.tprojectchecklistmarker.deleteMany({
        where: {
          OR: markerIds.map((id) => ({ id })),
        },
      });
      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }
}

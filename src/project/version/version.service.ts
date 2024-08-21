import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProjectIdByVersionId(versionId: number) {
    return (
      await this.prisma.tproject.findFirst({
        where: {
          tprojectversion: {
            some: { id: versionId },
          },
        },
        select: { id: true },
      })
    )?.id;
  }

  async addVersion(projectId: number, songBPM?: number, songKey?: string) {
    const lastVersion = await this.getLastVersionId(projectId);
    const version = await this.prisma.tprojectversion.create({
      data: {
        project_id: projectId,
        versionNumber: lastVersion ? lastVersion + 1 : 1,
        songBPM: songBPM || null,
        songKey: songKey || null,
      },
    });
    return version.versionNumber;
  }

  async getVersionId(projectId: number, versionNumber: number) {
    const result = await this.prisma.tprojectversion.findFirst({
      where: {
        project_id: projectId,
        versionNumber: versionNumber,
      },
      select: { id: true },
    });
    return result?.id || false;
  }

  async getLastVersionId(projectId: number) {
    const version = await this.prisma.tprojectversion.groupBy({
      by: ['project_id'],
      where: {
        project_id: projectId,
      },
      _max: {
        versionNumber: true,
      },
    });

    return version?.[0] ? version[0]._max.versionNumber : false;
  }

  async getVersion(projectId: number, versionNumber: number) {
    const result = await this.prisma.tprojectversion.findFirst({
      where: {
        project_id: projectId,
        versionNumber: versionNumber,
      },
    });
    return result?.versionNumber ? result : false;
  }

  async getVersions(projectId: number) {
    return this.prisma.tprojectversion.findMany({
      where: {
        project_id: projectId,
      },
      orderBy: {
        versionNumber: 'asc',
      },
    });
  }

  async getVersionsWithOlder(projectversionId: number) {
    const projectVersion = await this.prisma.tprojectversion.findFirst({
      where: { id: projectversionId },
    });
    return this.prisma.tprojectversion.findMany({
      where: {
        project_id: projectVersion.project_id,
        versionNumber: {
          lte: projectVersion.versionNumber,
        },
      },
      orderBy: {
        versionNumber: 'asc',
      },
    });
  }

  async getLastVersion(projectId: number) {
    const lastVersionId = await this.getLastVersionId(projectId);
    if (!lastVersionId) return false;

    return await this.getVersion(projectId, lastVersionId);
  }

  async getVersionNumber(projectVersionId: number) {
    return this.prisma.tprojectversion.findUnique({
      where: {
        id: projectVersionId,
      },
    });
  }

  async getFiles(versionId: number) {
    return this.prisma.tprojectversionfile.findMany({
      where: {
        projectversion_id: versionId,
      },
    });
  }

  async setSongBPM(versionId: number, songBPM: number) {
    try {
      await this.prisma.tprojectversion.update({
        where: { id: versionId },
        data: { songBPM },
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  async setSongKey(versionId: number, songKey: string) {
    try {
      await this.prisma.tprojectversion.update({
        where: { id: versionId },
        data: { songKey },
      });
      return true;
    } catch (_) {
      return false;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VersionService } from './version/version.service';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../storage/storage.service';
import { env } from 'process';

export type ProjectUserRole = 'O' | 'A' | 'S';

@Injectable()
export class ProjectService {
  static readonly BUCKET_PREFIX =
    (env.GOOGLE_STORAGE_BUCKET_PREFIX || '') + 'truncate-project-';

  static getBucketName(projectId: number) {
    return this.BUCKET_PREFIX + projectId;
  }

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storageService: StorageService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly versionService: VersionService,
  ) {}

  async getProjects(userId: number) {
    const projectResults = await this.prisma.tproject.findMany({
      where: {
        tprojectuser: {
          some: {
            user_id: userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        tprojectuser: { select: { role: true } },
      },
    });

    const projects = [];
    for (const project of projectResults) {
      const version = await this.versionService.getLastVersion(project.id);
      if (!version) continue;

      projects.push({
        id: project.id,
        name: project.name,
        role: project.tprojectuser[0].role,
        lastVersion: {
          versionNumber: version.versionNumber,
          timestamp: version.timestamp,
          songBPM: version.songBPM,
          songKey: version.songKey,
          files: (await this.versionService.getFiles(version.id)).map(
            (file) => ({
              id: file.id,
              hash: file.hash,
              type: file.type,
            }),
          ),
        },
      });
    }
    return projects;
  }

  async getInfo(id: number) {
    try {
      const project = await this.prisma.tproject.findUnique({
        where: { id: id },
      });

      return !Number.isInteger(project?.id)
        ? { success: false, reason: 'UNKNOWN' }
        : {
            success: true,
            id: project.id,
            name: project.name,
            versions: (await this.versionService.getVersions(project.id)).map(
              (version) => ({
                id: version.id,
                versionNumber: version.versionNumber,
                timestamp: version.timestamp,
                songBPM: version.songBPM,
                songKey: version.songKey,
              }),
            ),
          };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async createProject(
    userId: number,
    name: string,
    songBPM?: number,
    songKey?: string,
  ) {
    if (!name || !String(name).trim())
      return { success: false, reason: 'INVALID_PROJECT_NAME' };

    let project: { id: number; name: string }, versionNumber: number;
    try {
      project = await this.prisma.tproject.create({
        data: { name: name },
      });

      versionNumber = await this.versionService.addVersion(
        project.id,
        songBPM,
        songKey,
      );

      await this.addUserToProject(project.id, userId, 'O');

      await this.storageService.createBucket(
        ProjectService.getBucketName(project.id),
      );
    } catch (error) {
      console.error(error);
      return { success: false, reason: 'UNKNOWN' };
    }

    return {
      success: true,
      project_id: project.id,
      versionNumber,
      name: project.name,
      songBPM,
      songKey,
    };
  }

  async renameProject(id: number, name: string) {
    try {
      await this.prisma.tproject.update({
        where: { id },
        data: { name },
      });

      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async deleteProject(id: number) {
    try {
      for (const version of await this.versionService.getVersions(id))
        await this.prisma.tprojectchecklist.deleteMany({
          where: {
            projectversionId: version.id,
          },
        });

      await this.prisma.tprojectversionfile.deleteMany({
        where: {
          tprojectversion: {
            project_id: id,
          },
        },
      });

      await this.prisma.tprojectversion.deleteMany({
        where: {
          project_id: id,
        },
      });

      await this.prisma.tprojectuser.deleteMany({
        where: { project_id: id },
      });

      await this.prisma.tproject.delete({
        where: { id },
      });

      await this.storageService.deleteBucket(ProjectService.getBucketName(id));

      return { success: true };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async getUserRole(projectId: number, userId: number) {
    return (
      (
        await this.prisma.tprojectuser.findFirst({
          where: {
            project_id: projectId,
            user_id: userId,
          },
          select: { role: true },
        })
      )?.role || null
    );
  }

  async getUserRoleBySession(projectId: number, request: Request) {
    const userId = await this.authService.getUserId(request);
    return userId ? await this.getUserRole(projectId, userId) : null;
  }

  async addUserToProject(
    projectId: number,
    userId: number,
    role: ProjectUserRole,
  ) {
    try {
      if (!(await this.userService.userExists(userId)))
        return { success: false, reason: 'USER_DOES_NOT_EXIST' };

      const projectUserId = (
        await this.prisma.tprojectuser.findFirst({
          where: {
            project_id: projectId,
            user_id: userId,
          },
          select: { id: true },
        })
      )?.id;

      if (projectUserId) {
        await this.prisma.tprojectuser.update({
          where: { id: projectUserId },
          data: { role },
        });
        return { success: true, action: 'UPDATED' };
      }

      await this.prisma.tprojectuser.create({
        data: {
          project_id: projectId,
          user_id: userId,
          role,
        },
      });
      return { success: true, action: 'ADDED' };
    } catch (_) {
      return { success: false, reason: 'UNKNOWN' };
    }
  }

  async removeUserFromProject(projectId: number, userId: number) {
    if (!(await this.userService.userExists(userId)))
      return { success: false, reason: 'USER_DOES_NOT_EXIST' };

    await this.prisma.tprojectuser.deleteMany({
      where: {
        project_id: projectId,
        user_id: userId,
      },
    });

    return { success: true };
  }

  async getProjectUsers(projectId: number) {
    return this.prisma.tprojectuser.findMany({
      where: {
        project_id: projectId,
      },
      select: {
        id: true,
        user_id: true,
        role: true,
      },
    });
  }

  async getProjectUsersFill(projectId: number) {
    const users = [];
    for (const { id, user_id, role } of await this.getProjectUsers(projectId)) {
      const { success, email, username, firstname, lastname } =
        await this.userService.getInfo(user_id);
      if (success)
        users.push({
          id,
          role,
          user: {
            id: user_id,
            email,
            username,
            firstname,
            lastname,
          },
        });
    }
    return users;
  }
}

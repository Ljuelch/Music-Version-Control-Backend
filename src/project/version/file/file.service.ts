import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { env, cwd } from 'process';
import { StorageService } from '../../../storage/storage.service';
import { createHash } from 'crypto';
import { ProjectService, ProjectUserRole } from '../../project.service';

@Injectable()
export class FileService {
  private static TMP_PATH = join(env.CWD || cwd(), 'tmp');

  static generateRandomHash() {
    return createHash('sha512')
      .update(new Date().getTime() + '' + Math.random())
      .digest('hex')
      .substring(0, 128);
  }

  static generateTmpPath() {
    return join(this.TMP_PATH, this.generateRandomHash());
  }

  static getFileNameByHash(hash: string, type?: string) {
    return type ? hash + '.' + type : hash;
  }

  static getFilePathByHash(hash: string, type?: string) {
    return join(this.TMP_PATH, this.getFileNameByHash(hash, type));
  }

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storageService: StorageService,
  ) {}

  private fileExistsByHash(hash: string, type?: string) {
    return existsSync(FileService.getFilePathByHash(hash, type));
  }

  private async uploadByHash(bucketName: string, hash: string, type?: string) {
    if (this.fileExistsByHash(hash, type)) {
      await this.storageService.uploadBuffer(
        bucketName,
        FileService.getFileNameByHash(hash, type),
        readFileSync(FileService.getFilePathByHash(hash, type)),
      );
      return true;
    }
    return false;
  }

  clearByHash(hash: string, type?: string) {
    if (this.fileExistsByHash(hash, type))
      unlinkSync(FileService.getFilePathByHash(hash, type));
  }

  async existsByHash(versionId: number, hash: string, type: string) {
    return !!(
      await this.prisma.tprojectversionfile.findFirst({
        where: {
          hash,
          type,
          projectversion_id: versionId,
        },
        select: { projectversion_id: true },
      })
    )?.projectversion_id;
  }

  async getUserFileRoleByFileHash(
    hash: string,
    userId: number,
  ): Promise<ProjectUserRole | null> {
    return (
      ((
        await this.prisma.tprojectuser.findFirst({
          where: {
            tproject: {
              tprojectversion: {
                some: {
                  tprojectversionfile: {
                    some: { hash },
                  },
                },
              },
            },
            user_id: userId,
          },
          select: { role: true },
        })
      )?.role as ProjectUserRole) || null
    );
  }

  async getFileByHash(hash: string) {
    const result = await this.prisma.tprojectversionfile.findFirst({
      where: { hash },
    });
    return result.id ? result : null;
  }

  async getUserFileAndRoleByFileHash(hash: string, userId: number) {
    const userFileRole = await this.getUserFileRoleByFileHash(hash, userId);
    return userFileRole
      ? {
          role: userFileRole,
          file: await this.getFileByHash(hash),
        }
      : {
          role: null,
          file: undefined,
        };
  }

  async getProjectIdByFileHash(hash: string) {
    return (
      (
        await this.prisma.tprojectversion.findFirst({
          where: {
            tprojectversionfile: {
              some: { hash },
            },
          },
          select: { project_id: true },
        })
      )?.project_id || null
    );
  }

  save(buffer: Buffer, type?: string): string {
    const hash = FileService.generateRandomHash();
    writeFileSync(FileService.getFilePathByHash(hash, type), buffer);
    return hash;
  }

  async addFile(
    versionId: number,
    bufferOrHash: Buffer | string | null,
    type: string,
    addToDB: boolean = true,
    upload: boolean | 'dry' = true,
    bucketName?: string,
    clear: boolean = true,
  ) {
    const hash =
      typeof bufferOrHash === 'string'
        ? bufferOrHash
        : bufferOrHash
        ? this.save(bufferOrHash, type)
        : FileService.generateRandomHash();

    if (addToDB && !(await this.existsByHash(versionId, hash, type)))
      await this.prisma.tprojectversionfile.create({
        data: {
          hash,
          type,
          projectversion_id: versionId,
        },
      });

    if (upload) {
      if (!bucketName)
        bucketName = ProjectService.getBucketName(
          await this.getProjectIdByFileHash(hash),
        );

      if (upload !== 'dry') await this.uploadByHash(bucketName, hash, type);
    }

    if (clear) this.clearByHash(hash, type);

    return { hash, bucketName };
  }
}

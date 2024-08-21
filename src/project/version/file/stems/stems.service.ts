import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FileService } from '../file.service';
import { lookup } from 'mime-types';

@Injectable()
export class StemsService {
  private static FILE_TYPE_STEM = 'stm';

  static typeFromFileName(filename: string): string | undefined {
    const mimetype = lookup(filename);
    if (mimetype) {
      if (mimetype.includes('audio/wav')) return 'wav';
      if (mimetype.includes('audio/aiff')) return 'aif';
      if (mimetype.includes('audio/mp3')) return 'mp3';
    }
  }

  constructor(
    private readonly prisma: PrismaClient,
    private readonly fileService: FileService,
  ) {}

  async addStem(
    versionId: number,
    fileName: string,
  ): Promise<
    | {
        success: true;
        stem: {
          id: number;
          projectversionfile_id: number;
          projectversionstemgroup_id: number;
          name: string;
          type: string;
        };
        hash: string;
      }
    | { success: false; reason: string }
  > {
    const stemGroup = await this.getCreateDefaultGroup(versionId);

    const { hash } = await this.fileService.addFile(
      versionId,
      null,
      StemsService.FILE_TYPE_STEM,
      true,
      false,
    );

    const fileEntry = await this.fileService.getFileByHash(hash);
    if (!fileEntry)
      return { success: false, reason: 'FILE_COULD_NOT_BE_INSERTED' };

    const stem = await this.insertStem(
      fileEntry.id,
      stemGroup.id,
      fileName,
      StemsService.typeFromFileName(fileName),
    );
    if (!stem) return { success: false, reason: 'STEM_COULD_NOT_BE_INSERTED' };

    return { success: true, stem, hash };
  }

  async getDefaultGroupByVersionId(versionId: number) {
    return this.prisma.tprojectversionstemsgroup.findFirst({
      where: {
        projectversion_id: versionId,
        name: null,
      },
    });
  }

  async createGroup(versionId: number, name: string | null) {
    return this.prisma.tprojectversionstemsgroup.create({
      data: {
        projectversion_id: versionId,
        name,
      },
    });
  }

  async createDefaultGroup(versionId: number) {
    return await this.createGroup(versionId, null);
  }

  async getCreateDefaultGroup(versionId: number) {
    const stemsGroup = await this.getDefaultGroupByVersionId(versionId);
    return stemsGroup || (await this.createDefaultGroup(versionId));
  }

  async getStems(versionId: number) {
    return this.prisma.tprojectversionstems.findMany({
      where: {
        tprojectversionfile: {
          projectversion_id: versionId,
        },
      },
    });
  }

  async getStem(stemId: number) {
    return this.prisma.tprojectversionstems.findUnique({
      where: { id: stemId },
    });
  }

  private async insertStem(
    fileId: number,
    groupId: number,
    name: string,
    type: string,
  ) {
    return this.prisma.tprojectversionstems.create({
      data: {
        projectversionfile_id: fileId,
        projectversionstemgroup_id: groupId,
        name,
        type,
      },
    });
  }

  async getFileByStemId(stemId: number) {
    return this.prisma.tprojectversionfile.findFirst({
      where: {
        tprojectversionstems: {
          some: {
            id: stemId,
          },
        },
      },
    });
  }

  async getProjectByStemId(stemId: number) {
    return this.prisma.tproject.findFirst({
      where: {
        tprojectversion: {
          some: {
            tprojectversionfile: {
              some: {
                tprojectversionstems: {
                  some: {
                    id: stemId,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}

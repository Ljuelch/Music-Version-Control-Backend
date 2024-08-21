import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuthService } from '../../../../auth/auth.service';
import { StemsService } from './stems.service';
import { VersionService } from '../../version.service';
import { ProjectService } from '../../../project.service';
import { StorageService } from '../../../../storage/storage.service';
import { FileService } from '../file.service';

@Controller('project/version/file/stems')
export class StemsController {
  constructor(
    private readonly service: StemsService,
    private readonly authService: AuthService,
    private readonly projectService: ProjectService,
    private readonly versionService: VersionService,
    private readonly fileService: FileService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async getStems(
    @Req() request: Request,
    @Query('projectId') projectId: string,
    @Query('versionNumber') versionNumber: string,
  ) {
    if (
      !(await this.projectService.getUserRoleBySession(
        parseInt(String(projectId)),
        request,
      ))
    )
      return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.versionService.getVersionId(
      parseInt(String(projectId)),
      parseInt(String(versionNumber)),
    );
    if (!versionId) return { success: false, reason: 'UNKNOWN' };

    return {
      success: true,
      stems: (await this.service.getStems(versionId)).map(
        ({ id, name, type }) => ({ id, name, type }),
      ),
    };
  }

  @Get('uploadURL')
  async getUploadURL(
    @Req() request: Request,
    @Query('projectId') projectId?: string,
    @Query('versionNumber') versionNumber?: string,
    @Query('fileName') fileName?: string,
  ) {
    if (!(await this.authService.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.versionService.getVersionId(
      parseInt(String(projectId)),
      parseInt(String(versionNumber)),
    );
    if (!versionId)
      return { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };

    const stemResult = await this.service.addStem(versionId, fileName);
    if (!stemResult.success) return { success: false, reason: 'UNKNOWN' };

    return {
      success: true,
      url: await this.storageService.getFileTmpUploadURL(
        ProjectService.getBucketName(
          await this.fileService.getProjectIdByFileHash(stemResult.hash),
        ),
        FileService.getFileNameByHash(
          stemResult.hash,
          StemsService.typeFromFileName(fileName),
        ),
      ),
    };
  }

  @Get('downloadURL')
  async getDownloadURL(@Req() request: Request, @Query('id') stemId?: string) {
    const stem = await this.service.getStem(parseInt(String(stemId)));
    if (!stem) return { success: false, reason: 'INVALID_STEM_ID' };

    const project = await this.service.getProjectByStemId(stem.id);
    if (!(await this.projectService.getUserRoleBySession(project.id, request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const file = await this.service.getFileByStemId(stem.id);
    return {
      success: true,
      name: stem.name,
      url: await this.storageService.getFileTmpURL(
        ProjectService.getBucketName(project.id),
        FileService.getFileNameByHash(file.hash, stem.type),
      ),
    };
  }
}

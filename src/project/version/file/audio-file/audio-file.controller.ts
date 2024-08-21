import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from '../../../../auth/auth.service';
import { ProjectService } from '../../../project.service';
import { FileService } from '../file.service';
import { Response } from 'express';
import { AudioFileService } from './audio-file.service';
import { StorageService } from '../../../../storage/storage.service';
import { VersionService } from '../../version.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('project/version/file/audio')
export class AudioFileController {
  constructor(
    private readonly service: AudioFileService,
    private readonly fileService: FileService,
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
    private readonly versionService: VersionService,
  ) {}

  @Post('upload/:projectId/:versionNumber')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudioFile(
    @Req() request: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('projectId') projectId: number,
    @Param('versionNumber') versionNumber: number,
  ) {
    if (!(await this.authService.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.versionService.getVersionId(
      parseInt(String(projectId)),
      parseInt(String(versionNumber)),
    );
    if (!versionId)
      return { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };

    if (!AudioFileService.evaluateMimeType(file))
      return { success: false, reason: 'INVALID_FILE_TYPE' };

    const { waveHash } = await this.service.addAudioFile(versionId, file);
    return { success: true, id: waveHash };
  }

  @Get('url/:type/:hash')
  async getAudioURL(
    @Req() request: Request,
    @Param('type') type: string,
    @Param('hash') hash: string,
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    const { role, file } = await this.fileService.getUserFileAndRoleByFileHash(
      hash,
      userId,
    );
    if (!role) return AuthService.INVALID_SESSION_RESPONSE;
    if (!file) return { success: false, reason: 'RESOURCE_NOT_FOUND' };

    return {
      success: true,
      url:
        this.storageService.getLocalStorageURL(
          ProjectService.getBucketName(
            await this.fileService.getProjectIdByFileHash(file.hash),
          ),
          FileService.getFileNameByHash(file.hash, type || file.type),
        ) ||
        (await this.storageService.getFileTmpURL(
          ProjectService.getBucketName(
            await this.fileService.getProjectIdByFileHash(file.hash),
          ),
          FileService.getFileNameByHash(file.hash, type || file.type),
        )),
    };
  }

  /* WARNING: DEPRECATED

  @Get('stream/:type/:hash')
  async getAudio(
    @Req() request: Request,
    @Res() response: Response,
    @Param('type') type: string,
    @Param('hash') hash: string,
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return response.status(HttpStatus.UNAUTHORIZED).send();

    const { role, file } = await this.service.getUserFileAndRoleByFileHash(
      hash,
      userId,
    );
    if (!role) return response.status(HttpStatus.UNAUTHORIZED).send();
    if (!file) return response.status(HttpStatus.NOT_FOUND).send();

    response.redirect(
      await this.storageService.getFileTmpURL(
        ProjectService.getBucketName(
          await this.service.getProjectIdByFileHash(file.hash),
        ),
        FileService.getFileNameByHash(file.hash, type || file.type),
      ),
    );
  }
  */

  @Get('waveformData/:hash')
  async getwaveformData(
    @Req() request: Request,
    @Res() response: Response,
    @Param('hash') hash: string,
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return response.status(HttpStatus.UNAUTHORIZED).send();

    const { role, file } = await this.fileService.getUserFileAndRoleByFileHash(
      hash,
      userId,
    );
    if (!role) return response.status(HttpStatus.UNAUTHORIZED).send();
    if (!file) return response.status(HttpStatus.NOT_FOUND).send();

    const bucketName = ProjectService.getBucketName(
        await this.fileService.getProjectIdByFileHash(file.hash),
      ),
      waveformFileName = AudioFileService.getWaveformFileName(file.hash);
    const localStorageURL = this.storageService.getLocalStorageURL(
      bucketName,
      waveformFileName,
    );

    if (localStorageURL) return response.send(localStorageURL);
    await this.storageService.pipeFile(response, bucketName, waveformFileName);
  }
}

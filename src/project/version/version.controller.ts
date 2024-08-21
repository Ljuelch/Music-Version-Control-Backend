import { Body, Controller, Get, Patch, Post, Query, Req } from '@nestjs/common';
import { VersionService } from './version.service';
import { AuthService } from '../../auth/auth.service';

@Controller('project/version')
export class VersionController {
  constructor(
    private readonly service: VersionService,
    private readonly authService: AuthService,
  ) {}

  @Post('create')
  async createVersion(
    @Req() request: Request,
    @Body() body: { projectId: number; songBPM?: number; songKey?: string },
  ) {
    if (!(await this.authService.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const result = await this.service.addVersion(
      parseInt(String(body.projectId)),
      body.songBPM ? parseInt(String(body.songBPM)) : undefined,
      body.songKey,
    );
    return result
      ? { success: true, version: result }
      : { success: false, reason: 'UNKNOWN' };
  }

  @Get('last')
  async getLastVersions(@Req() request: Request, @Query('id') id: number) {
    if (!(await this.authService.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const projectId = parseInt(String(id)),
      lastVersion = await this.service.getLastVersion(projectId);

    return lastVersion
      ? {
          success: true,
          versionNumber: lastVersion.versionNumber,
          timestamp: lastVersion.timestamp,
          songBPM: lastVersion.songBPM,
          songKey: lastVersion.songKey,
        }
      : { success: false, reason: 'INVALID_PROJECT' };
  }

  @Get('files')
  async getFiles(
    @Req() request: Request,
    @Query('id') id: number,
    @Query('version') version: number,
  ) {
    if (!(await this.authService.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.service.getVersionId(
      parseInt(String(id)),
      parseInt(String(version)),
    );
    if (!versionId)
      return { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };

    return (await this.service.getFiles(versionId)).map((file) => ({
      id: file.id,
      hash: file.hash,
      type: file.type,
    }));
  }

  @Patch('info')
  async setSongInfo(
    @Req() request: Request,
    @Body()
    body: {
      projectId: number;
      versionNumber: number;
      songBPM?: number;
      songKey?: string;
    },
  ) {
    if (!(await this.authService.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.service.getVersionId(
      parseInt(String(body.projectId)),
      parseInt(String(body.versionNumber)),
    );
    if (!versionId)
      return { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };

    return {
      success: true,
      updatedSongBPM: body.songBPM
        ? await this.service.setSongBPM(
            versionId,
            parseInt(String(body.songBPM)),
          )
        : false,
      updatedSongKey: body.songKey
        ? await this.service.setSongKey(versionId, body.songKey)
        : false,
    };
  }
}

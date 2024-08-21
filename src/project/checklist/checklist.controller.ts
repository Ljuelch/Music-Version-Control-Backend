import { Body, Controller, Get, Post, Patch, Req, Query } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { AuthService } from '../../auth/auth.service';
import { ProjectService } from '../project.service';
import { VersionService } from '../version/version.service';

@Controller('project/checklist')
export class ChecklistController {
  constructor(
    private readonly service: ChecklistService,
    private readonly authService: AuthService,
    private readonly projectService: ProjectService,
    private readonly versionService: VersionService,
  ) {}

  @Get('entries')
  async getEntries(
    @Req() request: Request,
    @Query('projectId') projectId: string,
    @Query('versionNumber') versionNumber: string,
    @Query('checked') checked?: string,
    @Query('includeOlder') includeOlder?: string,
  ) {
    const userRole = await this.projectService.getUserRoleBySession(
      +projectId,
      request,
    );
    if (!userRole) return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.versionService.getVersionId(
      +projectId,
      +versionNumber,
    );

    return versionId
      ? {
          success: true,
          entries: await this.service.getEntries(
            versionId,
            checked === '1' ? true : checked === '0' ? false : undefined,
            includeOlder === '1',
          ),
        }
      : { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };
  }

  @Post('entry/add')
  async addEntry(
    @Req() request: Request,
    @Body()
    body: {
      projectId: number;
      versionNumber: number;
      text: string;
      marker?: { color: string; start: number; end?: number }[];
    },
  ) {
    const userRole = await this.projectService.getUserRoleBySession(
      body.projectId,
      request,
    );
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    const versionId = await this.versionService.getVersionId(
      body.projectId,
      body.versionNumber,
    );

    return versionId
      ? await this.service.addEntry(
          versionId,
          userId,
          body.text,
          body.marker || [],
        )
      : { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };
  }

  @Patch('entry/rename')
  async renameEntry(
    @Req() request: Request,
    @Body()
    body: {
      entryId: number;
      text: string;
    },
  ) {
    const projectId = await this.service.getProjectIdByEntryId(body.entryId);
    if (!projectId) return { success: false, reason: 'INVALID_ENTRY_ID' };

    const thisVersionResult = await this.service.getProjectVersionByEntryId(
      body.entryId,
    );
    if (!thisVersionResult)
      return { success: false, reason: 'INVALID_ENTRY_ID' };

    const userRole = await this.projectService.getUserRoleBySession(
      projectId,
      request,
    );
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    const lastVersion = (await this.versionService.getLastVersion(
      projectId,
    )) as { versionNumber: number };
    if (thisVersionResult.versionNumber !== lastVersion?.versionNumber)
      return { success: false, reason: 'OLD_PROJECT_VERSION' };

    const versionId = await this.versionService.getVersionId(
      projectId,
      thisVersionResult.versionNumber,
    );

    return versionId
      ? await this.service.renameEntry(body.entryId, body.text)
      : { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };
  }

  @Post('entry/delete')
  async deleteEntry(
    @Req() request: Request,
    @Body() body: { entryId: number },
  ) {
    const projectId = await this.service.getProjectIdByEntryId(body.entryId);
    if (!projectId) return { success: false, reason: 'INVALID_ENTRY_ID' };

    const thisVersionResult = await this.service.getProjectVersionByEntryId(
      body.entryId,
    );
    if (!thisVersionResult)
      return { success: false, reason: 'INVALID_ENTRY_ID' };

    const userRole = await this.projectService.getUserRoleBySession(
      projectId,
      request,
    );
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    const lastVersion = (await this.versionService.getLastVersion(
      projectId,
    )) as { versionNumber: number };
    if (thisVersionResult.versionNumber !== lastVersion?.versionNumber)
      return { success: false, reason: 'OLD_PROJECT_VERSION' };

    const versionId = await this.versionService.getVersionId(
      projectId,
      thisVersionResult.versionNumber,
    );

    return versionId
      ? await this.service.deleteEntry(body.entryId)
      : { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };
  }

  @Patch('entry/check')
  async checkEntry(
    @Req() request: Request,
    @Body()
    body: {
      entryId: number;
      rejected: boolean;
    },
  ) {
    const projectId = await this.service.getProjectIdByEntryId(body.entryId);
    if (!projectId) return { success: false, reason: 'INVALID_ENTRY_ID' };

    const thisVersionResult = await this.service.getProjectVersionByEntryId(
      body.entryId,
    );
    if (!thisVersionResult)
      return { success: false, reason: 'INVALID_ENTRY_ID' };

    const userRole = await this.projectService.getUserRoleBySession(
      projectId,
      request,
    );
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    const lastVersion = (await this.versionService.getLastVersion(
      projectId,
    )) as { versionNumber: number };
    if (thisVersionResult.versionNumber !== lastVersion?.versionNumber)
      return { success: false, reason: 'OLD_PROJECT_VERSION' };

    const versionId = await this.versionService.getVersionId(
      projectId,
      thisVersionResult.versionNumber,
    );

    return versionId
      ? await this.service.checkEntry(
          body.entryId,
          thisVersionResult.id,
          !!body.rejected,
        )
      : { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };
  }

  @Patch('entry/uncheck')
  async uncheckEntry(
    @Req() request: Request,
    @Body() body: { entryId: number },
  ) {
    const projectId = await this.service.getProjectIdByEntryId(body.entryId);
    if (!projectId) return { success: false, reason: 'INVALID_ENTRY_ID' };

    const thisVersionResult = await this.service.getProjectVersionByEntryId(
      body.entryId,
    );
    if (!thisVersionResult)
      return { success: false, reason: 'INVALID_ENTRY_ID' };

    const userRole = await this.projectService.getUserRoleBySession(
      projectId,
      request,
    );
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    const lastVersion = (await this.versionService.getLastVersion(
      projectId,
    )) as { versionNumber: number };
    if (thisVersionResult.versionNumber !== lastVersion?.versionNumber)
      return { success: false, reason: 'OLD_PROJECT_VERSION' };

    const versionId = await this.versionService.getVersionId(
      projectId,
      thisVersionResult.versionNumber,
    );

    return versionId
      ? await this.service.uncheckEntry(body.entryId)
      : { success: false, reason: 'INVALID_PROJECT_OR_VERSION' };
  }

  @Post('entry/marker')
  async addMarker(
    @Req() request: Request,
    @Body()
    body: {
      entryId: number;
      color: string;
      start: number;
      end?: number;
    },
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    const projectId = await this.service.getProjectIdByEntryId(body.entryId);
    if (!projectId) return { success: false, reason: 'INVALID_ENTRY_ID' };

    const userRole = await this.projectService.getUserRole(projectId, userId);
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.addMarker(
      body.entryId,
      userId,
      body.color,
      body.start,
      body.end,
    );
  }

  @Patch('entry/marker/color')
  async setMarkerColor(
    @Req() request: Request,
    @Body() body: { markerId: number; color: string },
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    const projectId = await this.service.getProjectIdByMarkerId(body.markerId);
    if (!projectId) return { success: false, reason: 'INVALID_MARKER_ID' };

    const userRole = await this.projectService.getUserRole(projectId, userId);
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.setMarkerColor(body.markerId, body.color);
  }

  @Post('entry/marker/delete')
  async deleteMarker(
    @Req() request: Request,
    @Body() body: { markerId?: number; markerIds?: number[] },
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    const projectId = await this.service.getProjectIdByMarkerId(
      body.markerId || body.markerIds[0],
    );
    if (!projectId) return { success: false, reason: 'INVALID_MARKER_ID' };

    const userRole = await this.projectService.getUserRole(projectId, userId);
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.deleteMarker(
      body.markerId ? [body.markerId] : body.markerIds,
    );
  }
}

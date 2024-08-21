import { Body, Controller, Get, Patch, Post, Query, Req } from '@nestjs/common';
import { ProjectService } from './project.service';
import { AuthService } from '../auth/auth.service';
import { VersionService } from './version/version.service';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly service: ProjectService,
    private readonly authService: AuthService,
    private readonly versionService: VersionService,
  ) {}

  @Get('all')
  async getProjects(@Req() request: Request) {
    const userId = await this.authService.getUserId(request);
    return userId
      ? await this.service.getProjects(userId)
      : AuthService.INVALID_SESSION_RESPONSE;
  }

  @Get('info')
  async getInfo(
    @Req() request: Request,
    @Query('id') id: number,
    @Query('versionId') versionId: number,
  ) {
    id = versionId
      ? await this.versionService.getProjectIdByVersionId(+versionId)
      : +id;

    const userRole = await this.service.getUserRoleBySession(id, request);
    if (!userRole) return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.getInfo(id);
  }

  @Post('create')
  async create(
    @Req() request: Request,
    @Body() body: { name: string; songBPM?: number; songKey?: string },
  ) {
    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.createProject(
      userId,
      body.name,
      body.songBPM ? parseInt(String(body.songBPM)) : undefined,
      body.songKey,
    );
  }

  @Patch('rename')
  async rename(
    @Req() request: Request,
    @Body() body: { id: number; name: string },
  ) {
    const userRole = await this.service.getUserRoleBySession(
      parseInt(String(body.id)),
      request,
    );
    if (userRole !== 'O' && userRole !== 'A')
      return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.renameProject(
      parseInt(String(body.id)),
      body.name,
    );
  }

  @Post('delete')
  async delete(@Req() request: Request, @Body() body: { id: number }) {
    const userRole = await this.service.getUserRoleBySession(
      parseInt(String(body.id)),
      request,
    );
    if (userRole !== 'O') return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.deleteProject(parseInt(String(body.id)));
  }

  @Post('user/add')
  async addUser(
    @Req() request: Request,
    @Body() body: { id: number; user_id: number; role: string },
  ) {
    const userRole = await this.service.getUserRoleBySession(
      parseInt(String(body.id)),
      request,
    );
    if (userRole !== 'O') return AuthService.INVALID_SESSION_RESPONSE;

    if (body.role !== 'O' && body.role !== 'A' && body.role !== 'S')
      return { success: false, message: 'INVALID_ROLE' };

    return await this.service.addUserToProject(
      parseInt(String(body.id)),
      parseInt(String(body.user_id)),
      body.role,
    );
  }

  @Post('user/remove')
  async removeUser(
    @Req() request: Request,
    @Body() body: { id: number; user_id: number },
  ) {
    const userRole = await this.service.getUserRoleBySession(
      parseInt(String(body.id)),
      request,
    );
    if (userRole !== 'O') return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.removeUserFromProject(
      parseInt(String(body.id)),
      parseInt(String(body.user_id)),
    );
  }

  @Get('users')
  async getUsers(@Req() request: Request, @Query('id') id: number) {
    id = parseInt(String(id));

    const userId = await this.authService.getUserId(request);
    if (!userId) return AuthService.INVALID_SESSION_RESPONSE;

    if (!(await this.service.getUserRole(id, userId)))
      return AuthService.INVALID_SESSION_RESPONSE;

    return {
      success: true,
      users: (await this.service.getProjectUsersFill(id)).map((user) => {
        user.user.isSelf = user.user.id === userId;
        //delete user.user.id;
        return user;
      }),
    };
  }
}

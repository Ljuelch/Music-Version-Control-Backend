import { Body, Controller, Post, Patch, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  async login(@Body() body: { login: string; password: string }) {
    return await this.service.login(body.login, body.password);
  }

  @Post('logout')
  async logout(@Req() request: Request) {
    if (!(await this.service.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;

    return await this.service.logout(request['cookies']['session']);
  }

  @Patch('updateSession')
  async updateSession(@Req() request: Request) {
    if (!(await this.service.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;
    return await this.service.updateSession(request['cookies']['session']);
  }

  @Get('validateSession')
  async validateSession(@Req() request: Request) {
    if (!(await this.service.validateSession(request)))
      return AuthService.INVALID_SESSION_RESPONSE;
    return { success: await this.service.validateSession(request) };
  }
}

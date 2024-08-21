import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaClient } from '@prisma/client';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ProjectController } from './project/project.controller';
import { ProjectService } from './project/project.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { VersionController } from './project/version/version.controller';
import { VersionService } from './project/version/version.service';
import { FileController } from './project/version/file/file.controller';
import { FileService } from './project/version/file/file.service';
import { ChecklistService } from './project/checklist/checklist.service';
import { ChecklistController } from './project/checklist/checklist.controller';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailService } from './mail/mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { env } from 'process';
import { NotificationService } from './notification/notification.service';
import { NotificationController } from './notification/notification.controller';
import { StorageService } from './storage/storage.service';
import { TranslationService } from './translation/translation.service';
import { ResetPasswordController } from './reset-password/reset-password.controller';
import { ResetPasswordService } from './reset-password/reset-password.service';
import { AudiowaveformService } from './audiowaveform/audiowaveform.service';
import { AudioFileService } from './project/version/file/audio-file/audio-file.service';
import { AudioFileController } from './project/version/file/audio-file/audio-file.controller';
import { StemsService } from './project/version/file/stems/stems.service';
import { StemsController } from './project/version/file/stems/stems.controller';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: env.SMTP_HOST,
      defaults: {
        from: env.SMTP_FROM,
      },
      template: {
        dir: MailService.DIR,
        adapter: new HandlebarsAdapter(undefined, {
          inlineCssEnabled: true,
        }),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    ProjectController,
    UserController,
    VersionController,
    FileController,
    ChecklistController,
    NotificationController,
    ResetPasswordController,
    AudioFileController,
    StemsController,
  ],
  providers: [
    AppService,
    PrismaClient,
    AuthService,
    ProjectService,
    UserService,
    VersionService,
    FileService,
    ChecklistService,
    MailService,
    NotificationService,
    TranslationService,
    ResetPasswordService,
    StorageService,
    AudiowaveformService,
    AudioFileService,
    StemsService,
  ],
})
export class AppModule {}

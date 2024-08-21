import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { env, chdir, cwd } from 'process';
import { AudiowaveformService } from './audiowaveform/audiowaveform.service';
import * as process from 'process';
import { MailService } from './mail/mail.service';

async function bootstrap() {
  config();

  const logger = new Logger('bootstrap');

  if (env.CWD) chdir(env.CWD);
  logger.log('CWD: ' + cwd());

  const mailServiceAvailability = MailService.checkServiceAvailability();
  if (!mailServiceAvailability.success) {
    if (mailServiceAvailability.error === 'SCSS_NOT_COMPILED') {
      await MailService.compileScss();
      logger.warn('compiled MailService template SCSS');
    } else {
      logger.error(mailServiceAvailability.message);
      return process.exit(1);
    }
  }

  const audioWaveformService = new AudiowaveformService();
  const { wasInstalled, installedSuccessfully } =
    await audioWaveformService.install();
  if (!wasInstalled && !installedSuccessfully) {
    logger.error(
      "audiowaveform need to be installed! Install using: 'sudo npm run install:audiowaveform:<debian|ubuntu|macosx>'",
    );
    return process.exit(1);
  }
  await audioWaveformService.printVersion();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    allowedHeaders: ['content-type'],
  });
  await app.listen(3000);
}

bootstrap().then();

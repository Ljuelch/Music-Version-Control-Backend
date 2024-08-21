import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import Handlebars from 'handlebars';
import * as process from 'process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';

@Injectable()
export class MailService {
  static readonly DIR = join(
    process.env.CWD || process.cwd(),
    '/template/mail',
  );

  static checkServiceAvailability(): {
    success: boolean;
    error?: string;
    message?: string;
  } {
    if (!existsSync(join(this.DIR, 'css/style.css')))
      return {
        success: false,
        error: 'SCSS_NOT_COMPILED',
        message:
          'Mail template SCSS is not compiled! compile using: npm run sass:mail',
      };
    return { success: true };
  }

  static compileScss() {
    return new Promise<void>(async (resolve) => {
      exec('npm run sass:mail', async () => resolve());
    });
  }

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(
    to: string,
    subject: string,
    template: string,
    param: object = {},
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: 'index.hbs',
        context: {
          header: Handlebars.compile(
            readFileSync(MailService.DIR + '/partials/header.hbs').toString(),
            {},
          ),

          footer: Handlebars.compile(
            readFileSync(MailService.DIR + '/partials/footer.hbs').toString(),
          )({}),

          body: Handlebars.compile(
            readFileSync(
              MailService.DIR + '/templates/' + template + '.hbs',
            ).toString(),
          )(param),

          css: readFileSync(MailService.DIR + '/css/style.css').toString(),

          subject,
          template,
        },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
}

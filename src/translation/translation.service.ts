import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { Translation as TranslationInterface } from './translation.interface';
import { TranslationParam as TranslationParamInterface } from './translation-param.interface';
import * as process from 'process';
import { join } from 'path';

@Injectable()
export class TranslationService {
  readonly PATH = join(process.env.CWD || process.cwd(), '/assets/i18n');
  readonly LANGUAGES = ['en'];
  protected readonly PARAM_PREFIX = '%';

  private translations: TranslationInterface[] = [];

  constructor() {
    this.parseTranslations();
  }

  private getTranslationFile(language: string): string {
    return join(this.PATH, language + '.json');
  }

  private parseTranslationFile(language: string): object {
    return JSON.parse(
      readFileSync(this.getTranslationFile(language)).toString(),
    );
  }

  parseTranslations() {
    for (const language of this.LANGUAGES)
      this.translations[language] = this.parseTranslationFile(language);
  }

  private replaceParam(translation: string, key: string, value?: string) {
    return value
      ? translation.replaceAll(
          this.PARAM_PREFIX + key + this.PARAM_PREFIX,
          value,
        )
      : translation;
  }

  private replaceParams(
    translation: string,
    params: TranslationParamInterface,
  ) {
    for (const key in params)
      translation = this.replaceParam(translation, key, params[key]);
    return translation;
  }

  getTranslation(
    language: string,
    key: string,
    params: TranslationParamInterface = {},
  ): string {
    let translations: TranslationInterface | string =
      this.translations[language];
    for (const singleKey of key.split('.')) {
      translations = translations[singleKey];
      if (typeof translations === 'string') break;
    }
    return this.replaceParams(translations as string, params);
  }
}

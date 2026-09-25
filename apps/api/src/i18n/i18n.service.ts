import { Injectable } from "@nestjs/common";
import { locales, SupportedLanguage } from "@schoolerp/i18n";

@Injectable()
export class I18nService {
  private readonly supportedLanguages: SupportedLanguage[] = ["en", "hi", "mr"];

  translate(key: string, lang: SupportedLanguage = "en"): string {
    const targetLang = this.supportedLanguages.includes(lang) ? lang : "en";
    const dict = locales[targetLang] as Record<string, string>;
    const fallback = locales.en as Record<string, string>;
    return dict[key] || fallback[key] || key;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return this.supportedLanguages;
  }
}

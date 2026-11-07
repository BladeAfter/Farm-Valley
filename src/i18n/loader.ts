import {
  detectLocale,
  direction,
  resolveLocale,
  type Locale,
} from "./languages";
import { installLocale, translations, useLocale } from "./core";
const modules = import.meta.glob<{ default: Record<string, string> }>(
  "./locales/*/index.ts",
);
const key = "farm-valley.language.v1";
let change = 0;
function readPreference() {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
async function load(locale: Locale) {
  if (translations[locale]) return;
  const cache = "farm-valley.language-cache.v1." + locale;
  try {
    const module = await modules[`./locales/${locale}/index.ts`]();
    installLocale(locale, module.default);
    try {
      localStorage.setItem(cache, JSON.stringify(module.default));
    } catch {}
  } catch (error) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(cache);
    } catch {}
    if (!saved) throw error;
    const dictionary: unknown = JSON.parse(saved);
    if (!dictionary || typeof dictionary !== "object" || Array.isArray(dictionary) ||
      !Object.values(dictionary).every(value => typeof value === "string")) throw error;
    installLocale(locale, dictionary as Record<string, string>);
  }
}
export async function changeLanguage(locale: Locale, manual = true) {
  const current = ++change;
  await load(locale);
  if (current !== change) return;
  useLocale.setState((state) => ({
    locale,
    manual: manual || state.manual,
    revision: state.revision + 1,
  }));
  document.documentElement.lang = locale;
  document.documentElement.dir = direction(locale);
  if (manual)
    try {
      localStorage.setItem(key, locale);
    } catch {}
}
export async function initializeI18n() {
  const preference = readPreference(),
    locale = detectLocale(
      preference,
      navigator.languages ?? [navigator.language],
    );
  await load("en");
  try {
    await changeLanguage(locale, !!preference);
  } catch {
    await changeLanguage("en", false);
  }
}
export async function acceptServerLocale(locale?: string) {
  if (locale && !useLocale.getState().manual && resolveLocale(locale)!==useLocale.getState().locale)
    await changeLanguage(resolveLocale(locale), false).catch(() => {});
}

export const languages = [
  { id: "pt-BR", name: "Português (Brasil)", dir: "ltr" },
  { id: "en", name: "English", dir: "ltr" },
  { id: "es", name: "Español", dir: "ltr" },
  { id: "ru", name: "Русский", dir: "ltr" },
  { id: "tr", name: "Türkçe", dir: "ltr" },
  { id: "fa", name: "فارسی", dir: "rtl" },
  { id: "ar", name: "العربية", dir: "rtl" },
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "de", name: "Deutsch", dir: "ltr" },
  { id: "it", name: "Italiano", dir: "ltr" },
  { id: "id", name: "Bahasa Indonesia", dir: "ltr" },
  { id: "hi", name: "हिन्दी", dir: "ltr" },
  { id: "zh-CN", name: "简体中文", dir: "ltr" },
  { id: "ja", name: "日本語", dir: "ltr" },
  { id: "ko", name: "한국어", dir: "ltr" },
  { id: "pl", name: "Polski", dir: "ltr" },
] as const;
export type Locale = (typeof languages)[number]["id"];
export const localeIds = languages.map((language) => language.id) as [
  Locale,
  ...Locale[],
];
export function resolveLocale(value?: string | null): Locale {
  const normalized = value?.replace(/_/g, "-").toLowerCase() ?? "";
  const exact = languages.find(
    (language) => language.id.toLowerCase() === normalized,
  );
  if (exact) return exact.id;
  const base = normalized.split("-")[0];
  if (base === "pt") return "pt-BR";
  if (base === "zh") return "zh-CN";
  return languages.find((language) => language.id === base)?.id ?? "en";
}
export function detectLocale(
  preference: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (preference) return resolveLocale(preference);
  for (const value of browserLanguages) {
    const result = resolveLocale(value);
    if (result !== "en" || value.toLowerCase().startsWith("en")) return result;
  }
  return "en";
}
export const direction = (locale: Locale) =>
  languages.find((language) => language.id === locale)!.dir;
export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    values[key] === undefined ? "…" : String(values[key]),
  );
}
export const pluralCategory = (locale: Locale, count: number) =>
  new Intl.PluralRules(locale).select(count);

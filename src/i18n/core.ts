import { create } from "zustand";
import { pluralOverrides } from "./plurals";
import { interpolate, pluralCategory, type Locale } from "./languages";
export const useLocale = create<{
  locale: Locale;
  manual: boolean;
  revision: number;
}>(() => ({ locale: "pt-BR", manual: false, revision: 0 }));
export const translations: Partial<Record<Locale, Record<string, string>>> = {};
const missing = new Set<string>();
export function installLocale(
  locale: Locale,
  dictionary: Record<string, string>,
) {
  translations[locale] = { ...dictionary, ...pluralOverrides[locale] };
}
export function t(
  key: string,
  values: Record<string, string | number> = {},
): string {
  const locale = useLocale.getState().locale,
    dictionary = translations[locale] ?? {};
  const count = values.count;
  const selected =
    typeof count === "number" ? key + "_" + pluralCategory(locale, count) : key;
  const text =
    dictionary[selected] ??
    dictionary[typeof count === "number" ? key + "_other" : key] ??
    dictionary[key] ??
    translations.en?.[selected] ??
    translations.en?.[key + "_other"] ??
    translations.en?.[key] ??
    translations["pt-BR"]?.[key];
  if (typeof text !== "string") {
    if (!missing.has(locale + key)) {
      missing.add(locale + key);
      console.warn("Missing translation", locale, key);
    }
    return "…";
  }
  const formatted = Object.fromEntries(
    Object.entries(values).map(([id, value]) => [
      id,
      typeof value === "number"
        ? new Intl.NumberFormat(locale).format(value)
        : value,
    ]),
  );
  return interpolate(text, formatted);
}
export const number = (value: number) =>
  new Intl.NumberFormat(useLocale.getState().locale).format(value);
export function duration(ms: number) {
  const locale = useLocale.getState().locale,
    total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600),
    minutes = Math.floor(total / 60) % 60,
    seconds = total % 60;
  const parts: string[] = [];
  if (hours)
    parts.push(
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "hour",
        unitDisplay: "short",
      }).format(hours),
    );
  if (minutes)
    parts.push(
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "minute",
        unitDisplay: "short",
      }).format(minutes),
    );
  if (!hours && (seconds || !parts.length))
    parts.push(
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "second",
        unitDisplay: "short",
      }).format(seconds),
    );
  return new Intl.ListFormat(locale, { style: "short", type: "unit" }).format(
    parts,
  );
}

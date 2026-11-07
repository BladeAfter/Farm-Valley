import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { detectLocale, resolveLocale, direction, languages, pluralCategory } from "../src/i18n/languages";
import { installLocale, t, number, duration, useLocale } from "../src/i18n/core";

test("language variants, manual preference and RTL preserve stable locale IDs", () => {
  for (const [input, expected] of [["pt-PT","pt-BR"],["es-MX","es"],["fa-IR","fa"],["zh-TW","zh-CN"],["en-US","en"],["xx","en"]]) assert.equal(resolveLocale(input),expected);
  assert.equal(detectLocale("ja",["pt-BR"]),"ja");
  assert.equal(detectLocale(null,["xx","de-DE"]),"de");
  assert.equal(direction("ar"),"rtl");
  assert.equal(direction("fa"),"rtl");
  assert.equal(direction("pt-BR"),"ltr");
  assert.equal(pluralCategory("ru",2),"few");
  assert.equal(pluralCategory("ar",2),"two");
});

test("all sixteen packs have matching nonempty keys and interpolation variables", async () => {
  let baseline: Record<string,string> | undefined;
  for (const {id} of languages) {
    const pack: Record<string,string> = {};
    for(const file of await readdir(`src/i18n/locales/${id}`)) {
      if(!file.endsWith(".json"))continue;
      const entries=JSON.parse(await readFile(`src/i18n/locales/${id}/${file}`,"utf8"));
      for(const [key,value] of Object.entries(entries)) pack[file.slice(0,-5)+"."+key]=value as string;
    }
    baseline ??=pack;
    assert.deepEqual(Object.keys(pack).sort(),Object.keys(baseline).sort());
    for(const [key,value] of Object.entries(pack)) {
      assert.ok(value.trim(),`${id}/${key}`);
      const variables=(text:string)=>[...text.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]).sort();
      assert.deepEqual(variables(value),variables(baseline[key]),`${id}/${key}`);
    }
    installLocale(id,pack);
    useLocale.setState({locale:id});
    assert.equal(number(123456),new Intl.NumberFormat(id).format(123456));
    assert.ok(duration(65000).length>0);
    assert.ok(!t("common.level",{level:12}).includes("{{"));
  }
  useLocale.setState({locale:"pt-BR"});
});

test("Russian, Polish and Arabic use their additional plural forms", () => {
  for(const locale of ["ru","pl","ar"] as const)installLocale(locale,{});
  useLocale.setState({locale:"ru"});assert.equal(t("orders.count",{count:2}),"2 заказа");
  useLocale.setState({locale:"pl"});assert.equal(t("orders.count",{count:2}),"2 zamówienia");
  useLocale.setState({locale:"ar"});assert.ok(t("orders.count",{count:2}).startsWith("طلبان"));
  useLocale.setState({locale:"pt-BR"});
});

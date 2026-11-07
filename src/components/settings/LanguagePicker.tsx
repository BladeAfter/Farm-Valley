import { useState } from "react";
import { Check, Globe, Search } from "lucide-react";
import { languages, type Locale } from "../../i18n/languages";
import { t, useLocale } from "../../i18n/core";
import { changeLanguage } from "../../i18n/loader";
import { useFarm } from "../../store/useFarm";
export function LanguagePicker(){
 const {locale}=useLocale(),{act}=useFarm();
 const [expanded,setExpanded]=useState(false),[search,setSearch]=useState(""),[loading,setLoading]=useState<Locale|null>(null),[failed,setFailed]=useState(false);
 const choose=async(id:Locale)=>{setLoading(id);setFailed(false);try{await changeLanguage(id);void act({type:"set-language",locale:id});}catch{setFailed(true);}finally{setLoading(null);}};
 return <section className="language-picker" data-language-picker>
  <button className="settings-option" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><Globe/><span><b>{t("common.language")}</b><small lang={locale} dir="auto">{languages.find(l=>l.id===locale)!.name}</small></span></button>
  {expanded&&<div className="language-content"><label className="language-search"><Search size={16}/><input type="search" aria-label={t("common.search")} placeholder={t("common.search")} value={search} onChange={event=>setSearch(event.target.value)}/></label>
   <div className="language-list" role="group" aria-label={t("common.language")}>{languages.filter(l=>(l.name+" "+l.id).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(language=><button key={language.id} type="button" data-locale={language.id} aria-pressed={locale===language.id} disabled={loading!==null} onClick={()=>void choose(language.id)}>
    <span lang={language.id} dir="auto">{language.name}</span><small dir="ltr">{loading===language.id?"…":language.id}</small>{locale===language.id&&<Check size={16}/>}</button>)}</div>
   {failed&&<small role="alert">{t("errors.actionFailed")}</small>}
  </div>}
 </section>;
}

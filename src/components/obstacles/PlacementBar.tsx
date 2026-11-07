import { useFarm } from "../../store/useFarm";
import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
export function PlacementBar() {
 const { fruitSpecies,machineKinds,pens }=useLabels();
 const { placement,placementTarget,startPlacement,act,busy,snapshot }=useFarm();
 if(!placement)return null;
 const moving=["moveMachine","pen","moveField","building"].includes(placement.kind);
 const name=placement.kind==="machine"?machineKinds[placement.machineKind].name:
  placement.kind==="moveMachine"?machineKinds[snapshot?.farm.machines.find(m=>m.id===placement.machineId)?.kind??"feedMill"].name:
  placement.kind==="fruitTree"?fruitSpecies[placement.species].name:
  placement.kind==="sheep"?pens.sheep.title:
  placement.kind==="pen"?pens[placement.animalKind].title:
  placement.kind==="building"?t("farm."+placement.buildingId):
  placement.kind==="decoration"?t("farm.flowers"):t("farm.field");
 const price=placement.kind==="machine"?machineKinds[placement.machineKind].price:placement.kind==="fruitTree"?fruitSpecies[placement.species].price:placement.kind==="sheep"?120:placement.kind==="field"?5:placement.kind==="decoration"?8:0;
 return <div className="placement-bar"><span>{moving?t("farm.reposition",{name}):name}{price>0&&<> · {t("common.coinValue",{coins:price})}</>}
  <small>{t(placement.kind==="machine"?"farm.confirmBuild":moving?"farm.moveHint":"farm.placeHint")}</small></span>
  {placement.kind==="machine"&&<button className="primary" disabled={busy||!placementTarget} onClick={async()=>{if(placementTarget&&await act({type:"buy-machine",kind:placement.machineKind,...placementTarget}))startPlacement(null);}}>{t("common.build")}</button>}
  <button disabled={busy} onClick={()=>startPlacement(null)}>{t("common.cancel")}</button></div>;
}

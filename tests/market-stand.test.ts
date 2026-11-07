import { test } from "node:test";
import assert from "node:assert/strict";
import { initialFarm,migrateFarm } from "../server/services/farm";
import { occupancyIssue } from "../src/data/land";
test("banca ocupa área livre, bloqueia novas construções e mantém posição no save",()=>{
 const farm=initialFarm(),position=farm.marketStand!;
 assert.ok(position);
 const copy=structuredClone(farm);delete copy.marketStand;
 assert.equal(occupancyIssue(copy,{x:position.x-.75,y:position.y-.75,w:1.5,h:1.5}),null);
 assert.match(occupancyIssue(farm,{x:position.x-.5,y:position.y-.5,w:1,h:1})!,/mercado/);
 assert.deepEqual(migrateFarm(JSON.parse(JSON.stringify(farm))).marketStand,position);
});
test("migração da banca não altera estoque, economia, objetos ou pedidos existentes",()=>{
 const farm=initialFarm();delete farm.marketStand;
 const original=structuredClone(farm),migrated=migrateFarm(farm);
 assert.ok(migrated.marketStand);
 for(const key of ["inventory","coins","diamonds","xp","plots","animals","buildingPositions","penPositions","machines","fruitTrees","obstacles","orderBoard"] as const)assert.deepEqual(migrated[key],original[key],key);
 assert.equal(farm.marketStand,undefined);
});

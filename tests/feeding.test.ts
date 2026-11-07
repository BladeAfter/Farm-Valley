import test from "node:test";
import assert from "node:assert/strict";
import { feedingStage, feedingVisuals } from "../src/data/feeding";
import { initialFarm, applyCommand } from "../server/services/farm";
import { animalProducts, type AnimalKind } from "../src/types/game";
test("comida visual depende de alimentação confirmada e diminui até desaparecer em cada espécie", () => {
  for (const kind of Object.keys(feedingVisuals) as AnimalKind[]) {
    const config = feedingVisuals[kind];
    assert.equal(feedingStage({kind,fedAt:null},10000),0);
    assert.equal(feedingStage({kind,fedAt:1000},999),0);
    let previous = 5;
    for(let time=1000;time<1000+config.duration;time+=100) {
      const stage = feedingStage({kind,fedAt:1000},time);
      assert.ok(stage <= previous && stage > 0); previous = stage;
    }
    assert.equal(feedingStage({kind,fedAt:1000},1000+config.duration),0);
  }
});
test("alimentação visual não consome ração novamente e não interfere no prazo de produção", () => {
  const initial = initialFarm(), kind = "goat", feed = animalProducts[kind].feed;
  initial.inventory[feed] = 1;
  const fed = applyCommand(initial,{type:"feed-animal",animalId:"goat-1"},1000);
  const goat = fed.animals.find(a=>a.id==="goat-1")!;
  for(let i=0;i<200;i++) feedingStage(goat,1000+i*100);
  assert.equal(fed.inventory[feed],0);
  assert.equal(goat.production!.readyAt,1000+animalProducts[kind].duration);
  assert.equal(feedingStage(goat,20000),0);
  assert.throws(()=>applyCommand(fed,{type:"feed-animal",animalId:"goat-1"},20000));
  const restored = structuredClone(fed);
  assert.equal(restored.animals.find(a=>a.id==="goat-1")!.production!.readyAt,goat.production!.readyAt);
});

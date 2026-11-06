import { useFarm } from "../../store/useFarm";
import { fruitSpecies, fruitStage } from "../../types/orchard";
import { barnUsed, storageCapacity } from "../../types/game";
export function orchardTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000)),
    h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  return h
    ? String(h).padStart(2, "0") + "h " + String(m).padStart(2, "0") + "min"
    : String(m).padStart(2, "0") + "min " + String(s).padStart(2, "0") + "s";
}
export function FruitTreePanel({ now }: { now: number }) {
  const { snapshot, fruitTreeId, act, busy, open } = useFarm(),
    farm = snapshot?.farm,
    tree = farm?.fruitTrees.find((t) => t.id === fruitTreeId);
  if (!farm || !tree || tree.removedAt !== null) return null;
  const config = fruitSpecies[tree.species],
    stage = fruitStage(tree, now),
    growing = stage === "seedling" || stage === "growing",
    full = barnUsed(farm) + config.yield > storageCapacity(farm, "barn");
  const progress = growing
    ? (now - tree.plantedAt) / (tree.growsAt - tree.plantedAt)
    : (now - (tree.readyAt - config.duration)) / config.duration;
  return (
    <div className="fruit-tree-panel">
      <img
        className="fruit-panel-icon"
        src={"/assets/products/fruits/" + tree.species + ".svg"}
        alt=""
      />
      {stage === "ready" ? (
        <>
          <p>
            Produção pronta:{" "}
            <b>
              {config.yield} {config.fruit.toLocaleLowerCase("pt-BR")}
            </b>
          </p>
          {full && <p className="land-warning">Seu celeiro está cheio.</p>}
          <button
            className="primary"
            disabled={busy || full}
            onClick={() =>
              void act({
                type: "harvest-fruit-tree",
                treeId: tree.id,
                expectedHarvestCount: tree.harvestCount,
              })
            }
          >
            Colher {config.yield} {config.fruit.toLocaleLowerCase("pt-BR")}
          </button>
        </>
      ) : stage === "dry" ? (
        <>
          <p>Esta árvore encerrou seu ciclo de produção.</p>
          <p>Serrotes disponíveis: {farm.inventory.saw}</p>
          <button
            className="primary"
            disabled={busy || farm.inventory.saw < 1}
            onClick={async () => {
              if (await act({ type: "remove-fruit-tree", treeId: tree.id }))
                open(null);
            }}
          >
            Remover árvore seca · 1 serrote
          </button>
        </>
      ) : (
        <>
          <p>
            {growing
              ? "Sua muda está crescendo."
              : "Produzindo novas " +
                config.fruit.toLocaleLowerCase("pt-BR") +
                "..."}
          </p>
          <div className="fruit-progress">
            <span
              style={{ width: Math.max(0, Math.min(1, progress)) * 100 + "%" }}
            />
          </div>
          <b>
            {growing ? "Árvore adulta em: " : "Próxima colheita: "}
            {orchardTime((growing ? tree.growsAt : tree.readyAt) - now)}
          </b>
          <p className="subtle">A produção continua quando você sai do jogo.</p>
        </>
      )}
      <small className="subtle">
        Colheitas realizadas: {tree.harvestCount}
      </small>
    </div>
  );
}

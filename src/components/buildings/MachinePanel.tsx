import { useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { useFarm } from "../../store/useFarm";
import { items } from "../../types/game";
import {
  canAffordRecipe,
  machineImage,
  machineKinds,
  machineMastery,
  masteryStages,
  queueUpgradePrices,
  recipeDuration,
  recipeIds,
  recipeIngredients,
  recipes,
  recipeUnlocked,
  type RecipeId,
} from "../../data/production";
import { formatTime } from "../../utils/time";
import { GameTabs, ProgressIndicator, RecipeCard } from "../ui/GameComponents";
import { ProductionQueue } from "./ProductionQueue";

export function MasteryStars({ count }: { count: number }) {
  return (
    <span
      className="mastery-stars"
      aria-label={count + " de 3 estrelas de maestria"}
    >
      {[1, 2, 3].map((star) => (
        <Star
          key={star}
          size={18}
          fill={star <= count ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export function MachinePanel({ now }: { now: number }) {
  const { snapshot, machineId, act, busy } = useFarm();
  const [selection, setSelection] = useState<RecipeId>("chickenFeed");
  const [filter, setFilter] = useState<"all" | "available" | "locked">("all");
  const [masteryOpen, setMasteryOpen] = useState(false);
  const farm = snapshot?.farm,
    machine = farm?.machines.find((m) => m.id === machineId);
  if (!farm || !machine) return null;
  const ids = recipeIds.filter((id) => recipes[id].machine === machine.kind);
  const selected = ids.includes(selection) ? selection : ids[0],
    recipe = recipes[selected];
  const mastery = machineMastery(machine),
    next = masteryStages.find((stage) => stage.batches > machine.completed),
    stars = masteryStages.indexOf(mastery);
  const running = machine.jobs.some(
      (job) => now >= job.startedAt && now < job.readyAt,
    ),
    slotPrice = queueUpgradePrices[machine.slots - 2];
  const visible = ids.filter(
    (id) =>
      filter === "all" ||
      (filter === "locked"
        ? !recipeUnlocked(farm, id)
        : recipeUnlocked(farm, id) && canAffordRecipe(farm, id)),
  );
  return (
    <div className="factory-panel">
      <div className="factory-banner">
        <img src={machineImage(machine.kind)} alt="" />
        <div>
          <MasteryStars count={stars} />
          <span className={"factory-status" + (running ? " working" : "")}>
            {running
              ? "Em produção"
              : machine.jobs.some((j) => now >= j.readyAt)
                ? "Coleta disponível"
                : "Pronta para trabalhar"}
          </span>
        </div>
        <button
          className="text-action"
          aria-expanded={masteryOpen}
          onClick={() => setMasteryOpen(!masteryOpen)}
        >
          {masteryOpen ? (
            <>
              <ArrowLeft size={15} />
              Produção
            </>
          ) : (
            "Maestria"
          )}
        </button>
      </div>
      {masteryOpen ? (
        <section className="mastery-detail">
          <h3>Maestria · {mastery.name}</h3>
          {next ? (
            <ProgressIndicator
              value={machine.completed}
              max={next.batches}
              label="Lotes coletados"
            />
          ) : (
            <b>Maestria máxima alcançada</b>
          )}
          <div className="mastery-benefit">
            <Star size={20} />
            <div>
              <b>{Math.round(mastery.speed * 100)}% de redução no tempo</b>
              <small>Aplicada somente às próximas receitas.</small>
            </div>
          </div>
          {next && (
            <p>
              Próxima estrela em {next.batches - machine.completed} lotes
              coletados: {Math.round(next.speed * 100)}% de redução.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="factory-workbench">
            <section className="factory-recipes" aria-label="Receitas">
              <GameTabs
                label="Filtrar receitas"
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "Todas" },
                  { id: "available", label: "Disponíveis" },
                  { id: "locked", label: "Bloqueadas" },
                ]}
              />
              <div className="recipe-grid">
                {visible.map((id) => (
                  <RecipeCard
                    key={id}
                    name={items[id].name}
                    image={items[id].image}
                    stock={farm.inventory[id]}
                    duration={formatTime(recipeDuration(recipes[id], machine))}
                    lockedLevel={
                      !recipeUnlocked(farm, id) ? recipes[id].level : undefined
                    }
                    selected={selected === id}
                    onClick={() => setSelection(id)}
                  />
                ))}
                {!visible.length && (
                  <p className="recipe-empty">
                    {filter === "available"
                      ? "Cultive os ingredientes para liberar suas receitas."
                      : "Nenhuma receita nesta categoria."}
                  </p>
                )}
              </div>
            </section>
            <ProductionQueue machine={machine} now={now} />
          </div>
          <section
            className="factory-recipe-detail"
            aria-label="Receita selecionada"
          >
            <div className="selected-recipe">
              <img src={items[selected].image} alt="" />
              <div>
                <b>{items[selected].name}</b>
                <small>
                  {recipe.quantity} unidades ·{" "}
                  {formatTime(recipeDuration(recipe, machine))}
                </small>
              </div>
            </div>
            <div className="recipe-ingredients">
              {recipeIngredients(selected).map(([id, amount]) => (
                <span
                  key={id}
                  className={farm.inventory[id] < amount ? "missing" : ""}
                  title={items[id].name}
                >
                  <img src={items[id].image} alt={items[id].name} />
                  <small>
                    {farm.inventory[id]} / {amount}
                  </small>
                </span>
              ))}
            </div>
            <button
              className="primary"
              aria-label={"Fabricar " + items[selected].name}
              disabled={
                busy ||
                !recipeUnlocked(farm, selected) ||
                !canAffordRecipe(farm, selected) ||
                machine.jobs.length >= machine.slots
              }
              onClick={() =>
                void act({
                  type: "enqueue-production",
                  machineId: machine.id,
                  recipeId: selected,
                  expectedRevision: farm.revision,
                })
              }
            >
              Fabricar
            </button>
          </section>
          <div className="machine-footer">
            <small>
              {machine.jobs.length >= machine.slots
                ? "Fila cheia. Colete os produtos prontos."
                : "Os ingredientes são reservados ao fabricar."}
            </small>
            {machine.slots < 6 && (
              <button
                className="secondary"
                disabled={busy || farm.coins < slotPrice}
                onClick={() =>
                  void act({
                    type: "upgrade-machine",
                    machineId: machine.id,
                    expectedSlots: machine.slots,
                  })
                }
              >
                + Espaço · {slotPrice} moedas
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { number as formatNumber } from "../../i18n/core";
import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
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
  const { items, machineKinds } = useLabels();
  return (
    <span
      className="mastery-stars"
      aria-label={t("production.stars",{count})}
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
  const { items, machineKinds } = useLabels();
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
              ? t("production.working")
              : machine.jobs.some((j) => now >= j.readyAt)
                ? t("production.ready")
                : t("production.idle")}
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
              {t("production.queue")}
            </>
          ) : (
            t("production.mastery")
          )}
        </button>
      </div>
      {masteryOpen ? (
        <section className="mastery-detail">
          <h3>{t("production.mastery")} · {t("production."+["apprentice","artisan","expert","master"][stars])}</h3>
          {next ? (
            <ProgressIndicator
              value={machine.completed}
              max={next.batches}
              label={t("production.batches")}
            />
          ) : (
            <b>{t("production.masteryMax")}</b>
          )}
          <div className="mastery-benefit">
            <Star size={20} />
            <div>
              <b>{t("production.speed",{percent:Math.round(mastery.speed * 100)})}</b>
              <small>{t("production.nextOnly")}</small>
            </div>
          </div>
          {next && (
            <p>
              {t("production.nextStar",{count:next.batches-machine.completed,percent:Math.round(next.speed*100)})}
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="factory-workbench">
            <section
              className="factory-recipes"
              aria-label={t("production.choose")}
            >
              <GameTabs
                label={t("production.choose")}
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: t("common.all") },
                  { id: "available", label: t("common.available") },
                  { id: "locked", label: t("common.locked") },
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
                      ? t("production.growIngredients")
                      : t("production.noRecipes")}
                  </p>
                )}
              </div>
            </section>
            <ProductionQueue machine={machine} now={now} />
          </div>
          <section
            className="factory-recipe-detail"
            aria-label={t("production.recipe",{name:items[selected].name})}
          >
            <div className="selected-recipe">
              <img src={items[selected].image} alt="" />
              <div>
                <b>{items[selected].name}</b>
                <small>
                  {t("production.output",{count:recipe.quantity,time:formatTime(recipeDuration(recipe,machine))})}
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
                    {formatNumber(farm.inventory[id])} / {formatNumber(amount)}
                  </small>
                </span>
              ))}
            </div>
            <button
              className="primary"
              aria-label={t("production.makeNamed",{name:items[selected].name})}
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
              {t("production.make")}
            </button>
          </section>
          <div className="machine-footer">
            <small>
              {machine.jobs.length >= machine.slots
                ? t("errors.fullQueue")
                : t("production.reserved")}
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
                {t("production.addSlot",{coins:slotPrice})}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

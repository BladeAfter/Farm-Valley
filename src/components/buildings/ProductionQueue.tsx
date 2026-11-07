import { number as formatNumber } from "../../i18n/core";
import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { Lock, Plus, X } from "lucide-react";
import { useFarm } from "../../store/useFarm";
import { barnUsed, items, storageCapacity } from "../../types/game";
import { type Machine } from "../../data/production";
import { formatTime } from "../../utils/time";
export function ProductionQueue({
  machine,
  now,
}: {
  machine: Machine;
  now: number;
}) {
  const { items } = useLabels();
  const { snapshot, act, busy } = useFarm();
  if (!snapshot) return null;
  return (
    <section className="factory-queue-area" aria-label={t("production.queue")}>
      <div className="production-heading">
        <h3>{t("production.queue")}</h3>
        <span>
          {formatNumber(machine.jobs.length)}/{formatNumber(machine.slots)}
        </span>
      </div>
      <div className="production-queue">
        {machine.jobs.map((job) => {
          const ready = now >= job.readyAt,
            waiting = now < job.startedAt;
          return (
            <article
              key={job.id}
              className={ready ? "ready" : waiting ? "waiting" : "running"}
            >
              <img src={items[job.recipe].image} alt="" />
              <div>
                <b>
                  {formatNumber(job.quantity)} × {items[job.recipe].name}
                </b>
                <small>
                  {ready
                    ? t("production.ready")
                    : waiting
                      ? t("production.startsIn",{time:formatTime(job.startedAt-now)})
                      : formatTime(job.readyAt - now)}
                </small>
                <progress
                  aria-label={t("production.progress",{name:items[job.recipe].name})}
                  value={Math.max(
                    0,
                    Math.min(1, (now - job.startedAt) / job.duration),
                  )}
                  max={1}
                />
              </div>
              {ready ? (
                <button
                  className="primary"
                  aria-label={t("common.actionNamed",{action:t("animals.collect"),name:items[job.recipe].name})}
                  disabled={
                    busy ||
                    barnUsed(snapshot.farm) + job.quantity >
                      storageCapacity(snapshot.farm, "barn")
                  }
                  onClick={() =>
                    void act({
                      type: "collect-production",
                      machineId: machine.id,
                      jobId: job.id,
                    })
                  }
                >
                  {t("animals.collect")}
                </button>
              ) : waiting ? (
                <button
                  className="queue-cancel"
                  aria-label={t("common.actionNamed",{action:t("common.cancel"),name:items[job.recipe].name})}
                  disabled={busy}
                  onClick={() =>
                    void act({
                      type: "cancel-production",
                      machineId: machine.id,
                      jobId: job.id,
                    })
                  }
                >
                  <X size={15} />
                </button>
              ) : null}
            </article>
          );
        })}
        {Array.from({ length: machine.slots - machine.jobs.length }, (_, i) => (
          <div className="empty-slot" key={i}>
            <Plus size={17} />
            <span>{t("production.choose")}</span>
          </div>
        ))}
      </div>
      {machine.slots === 6 && (
        <small className="queue-limit">
          <Lock size={12} />
          {t("production.maxSlots")}
        </small>
      )}
    </section>
  );
}

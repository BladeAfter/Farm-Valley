import { number as formatNumber } from "../../i18n/core";
import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { useEffect, useRef, useState } from "react";
import { Check, Clock, MapPin, Trash2, X } from "lucide-react";
import { items, playerLevel, type Item } from "../../types/game";
import {
  customerImage,
  customers,
  orderReady,
  orderRules,
  type DeliveryOrder,
} from "../../types/orders";
import { farmNow, useFarm } from "../../store/useFarm";
import { orderProductSource } from "../../data/orderSources";
import { pens } from "../../data/pens";
import { formatTime } from "../../utils/time";
import { RewardBadge } from "../ui/GameComponents";
export function OrdersPanel({ now }: { now: number }) {
  const { customers, items, pens } = useLabels();
  const {
    snapshot,
    act,
    busy,
    refresh,
    open,
    openShop,
    openMachine,
    openFruitTree,
    openAnimals,
    select,
  } = useFarm();
  const [filter, setFilter] = useState<"all" | "ready">("all");
  const [product, setProduct] = useState<Item | null>(null);
  const [departure, setDeparture] = useState<{
    slot: string;
    order: DeliveryOrder;
    confirmed: boolean;
    discard: boolean;
  } | null>(null);
  const [reward, setReward] = useState<DeliveryOrder | null>(null);
  const timers = useRef<number[]>([]),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);
  const farm = snapshot?.farm,
    board = farm?.orderBoard;
  const pendingTimes =
    board?.slots.flatMap((s) => (s.refillAt === null ? [] : [s.refillAt])) ??
    [];
  const nextRefill = pendingTimes.length ? Math.min(...pendingTimes) : null;
  useEffect(() => {
    if (nextRefill === null) return;
    let canceled = false,
      timer = 0;
    const synchronize = async () => {
      try {
        await refresh();
      } catch {
        /* Retry reads only; never replay a delivery. */
      }
      if (!canceled) timer = window.setTimeout(synchronize, 5000);
    };
    timer = window.setTimeout(
      synchronize,
      Math.max(200, nextRefill - farmNow() + 150),
    );
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [nextRefill, refresh]);
  if (!farm || !board)
    return <div className="orders-loading">{t("common.loading")}</div>;
  const readyCount = board.slots.filter(
    (s) => s.order && orderReady(s.order, farm.inventory),
  ).length;
  const nextUnlock = orderRules.unlocks.find(
    (rule) => rule.level > playerLevel(farm),
  );
  const source = product ? orderProductSource(farm, product) : null;
  const focus = (position: { x: number; y: number }) =>
    window.dispatchEvent(new CustomEvent("farm-focus", { detail: position }));
  const visitSource = () => {
    if (!source) return;
    if (source.kind === "crop") {
      open(null);
      select(source.crop);
      const plot = farm.plots.find((p) => !p.crop) ?? farm.plots[0];
      if (plot) focus(plot);
    } else if (source.kind === "tree") {
      if (source.tree) {
        openFruitTree(source.tree.id);
        focus(source.tree);
      } else openShop("trees");
    } else if (source.kind === "animal") {
      openAnimals(source.animal);
      focus(farm.penPositions[source.animal] ?? pens[source.animal]);
    } else if (source.kind === "machine") {
      if (source.machine) {
        openMachine(source.machine.id);
        focus(source.machine);
      } else openShop("factories");
    }
  };
  const complete = async (
    slot: string,
    order: DeliveryOrder,
    discard: boolean,
  ) => {
    if (busy || departure) return;
    setDeparture({ slot, order, confirmed: false, discard });
    const ok = await act({
      type: discard ? "discard-order" : "deliver-board-order",
      orderId: order.id,
    });
    if (!mounted.current) return;
    if (!ok) {
      setDeparture(null);
      return;
    }
    setDeparture({ slot, order, confirmed: true, discard });
    if (!discard) {
      setReward(order);
      timers.current.push(window.setTimeout(() => setReward(null), 4200));
    }
    timers.current.push(window.setTimeout(() => setDeparture(null), 450));
  };
  const slots = board.slots.filter(
    (s) =>
      filter === "all" ||
      (s.order && orderReady(s.order, farm.inventory)) ||
      departure?.slot === s.id,
  );
  return (
    <div className={"village-orders count-" + board.slots.length}>
      <div className="village-board-toolbar">
        <div>
          <img src="/assets/ui/orders.svg" alt="" />
          <span>
            <b>{t("orders.count",{count:board.slots.filter(s=>s.order).length})}</b>
            <small>
              {t("orders.readyCount",{count:readyCount})}
            </small>
          </span>
        </div>
        <div className="order-view-toggle" aria-label={t("orders.title")}>
          <button
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {t("common.all")}
          </button>
          <button
            aria-pressed={filter === "ready"}
            onClick={() => setFilter("ready")}
          >
            {t("orders.ready")}
          </button>
        </div>
        {nextUnlock && (
          <small className="next-order-unlock">
            +1 · {t("common.level",{level:nextUnlock.level})}
          </small>
        )}
      </div>
      <div className="village-order-grid" aria-label={t("orders.title")}>
        {slots.map((slot) => {
          const order =
            slot.order ??
            (departure?.slot === slot.id ? departure.order : null);
          if (!order)
            return (
              <article
                key={slot.id}
                className="village-order-slot"
                data-refill-at={slot.refillAt}
              >
                <span className="order-paper-pin" />
                <img src="/assets/ui/orders.svg" alt="" />
                <b>{t("orders.coming")}</b>
                <span>
                  <Clock size={14} />{" "}
                  {formatTime(Math.max(0, (slot.refillAt ?? now) - now))}
                </span>
                <small>{t("orders.preparing")}</small>
              </article>
            );
          const ready = orderReady(order, farm.inventory),
            customer = customers[order.customer];
          const leaving = departure?.slot === slot.id && departure.confirmed;
          return (
            <article
              key={slot.id}
              className={
                "village-order-card" +
                (ready ? " ready" : "") +
                (leaving
                  ? departure.discard
                    ? " discarding"
                    : " delivering"
                  : "")
              }
              aria-label={t("orders.byCustomer",{number:order.number,name:order.customerName??customer.name})}
              data-order-id={order.id}
            >
              <span className="order-paper-pin" />
              <header>
                <img
                  className="village-customer"
                  src={customerImage(order.customer)}
                  alt=""
                />
                <div>
                  <small>{t("orders.number",{number:order.number})}</small>
                  <h3>{order.customerName ?? customer.name}</h3>
                  <span>{customer.role}</span>
                </div>
                {ready && (
                  <span
                    className="order-ready-seal"
                    aria-label={t("orders.ready")}
                  >
                    <Check size={15} />
                  </span>
                )}
              </header>
              <div className="order-goods">
                {order.products.map((p) => {
                  const available = farm.inventory[p.item],
                    locked =
                      playerLevel(farm) <
                      orderProductSource(farm, p.item).level;
                  return (
                    <button
                      key={p.item}
                      className={
                        locked
                          ? "unavailable"
                          : available >= p.amount
                            ? "enough"
                            : "missing"
                      }
                      aria-label={t("orders.sourceLabel",{name:items[p.item].name,available,amount:p.amount})}
                      onClick={() => setProduct(p.item)}
                    >
                      <img src={items[p.item].image} alt="" />
                      <span>{items[p.item].name}</span>
                      <b>
                        {formatNumber(available)}
                        <i> / {formatNumber(p.amount)}</i>
                        {available >= p.amount && <Check size={11} />}
                      </b>
                    </button>
                  );
                })}
              </div>
              <div className="village-order-rewards">
                <RewardBadge kind="coins" value={order.coins} />
                <RewardBadge kind="xp" value={order.xp} />
              </div>
              <footer>
                <button
                  className="discard-order"
                  disabled={busy || !!departure}
                  aria-label={t("orders.discard",{number:order.number})}
                  onClick={() => void complete(slot.id, order, true)}
                >
                  <Trash2 size={17} />
                </button>
                <button
                  className="primary deliver-order"
                  disabled={busy || !!departure || !ready}
                  aria-label={t("orders.deliverNamed",{number:order.number})}
                  onClick={() => void complete(slot.id, order, false)}
                >
                  {ready ? (
                    <>
                      <Check size={16} />
                      {t("orders.deliver")}
                    </>
                  ) : (
                    t("orders.missing")
                  )}
                </button>
              </footer>
            </article>
          );
        })}
        {!slots.length && (
          <div className="orders-empty">
            <img src="/assets/ui/orders.svg" alt="" />
            <b>{t("orders.empty")}</b>
            <span>{t("orders.careHint")}</span>
          </div>
        )}
      </div>
      {product && source && (
        <aside className="order-source" aria-label={t("orders.origin")}>
          <img src={items[product].image} alt="" />
          <div>
            <b>{items[product].name}</b>
            <small>{source.label}</small>
          </div>
          {source.kind !== "legacy" && (
            <button className="secondary" onClick={visitSource}>
              <MapPin size={14} />
              {t("common.visit")}
            </button>
          )}
          <button
            className="source-close"
            aria-label={t("common.close")}
            onClick={() => setProduct(null)}
          >
            <X size={17} />
          </button>
        </aside>
      )}
      {reward && (
        <div className="order-thanks" role="status">
          <img src={customerImage(reward.customer)} alt="" />
          <div>
            <b>{customers[reward.customer].thanks}</b>
            <span>
              {t("orders.reward",{coins:reward.coins,xp:reward.xp})}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

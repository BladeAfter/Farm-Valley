import { useEffect, useState } from "react";
import { useFarm } from "../../store/useFarm";
import { useLabels } from "../../i18n/labels";
import { t, number } from "../../i18n/core";
import type { Item } from "../../types/game";
import type { MarketAction, PublicListing } from "../../types/market";
import "../../styles/market.css";
export function MarketPanel() {
  const { items } = useLabels(),
    { snapshot, busy, refresh } = useFarm();
  const [listings, setListings] = useState<PublicListing[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [tab, setTab] = useState("buy"),
    [item, setItem] = useState<Item>("wheat"),
    [amount, setAmount] = useState(1),
    [price, setPrice] = useState(1);
  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/farm/market");
      if (!response.ok) throw Error();
      setListings((await response.json()).listings);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const act = async (action: MarketAction) => {
    if (useFarm.getState().busy || loading) return;
    useFarm.setState({ busy: true });
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/farm/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      setListings(data.listings);
    } catch {
      setError(true);
    } finally {
      useFarm.setState({ busy: false });
      setLoading(false);
      await refresh();
    }
  };
  if (!snapshot) return null;
  const stock = snapshot.farm.inventory[item],
    visible = listings.filter((l) => (tab === "sell" ? l.mine : !l.mine));
  return (
    <div className="market-panel">
      <nav className="game-tabs">
        <button aria-pressed={tab === "buy"} onClick={() => setTab("buy")}>
          {t("market.buy")}
        </button>
        <button aria-pressed={tab === "sell"} onClick={() => setTab("sell")}>
          {t("market.sell")}
        </button>
        <button disabled={loading || busy} onClick={() => void load()}>
          {t("common.sync")}
        </button>
      </nav>
      <p>{t("market.tip")}</p>
      {tab === "sell" && (
        <form
          className="market-form"
          onSubmit={(event) => {
            event.preventDefault();
            void act({
              type: "list",
              id: crypto.randomUUID(),
              item,
              amount,
              price,
            });
          }}
        >
          <label>
            {t("market.item")}
            <select
              value={item}
              onChange={(event) => {
                setItem(event.target.value as Item);
                setAmount(1);
                setPrice(1);
              }}
            >
              {Object.entries(items).map(([id, config]) => (
                <option key={id} value={id}>
                  {config.name} ({number(snapshot.farm.inventory[id as Item])})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("market.amount")}
            <input
              type="number"
              required
              min={1}
              max={Math.min(100, stock)}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </label>
          <label>
            {t("market.price")}
            <input
              type="number"
              required
              min={1}
              max={Math.max(1, items[item].sellPrice ?? 1) * amount * 10}
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
            />
          </label>
          <button
            className="primary"
            disabled={loading || busy || stock < amount || amount < 1}
          >
            {t("market.publish")}
          </button>
        </form>
      )}
      {error && <p role="alert">{t("errors.actionFailed")}</p>}
      {loading && <p role="status">{t("notifications.loading")}</p>}
      {!loading && !visible.length && (
        <p className="market-empty">{t("market.empty")}</p>
      )}
      <div className="market-list">
        {visible.map((listing) => (
          <article
            className="market-card"
            key={listing.id}
            data-listing={listing.id}
          >
            <img src={items[listing.item].image} alt="" />
            <div>
              <b>{items[listing.item].name}</b>
              <small>× {number(listing.amount)}</small>
              <strong>{t("common.coinValue", { coins: listing.price })}</strong>
            </div>
            <button
              className="primary"
              disabled={
                loading ||
                busy ||
                (!listing.mine && snapshot.farm.coins < listing.price)
              }
              onClick={() =>
                void act({
                  type: listing.mine ? "cancel" : "buy",
                  id: listing.id,
                })
              }
            >
              {t(listing.mine ? "common.cancel" : "market.buy")}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

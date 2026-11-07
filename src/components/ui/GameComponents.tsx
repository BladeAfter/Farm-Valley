import { number as formatNumber } from "../../i18n/core";
import { t } from "../../i18n/core";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Lock, X } from "lucide-react";
export function GameModal({
  title,
  className = "",
  onClose,
  children,
  size = "medium",
  subtitle = "FARM VALLEY",
}: {
  title: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "small" | "medium" | "large";
  subtitle?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    ref.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0],
        last = focusable.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className={"modal game-modal game-modal-" + size + " " + className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="game-modal-header">
          <div>
            <div className="eyebrow">{subtitle}</div>
            <h2 id={id}>{title}</h2>
          </div>
          <button
            className="close"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <div className="game-modal-body">{children}</div>
      </section>
    </div>
  );
}
export function GameBottomSheet(props: Parameters<typeof GameModal>[0]) {
  return (
    <GameModal
      {...props}
      className={"game-bottom-sheet " + (props.className ?? "")}
    />
  );
}
export function LevelLock({ level }: { level: number }) {
  return (
    <span className="level-lock">
      <Lock size={12} aria-hidden="true" /> {t("common.level",{level})}
    </span>
  );
}
export function RewardBadge({
  kind,
  value,
}: {
  kind: "coins" | "xp";
  value: number;
}) {
  return (
    <span className={"reward-badge reward-" + kind}>
      <img
        src={kind === "coins" ? "/assets/ui/coin.svg" : "/assets/ui/star.svg"}
        alt=""
      />
      <b>{formatNumber(value)}</b>
      <small>{kind === "coins" ? t("common.coins") : t("common.xp")}</small>
    </span>
  );
}
export function BuildingCard({
  name,
  image,
  price,
  level,
  locked,
  owned,
  selected,
  onClick,
}: {
  name: string;
  image: string;
  price?: number;
  level?: number;
  locked?: boolean;
  owned?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        "building-card" +
        (selected ? " selected" : "") +
        (locked ? " locked" : "")
      }
      aria-label={t("common.details",{name})}
      aria-pressed={!!selected}
      onClick={onClick}
    >
      <span className="building-card-art">
        <img loading="lazy" src={image} alt="" />
      </span>
      <b>{name}</b>
      {owned ? (
        <small className="owned-tag">{t("common.owned")}</small>
      ) : locked && level ? (
        <LevelLock level={level} />
      ) : price !== undefined ? (
        <span className="card-price">
          <img src="/assets/ui/coin.svg" alt="" />
          {formatNumber(price)}
        </span>
      ) : null}
    </button>
  );
}
export function AnimalCard({
  name,
  image,
  product,
  state,
  ready,
  children,
}: {
  name: string;
  image: string;
  product: string;
  state: string;
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={"animal-card illustrated-animal" + (ready ? " ready" : "")}
    >
      <div className="animal-portrait">
        <img src={image} alt="" />
        <img className="animal-product" src={product} alt="" />
      </div>
      <div className="animal-card-info">
        <b>{name}</b>
        <span className="animal-state">{state}</span>
      </div>
      {children}
    </article>
  );
}
export function RecipeCard({
  name,
  image,
  stock,
  duration,
  lockedLevel,
  selected,
  onClick,
}: {
  name: string;
  image: string;
  stock: number;
  duration: string;
  lockedLevel?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        "recipe-card" +
        (selected ? " selected" : "") +
        (lockedLevel ? " locked" : "")
      }
      aria-label={t("production.recipe",{name})}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="recipe-stock">{formatNumber(stock)}</span>
      <img src={image} alt="" />
      <b>{name}</b>
      {lockedLevel ? (
        <LevelLock level={lockedLevel} />
      ) : (
        <small>{duration}</small>
      )}
    </button>
  );
}
export function GameTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: {
    id: T;
    label: string;
    image?: string;
  }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <nav className="game-tabs" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          className={value === option.id ? "active" : ""}
          onClick={() => onChange(option.id)}
        >
          {option.image && <img src={option.image} alt="" />}
          {option.label}
        </button>
      ))}
    </nav>
  );
}
export function ProgressIndicator({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div className="game-progress">
      <div>
        <span>{label}</span>
        <b>
          {formatNumber(value)} / {formatNumber(max)}
        </b>
      </div>
      <progress aria-label={label} value={value} max={max} />
    </div>
  );
}
export function ItemCard({
  name,
  image,
  quantity,
  selected,
  onClick,
}: {
  name: string;
  image: string;
  quantity: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={"game-item-card" + (selected ? " selected" : "")}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      <img src={image} alt="" loading="lazy" />
      <b>{name}</b>
      <span>{formatNumber(quantity)}</span>
    </button>
  );
}
export function UpgradePanel({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="game-detail" aria-labelledby={id}>
      <div className="game-detail-heading">
        <h3 id={id}>{title}</h3>
        <button className="secondary" onClick={onBack}>
          {t("inventory.back")}
        </button>
      </div>
      {children}
    </section>
  );
}

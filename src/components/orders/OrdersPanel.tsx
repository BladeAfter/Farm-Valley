import { useState } from "react";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { currentOrder, items } from "../../types/game";
import { useFarm } from "../../store/useFarm";
import { ProgressIndicator, RewardBadge } from "../ui/GameComponents";

function CustomerPortrait({ name }: { name: string }) {
  const woman = name.includes("Rosa"),
    color = woman ? "#bb6653" : "#688783";
  return (
    <svg
      className="customer-portrait"
      viewBox="0 0 100 100"
      role="img"
      aria-label={name}
    >
      <circle cx="50" cy="50" r="48" fill="#e8d8ad" />
      <path d="M14 99Q16 68 50 67Q84 68 88 99" fill={color} />
      <path d="M39 62v14q11 10 22 0V62" fill="#dfa274" />
      <ellipse cx="50" cy="44" rx="25" ry="29" fill="#f1bf8b" />
      <path
        d="M25 43Q19 9 50 10Q82 10 76 43L69 31Q48 37 30 29Z"
        fill="#70533d"
      />
      <path d="M19 27Q50 8 81 27L77 33Q49 24 23 34Z" fill="#c89c4e" />
      <path d="M31 25L35 9Q50 2 66 10L71 25" fill="#e1bb6b" />
      <ellipse cx="40" cy="45" rx="2.5" ry="3.5" fill="#4f3c31" />
      <ellipse cx="61" cy="45" rx="2.5" ry="3.5" fill="#4f3c31" />
      <path
        d="M49 47l-3 9h7"
        fill="none"
        stroke="#cd9067"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M41 61q9 8 18-1"
        fill="none"
        stroke="#a45d49"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="33" cy="55" rx="6" ry="3" fill="#df977b" opacity=".6" />
      <ellipse cx="68" cy="55" rx="6" ry="3" fill="#df977b" opacity=".6" />
      <path d="M31 77l8 22h22l9-22-9 7H40Z" fill="#f6e9cc" />
      <path d="M28 80l8 19M73 80l-7 19" stroke="#b69762" strokeWidth="4" />
    </svg>
  );
}

export function OrdersPanel() {
  const { snapshot, act, busy } = useFarm();
  const [details, setDetails] = useState(false);
  if (!snapshot) return null;
  const farm = snapshot.farm,
    order = currentOrder(farm),
    available = farm.inventory[order.item],
    ready = available >= order.amount;
  return (
    <div className="orders-board">
      <div className="orders-board-heading">
        <span className="paper-pin" />
        <small>ENTREGAS DO VALE</small>
        <span className={"order-state" + (ready ? " ready" : "")}>
          {ready ? "Pronto para entregar" : "Aguardando produtos"}
        </span>
      </div>
      <div className="order-customer">
        <CustomerPortrait name={order.customer} />
        <div>
          <small>Pedido #{farm.ordersCompleted + 1}</small>
          <h3>{order.customer}</h3>
          <p>{order.description}</p>
        </div>
      </div>
      <button
        className="order-request"
        aria-label="Ver detalhes do pedido"
        aria-expanded={details}
        onClick={() => setDetails(!details)}
      >
        <img src={items[order.item].image} alt="" />
        <div>
          <b>{items[order.item].name}</b>
          <small>
            {Math.min(available, order.amount)} de {order.amount} para entregar
          </small>
        </div>
        {ready ? <Check size={20} /> : <ChevronRight size={20} />}
      </button>
      {details && (
        <div className="order-detail">
          <ProgressIndicator
            value={Math.min(available, order.amount)}
            max={order.amount}
            label="Produtos separados"
          />
          <span>
            No inventário: {available} ·{" "}
            {ready ? "Tudo pronto!" : `Faltam ${order.amount - available}`}
          </span>
          <button className="text-action" onClick={() => setDetails(false)}>
            <ChevronLeft size={14} /> Recolher detalhes
          </button>
        </div>
      )}
      <div className="order-footer">
        <div className="order-reward-pair">
          <RewardBadge kind="coins" value={order.coins} />
          <RewardBadge kind="xp" value={order.xp} />
        </div>
        <button
          className="primary"
          disabled={busy || !ready}
          onClick={() =>
            void act({
              type: "deliver-order",
              orderId: farm.ordersCompleted,
              item: order.item,
            })
          }
        >
          <Check size={17} />
          Entregar pedido
        </button>
      </div>
    </div>
  );
}

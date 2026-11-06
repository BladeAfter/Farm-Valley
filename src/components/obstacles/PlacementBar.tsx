import { useFarm } from "../../store/useFarm";
import { fruitSpecies } from "../../types/orchard";
import { machineKinds } from "../../data/production";
export function PlacementBar() {
  const { placement, placementTarget, startPlacement, act, busy } = useFarm();
  if (!placement) return null;
  return (
    <div className="placement-bar">
      <span>
        {placement.kind === "machine"
          ? machineKinds[placement.machineKind].name +
            " · " +
            machineKinds[placement.machineKind].price +
            " moedas"
          : placement.kind === "moveMachine"
            ? "Reposicionar máquina"
            : placement.kind === "sheep"
              ? "Aprisco de ovelhas · 120 moedas"
              : placement.kind === "pen"
                ? "Reposicionar cercado"
                : placement.kind === "moveField"
                  ? "Reposicionar canteiro"
                  : placement.kind === "building"
                    ? "Reposicionar construção"
                    : placement.kind === "field"
                      ? "Novo canteiro · 5 moedas"
                      : placement.kind === "fruitTree"
                        ? fruitSpecies[placement.species].name +
                          " · " +
                          fruitSpecies[placement.species].price +
                          " moedas"
                        : "Floreira · 8 moedas"}
        <small>
          {placement.kind === "machine"
            ? "Escolha o lugar e confirme em Construir."
            : placement.kind === "moveMachine" ||
                placement.kind === "pen" ||
                placement.kind === "building" ||
                placement.kind === "moveField"
              ? "Após segurar, arraste e solte para posicionar."
              : "Toque em um espaço livre. Arraste para navegar."}
        </small>
      </span>
      {placement.kind === "machine" && (
        <button
          className="primary"
          disabled={busy || !placementTarget}
          onClick={async () => {
            if (
              placementTarget &&
              (await act({
                type: "buy-machine",
                kind: placement.machineKind,
                ...placementTarget,
              }))
            )
              startPlacement(null);
          }}
        >
          Construir
        </button>
      )}
      <button disabled={busy} onClick={() => startPlacement(null)}>
        Cancelar
      </button>
    </div>
  );
}

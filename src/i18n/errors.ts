export function errorInfo(message: string): {code:string;params:Record<string,string|number>} {
  const text = message.toLocaleLowerCase("pt-BR");
  const level = text.match(/n[ií]vel\s+(\d+)/);
  if (level)
    return { code: "errors.level", params: { level: Number(level[1]) } };
  const rules: [string, string[]][] = [
    ["coins", ["moedas insuf"]],
    ["barn", ["celeiro cheio"]],
    ["silo", ["silo cheio"]],
    ["session", ["sessão expirada", "sem sessão"]],
    ["network", ["servidor", "conexão", "failed to fetch"]],
    ["fullQueue", ["fila cheia"]],
    ["feed", ["precisa de ração", "precisa de racao"]],
    ["seed", ["guarde uma semente"]],
    [
      "stock",
      ["insuficientes", "faltam produtos", "precisa de", "libere espaço"],
    ],
    ["notReady", ["ainda não", "crescendo", "já foi alimentado"]],
    ["locked", ["bloquead"]],
    ["changed", ["já mudou", "já foi", "atualize", "já existe", "já tem"]],
    [
      "place",
      ["espaço", "terreno", "caminhos", "rio", "obstáculo", "limites", "pomar"],
    ],
    [
      "invalid",
      ["inválid", "invalid", "inexistente", "não existe", "duplicad"],
    ],
  ];
  return {
    code:
      "errors." +
      (rules.find(([, values]) =>
        values.some((value) => text.includes(value)),
      )?.[0] ?? "actionFailed"),
    params: {},
  };
}

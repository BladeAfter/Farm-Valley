# Alimentação visível

Após confirmação do servidor, cada espécie mostra seu alimento: feno para bovinos, capim para cabras e ovelhas, milho para galinhas e ração no cocho para porcos. O animal caminha até o ponto de alimentação antes da pose de comer. O alimento diminui em etapas e desaparece; o comedouro vazio permanece.

O visual deriva de `fedAt`, sem consumo adicional de ração ou alteração dos prazos de produção. Recarregar mantém o ciclo do servidor. Cada animal reutiliza dois objetos gráficos, evitando acumular comida a cada alimentação. As posições respeitam os limites do cercado e os pontos separados das galinhas.

Código: `src/data/feeding.ts`, `src/game/entities/AnimalFeeding.ts` e as entidades de animais. Validação: `tests/feeding.test.ts` e `node --import tsx scripts/feeding-visual.mjs`, com seis animais de cinco espécies e API isolada. A pequena sombra oval da cabra foi removida.

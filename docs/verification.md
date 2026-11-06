# Verificação da alpha 0.2

Regras cobertas por 13 testes:
- Plantio usa uma semente; colheita retorna duas; nenhuma moeda é cobrada.
- Trigo em 120 segundos e milho em 300 segundos; rejeição antes do prazo.
- Lotes de plantio/colheita são atômicos, sem campos duplicados.
- Falta de sementes e capacidades de silo/celeiro.
- Alimentação consome ração uma vez; coleta exige tempo; não duplica produtos.
- Compra e preparo de ração, sementes de reserva.
- Pedidos consomem inventário e rejeitam entrega repetida.
- Rejeição de quantidades, moedas e relógio enviados pelo cliente.
- Migração de estado e conversão da grade isométrica.

Teste de navegador: assets sem 404, colheita por arrasto, plantio por arrasto, bloqueio da colheita antecipada, câmera sem plantio acidental, inventário, alimentação de animal, pedido com recompensa real, reload, viewport horizontal 844x390 e orientação vertical. Capturas em `docs/screenshots/premium-*.png`.

O teste usa memória do servidor. Não comprova salvamento após reinício, persistência em PostgreSQL real, Telegram ou Android físico. Ainda não houve avaliação da animação por artista nem medição de FPS/memória em aparelho físico.

Execute `npm run build`, `npm test` e, com os servidores ativos, `npm run test:browser`.

Cabra e porco: 26 testes passaram, incluindo produção autoritativa de ambas as espécies, bloqueio de coleta antecipada/duplicada, capacidade do celeiro, pedidos e migração v3→v4 sem reiniciar progresso. Build e smoke test passaram. `node scripts/pasture-visual.mjs` preparou ração pela receita real, alimentou os cinco animais pela interface, aguardou os tempos reais e coletou leite, dois ovos, leite de cabra e trufa. Entregou seis pedidos pela interface: saldo final 291 moedas e 60 XP, sem injetar recursos ou acelerar relógio. Reload, layout móvel, ausência de erros JavaScript e de assets ausentes verificados. Capturas `goat-v1-*.png`, `pig-v1-*.png` e `pasture-v1-*.png` inspecionadas. Os testes usam memória local da API; não comprovam persistência em PostgreSQL real.

Armazéns e layout: 20 testes passaram, incluindo custo, nível mínimo, capacidade independente, bloqueio de duplicação, migração v2→v3 e separação das imagens nas três etapas. Build e smoke test completo passaram. `node scripts/storage-visual.mjs` ganhou o nível 2 sem alterar XP artificialmente: colheita inicial, dois pedidos e 20 campos de trigo após 120 segundos reais. Comprou melhorias pela interface (75 moedas cada), verificou ambas as capacidades em 150 e as duas trocas de forma no mapa, rejeitou repetição e confirmou os níveis dos armazéns após reload. Layout móvel e ausência de erros/404 verificados. A etapa 250 foi validada por testes de regras e de limites visuais; o teste no navegador comprou até a etapa 150. Capturas em `storage-stage1-*.png` e `storage-stage2-*.png`. Essa verificação usa o adaptador volátil local, não PostgreSQL real.

Galinhas v3: `node scripts/chicken-visual.mjs` passou. O teste verifica a nova versão no canvas e que as texturas do antigo rig não são carregadas. Alimentação consumiu uma ração, seguida de espera real de 61 segundos e coleta pela interface: um ovo foi creditado e a produção foi limpa. Sem erros JavaScript ou texturas ausentes; layout horizontal móvel verificado. Build passou. Capturas em `chicken-v3-*.png`; o modo `--preview-only` refaz apenas o teste visual e de alimentação, sem repetir a espera de produção.

Solo v2: `node scripts/ground-visual.mjs` passou. O teste exige `data-ground-version="2"`, colhe os 18 campos maduros pela interface, verifica a terra contínua com os 24 campos vazios e replanta 4 canteiros com consumo real de sementes. Capturas `ground-v2-empty.png`, `ground-v2-sown.png` e `ground-v2-mobile.png` inspecionadas. Build passou, sem erros JavaScript ou texturas ausentes.

Correção visual dos animais: build e 13 testes passaram; o smoke test completo passou novamente. `node scripts/animal-visual.mjs` captura closes em momentos diferentes da animação e após alimentação real. Capturas `animals-fixed-idle.png`, `animals-fixed-walk.png` e `animals-fixed-fed.png` foram inspecionadas. Sem erros JavaScript ou assets ausentes. Recortes dos rostos e a separação entre animais foram corrigidos após a inspeção, e o teste foi repetido.

Revisão seguinte da vaca: o rig antigo foi substituído por uma spritesheet original de oito poses completas. Build passou. O teste visual exige `data-cow-version="3"` no canvas para evitar verificar uma cena antiga. Capturas `cow-v3-idle.png`, `cow-v3-walk.png`, `cow-v3-eating.png` e `cow-v3-fed.png` foram inspecionadas; pernas, pescoço e proporções permanecem íntegros. A alimentação testada usa a API real. Não há alteração na economia para produzir as capturas.

Vaca v4: design original novo, largura 84 em vez de 120 (30% menor), sombra e indicador ajustados. O código antigo da vaca por partes foi removido de AnimalRig; essa classe agora aceita apenas galinhas. O teste visual passou exigindo `data-cow-version="4"`, sem erro JavaScript ou recurso ausente. Build passou. A captura `cow-v4-detail.png` mostra o tamanho real no jogo com o mesmo zoom da revisão anterior.

## Produção v7 — 5 de novembro de 2026

Compilação TypeScript/Vite e **110 testes** de regras passaram. A suíte inclui todas as 34 receitas, custos, tempos, capacidade, cancelamento futuro com devolução, coleta única, seis espaços máximos, maestria, sete culturas, cinco espécies, migração, vendas e pedidos acessíveis. O teste concorrente do repositório local confirmou um único enfileiramento com a revisão esperada e uma única coleta após reinício do repositório.

`node --import tsx scripts/production-visual.mjs` passou com API real isolada na porta 3199 e save de teste de nível alto. Verificou nove máquinas com arte original, compra por prévia/confirmar, fila sequencial, ampliação, cancelamento, coleta de lote previamente iniciado, venda, alimentação/coleta em lote, resposta perdida depois de commit, movimentação por pressão longa, encerramento e reinício completo da API, horários e inventário preservados, rejeição de conclusão antecipada com Date.now adulterado, imagens carregadas e layout horizontal 960×540. Sem erros JavaScript ou assets 404. O save de teste não substitui o de jogadores.

`npm run test:browser` também passou no fluxo normal de nível 1: plantio/colheita por arrasto, economia, câmera, inventário, alimentação, pedido, reload e orientação. Os tempos longos usam instantes de referência nos testes do servidor; não houve espera real de quatro horas. PostgreSQL real, deploy público e Android físico permanecem pendentes. Capturas em `docs/screenshots/production-v1-*.png`; regras, arquivos e limites em [production.md](production.md).

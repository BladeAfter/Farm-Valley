# Obstáculos naturais e limpeza — snapshot v5

## O que funciona

Árvores pequenas, médias, grandes e secas; troncos; pedras pequenas; rochas médias, grandes e irregulares; conjuntos de pedras; arbustos pequenos/grandes; moitas secas; raízes/galhos. O servidor gera e salva a distribuição por semente, com aproximadamente 50 objetos, incluindo uma pequena amostra em área futura fechada. Garante todos os tipos e mantém livres as instalações, canteiros, cercados, caminhos, muros, rio, pomar e uma clareira inicial. As antigas árvores de cenário passam a fazer parte dos obstáculos interativos; o pomar decorativo permanece preservado.

Ao selecionar, o objeto recebe destaque e contorno do footprint. O painel mostra nome, área liberada, ferramenta exigida e quantidade. Sem ferramenta, a remoção fica desabilitada com mensagem explícita. Cada ação consome exatamente uma ferramenta, marca `removedAt` e incrementa a revisão; o cliente anima folhas, fragmentos, madeira ou poeira por cerca de 680 ms **depois** da resposta válida. O footprint é liberado no mesmo snapshot. Objetos removidos não são recriados.

Ferramentas fazem parte do mesmo `inventory`, contam no celeiro e aparecem na categoria Ferramentas. Kit inicial: duas de cada uma; migração concede o kit apenas uma vez. Machado: árvores pequenas/médias e arbustos; serrote: árvores grandes/secas e troncos; picareta: pequenas pedras e conjuntos; TNT: rochas médias/irregulares; dinamite: rochas grandes; pá: raízes e moitas secas. Ícones SVG são originais, sem emojis. Novas fontes de ferramentas por recompensas/eventos ficam para uma próxima etapa; não há monetização ou compra obrigatória.

O botão **Construções** permite canteiro por 5 moedas, floreira por 8 e reposicionamento gratuito da casa, celeiro e silo. Escolher e tocar posiciona; arrastar continua navegando. Preview indica ocupação; a API revalida tudo. Canteiros novos plantam/colhem de verdade, decorações ficam salvas e as construções mantêm os estágios e interações. Colocar duas coisas no mesmo espaço é rejeitado. O solo foi adaptado para cobrir apenas os canteiros reais: um canteiro afastado não transforma o espaço intermediário inteiro em terra.

Área futura `east` fica fechada e rejeita remoções/posicionamento. Não havia expansão comprável anterior; foi preparada a estrutura de áreas e o gerador, sem simular um desbloqueio na interface.

## Autoridade, persistência e migração

- `remove-obstacle` aceita somente o ID. O servidor escolhe a ferramenta pelo tipo salvo, verifica a área e o estoque; não aceita item, quantidade, coordenadas ou horário do cliente.
- PostgreSQL mantém `BEGIN / SELECT ... FOR UPDATE / UPDATE / COMMIT`; consumo e remoção usam o mesmo documento bloqueado. A primeira leitura de snapshot antigo também grava a migração e a semente, evitando gerar outro mapa a cada GET.
- Sem PostgreSQL, `.data/farm-sessions.json` agora mantém o progresso no **servidor local**. Fila de operações, cópia do estado, arquivo temporário, fsync e rename antes da resposta. A falha não persiste consumo parcial. Há teste com encerramento e reinício real da API, mantendo cookie, semente e remoções.
- Esse adaptador de arquivo é para um único processo de desenvolvimento. Produção continua exigindo PostgreSQL. Não foi publicado servidor em nuvem nem executada integração com PostgreSQL real nesta entrega.
- Migração v4→v5 mantém moedas, diamantes, XP, produtos, campos, animais, produção e melhorias. As ferramentas são acrescentadas uma vez. Se um celeiro antigo já estiver cheio, o kit pode deixá-lo temporariamente acima da capacidade; nenhum produto é descartado e gastar as ferramentas libera os espaços. Estado antigo que existia apenas na memória de um processo já encerrado não pode ser recuperado.
- Após rejeição de comando, o cliente lê o snapshot atualizado sem repetir a operação: outra aba pode já ter removido o objeto.

## Arquivos principais

- `src/types/land.ts`, `src/data/land.ts`: catálogos, áreas, footprints, vizinhança com instalações e geração determinística.
- `src/types/game.ts`, `server/services/farm.ts`, `server/validators/command.ts`: snapshot v5, inventário integrado, migração e comandos autoritativos.
- `server/database/file-repository.ts`, `repository.ts`: adaptadores de persistência.
- `src/game/entities/NaturalObstacles.ts`: sprites, seleção por pixel opaco, destaque e efeitos; uma imagem estática por obstáculo, sem animação ociosa.
- `FarmScene.ts`, `FarmBuildings.ts`, `FieldTerrain.ts`, `src/data/fields.ts`: entrada, preview, movimentação confirmada, decorações e solo de novos campos.
- `src/components/obstacles/`, `FarmPanels.tsx`, `FarmControls.tsx`, `useFarm.ts`: remoção, ferramentas e posicionamento.

## Arte e prompts

Skill `imagegen`, ferramenta nativa `image_gen`, sem CLI. Fontes e WebP originais: `public/assets/obstacles/{rock,stump,dead-tree,bush,roots}-v1.{png,webp}`. Árvores verdes reutilizam a arte original `trees/oak-v2.webp`, em três escalas. Cinco texturas novas, até 320 px, aproximadamente 162 KiB comprimidos. `scripts/assets/prepare_obstacles.py` integra o pipeline de otimização e o manifesto. Fontes PNG preservadas; o jogo requisita somente WebP. Ferramentas em `public/assets/ui/tools/*.svg`.

Prompt comum final, substituindo `{description}` por cada descrição abaixo:

> Original premium 2.5D cartoon isometric FARM VALLEY game sprite, single standalone natural obstacle. {description} Match warm painterly polished mobile farm-game artwork, detailed sculpted shapes, dimensional organic contours, soft highlights upper-left, subtle short soft ground contact shadow, isometric 2:1 ground perspective. Entire object visible with margin, genuine transparent background, no ground tile, no scenery, no animals, no text or logo. Compact readable silhouette at 100px runtime width.

Descrições exatas:

- `rock`: One irregular cluster of three rounded pale warm gray boulders, one large rock and two small resting at its foot, soft natural stone facets and subtle grain, tiny moss accents.
- `stump`: One freshly cut old tree stump with visible growth rings, irregular thick spreading roots, warm bark, a small fallen branch beside it.
- `dead-tree`: One small bare dry rural tree with crooked branches, carved brown bark, a few ochre leaves, strong roots, friendly stylized not scary.
- `bush`: One lush volumetric wild shrub with rounded layered clusters of small sage and olive green leaves, tiny white blossoms, visible short woody stems near base.
- `roots`: One compact pile of dry tangled roots and fallen curved branches with a little dry straw colored grass, detailed wood grain, subtle remaining green shoots.

## Verificação

`npm test` inclui 40 testes: todas as ferramentas/tipos, consumo e remoção única, falta de estoque, distribuição por semente, colisões, área bloqueada, migração idempotente, terreno liberado, plantio real e persistência/concorrência do arquivo. A disputa por uma última ferramenta em dois obstáculos distintos também é coberta.

- `node scripts/obstacles-visual.mjs`: seleção real, ferramenta, remoção, criação/plantio no espaço liberado, reload, duas requisições simultâneas, falta de ferramentas e inventário.
- `node --import tsx scripts/land-placement-visual.mjs`: limpeza de 3×3 e mudança real do celeiro, bloqueio de sobreposição, floreira paga em outro espaço limpo e reload.
- `node scripts/obstacles-mobile.mjs`: gestos de toque via Chrome DevTools, seleção e remoção por toque, painel de área bloqueada e amostragem com dezenas de obstáculos. Medições em `docs/obstacle-performance.json`; Chrome com emulação, **não Android físico**. O FPS informado é a leitura do loop Phaser nesse ambiente, não uma garantia de desempenho em aparelho.
- `node scripts/persistence-check.mjs`: API em porta isolada, concorrência, encerramento do processo, reinício, mesmo cookie/snapshot e recusa de acesso anônimo. Não encerra a API usada pelo jogador.
- `npm run test:browser`: regressão de plantio, colheita, câmera, animais, pedidos, reload e orientação.

Capturas inspecionadas: `docs/screenshots/obstacles-v1-*.png`, incluindo mapa, painel, terreno limpo, novo canteiro, celeiro movido, floreira, ferramentas, toque e área bloqueada.

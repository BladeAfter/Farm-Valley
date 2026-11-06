# Cercados v1

## Análise anterior à implementação

`environment.ts` desenhava três cercas abertas: vacas e galinhas compartilhavam uma área; cabras e porcos tinham retângulos estreitos. Não havia entidade de cercado, compra, arrasto, colisão com cercas ou posição de cercado na persistência. Cada animal caminhava em torno de uma origem fixa.

## Implementação

- `src/data/pens.ts`: quatro áreas quadradas 3×3, posições, origens por ID de animal, seleção em coordenadas contínuas e restrição de movimento com folga para o corpo e bloqueio do abrigo. As novas posições evitam estradas, canteiros e árvores que encobriam os portões. Casas, armazéns, árvores, estradas e economia não foram modificados.
- `src/game/entities/AnimalPens.ts`: piso, abrigo original, quatro lados, portão de tábuas com ferragens, postes e pequenos detalhes. Segmentos independentes usam profundidade pelo pé para intercalar animais e cercas. Geometria estática compartilhada, sem novas animações ou física por quadro.
- `FarmScene.ts`: carrega quatro WebP, cria cercados, usa origens centralizadas e seleciona o cercado pelo chão ou pelo animal.
- As três classes de animais mantêm suas spritesheets, estados, pausas fora da tela e pequenos indicadores de produto pronto. Apenas as origens e a restrição ao perímetro foram integradas.
- `useFarm.ts` e `FarmPanels.tsx`: filtro transitório por espécie; seleção no mundo mostra um painel compacto com alimentação, tempo e coleta. O botão Animais mantém a lista completa.
- Nenhuma alteração no schema, IDs, migração, comandos, tempos, inventário ou saldo. Ver cercados não grava nada na API. Compra/movimentação persistente de cercados continua fora do escopo, pois ainda não existe no jogo; não foi criada uma interface que simule essa função.

## Arte e pipeline

Ferramenta nativa `image_gen` com transparência real. Fontes originais: `public/assets/buildings/pens/{chicken,goat,pig,cow}-v1.png`. Texturas usadas pelo jogo: arquivos WebP irmãos, até 384×320, somando aproximadamente 148 KiB. `scripts/assets/prepare_pens.py` recorta margens transparentes, reduz e comprime sem alterar os PNGs. Integrado ao `prepare.py` e ao manifesto.

Prompts finais usados (sem assets de terceiros):

### Galinheiro

Create an ORIGINAL premium cartoon 2.5D isometric farm game sprite: a small wooden chicken coop alone, no animals, no fence, no background or ground tile. Red terracotta shingle pitched roof, warm timber, straw nesting boxes visible in open front, short wooden access ramp descending toward lower-left. Small corn feeder and white/red poultry drinker beside right wall. Compact welcoming detailed mobile game asset, soft painted textures, rounded polished timber, sunlight upper left, camera isometric 2:1, front and right side visible, all parts fully within image, genuine transparent background. No text no logos. Keep accessories close to walls and leave open space in front for separately animated chickens. Save generated image file and return its path.

### Demais espécies

Prefixo comum: “Use case: stylized-concept. Production sprite for original premium cartoon 2.5D isometric farm game.”

Descrição por espécie:

- Cabra: “Small rustic goat shelter, straw thatched pitched roof, open timber frame, stacked golden hay bales under roof, wooden hay trough and small water bucket close beside wall, few stones at base.”
- Porco: “Small pig wooden hut with red shingle roof, low arched open entrance, wooden food trough, round wooden water tub with blue water beside wall. No mud ground, separate ground drawn in game.”
- Vaca: “Small open cattle stable with blue shingle pitched roof, warm timber beams, stored golden hay bales under roof, large wooden hay manger, water trough and small silver milk churn close beside wall.”

Sufixo comum: “No animals, no fence, no ground tile, genuinely transparent background. Camera 2:1 isometric, front and right side visible, front entrance toward lower-left. Compact complete standalone building with accessories snug beside walls, open space in front for animated animals. Polished hand painted textures, soft warm sunlight from upper left, rounded professional wood, same scale and art direction as premium mobile farm game. No text, no logos, no background. All elements fully framed.”

## Verificação reproduzível

Resultado desta revisão: build e 28 testes passaram, assim como o smoke test geral e `pens-visual.mjs --production`. O ciclo pelo painel do galinheiro consumiu uma ração, aguardou 61 segundos reais e creditou um ovo ao recolher. Seleção das quatro espécies, moradores filtrados, reload, snapshot preservado durante navegação e layout horizontal passaram, sem erros JavaScript ou assets ausentes. As capturas individuais e o indicador de ovo pronto foram inspecionados.

- `npm test`: inclui áreas não sobrepostas, canteiros/estradas livres e milhares de alvos de movimento, inclusive fora do mapa, restringidos ao cercado e fora do abrigo.
- `npm run build` e `npm run test:browser`.
- `node scripts/pens-visual.mjs`: captura as quatro estruturas, testa seleção no mundo, moradores filtrados, reload, viewport horizontal e igualdade do snapshot antes/depois da navegação.
- `node scripts/pens-visual.mjs --production`: também alimenta uma galinha pela interface do cercado, espera 61 segundos reais e coleta um ovo; registra o pequeno indicador pronto no mapa.

Capturas em `docs/screenshots/pen-*-v1.png`, `pen-*-panel.png`, `pens-v1-farm.png` e `pens-v1-mobile.png`. Validação local não comprova FPS em Android físico ou persistência PostgreSQL em nuvem.

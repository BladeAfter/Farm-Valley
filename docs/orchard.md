# Pomar funcional — snapshot v6

O pomar anterior era formado por seis imagens decorativas fixas. Essas posições foram convertidas em seis macieiras funcionais, com uma colheita inicial pronta, mantendo o progresso existente. As fileiras automáticas de flores foram removidas e suas reservas de colisão eliminadas.

## Ciclo e economia

| Espécie | Produção | Quantidade | Crescimento inicial | Preço | Nível | Valor unitário preparado para comércio |
| --- | --- | --- | --- | --- | --- | --- |
| Macieira | 2 h | 3 | 1 min | 40 | 1 | 8 |
| Pereira | 3 h | 3 | 1,5 min | 55 | 1 | 11 |
| Cerejeira | 4 h | 4 | 2 min | 70 | 2 | 12 |
| Laranjeira | 5 h | 3 | 2,5 min | 85 | 2 | 15 |
| Limoeiro | 6 h | 4 | 3 min | 100 | 3 | 16 |
| Pessegueiro | 7 h | 3 | 3,5 min | 120 | 3 | 20 |
| Mangueira | 8 h | 3 | 4 min | 145 | 4 | 23 |
| Abacateiro | 10 h | 3 | 5 min | 175 | 4 | 28 |

Configuração central em `src/types/orchard.ts`. Crescimento e produção têm horários distintos. Os estados derivam de `plantedAt`, `growsAt`, `readyAt`, `lastHarvestAt` e `harvestCount` salvos: muda → crescimento → adulta vazia → frutos pequenos → amadurecendo → pronta. A primeira produção começa depois de crescer. Colher troca imediatamente para a pose adulta sem frutos e grava o próximo vencimento com base no horário do servidor. Não existe acúmulo de colheitas atrasadas: retornar muito tempo depois dá somente uma produção.

Oito frutas foram acrescentadas ao mesmo `inventory`, com ícones SVG originais, valor de venda configurável e contagem na capacidade do celeiro. A seção Frutas do pomar mostra os produtos já colhidos. Os valores preparam comércio/encomendas/máquinas futuros; não foi criada uma venda fictícia. O celeiro cheio impede a coleta e mantém todos os frutos e horários da árvore.

`orchardRules.harvestLimitEnabled` começa em `false`. Quando ativado, árvores novas recebem `harvestLimit: 4`; árvores ilimitadas existentes continuam ilimitadas. Ao atingir o limite, a árvore fica seca, para de produzir e pode ser removida consumindo um serrote. A remoção libera seu footprint na mesma transação. Esse modo opcional foi validado por testes de regras, sem ativá-lo no jogo entregue.

## Integração

- `src/types/orchard.ts`: espécies, estágios, tempos, limites e pomar inicial.
- `src/types/game.ts`, `server/services/farm.ts`, `server/validators/command.ts`: snapshot v6, migração e comandos de plantio, colheita e remoção seca.
- `src/data/land.ts`: o pomar real participa da ocupação validada pelo servidor. Compra não desconta moedas até confirmar uma posição válida.
- `src/game/entities/FruitTrees.ts`: sprites de seis poses, identificação pelo pixel opaco, indicador discreto e animação de recompensa. A árvore colhida recebe a pose sem frutos antes da animação. Texturas de novas espécies carregam sob demanda.
- `src/components/orchard/`, `FarmPanels.tsx`: categoria da loja, painel compacto, inventário e temporizador apenas na seleção.
- `useFarm.ts`: relógio de apresentação ancorado em `performance.now()` e horário recebido do servidor. Mudar `Date.now()` no navegador não adianta a apresentação nem os comandos.
- `scripts/assets/prepare_orchard.py`: extrai as seis poses, mantém escala comum e pés alinhados em 192×192; fontes preservadas e WebP de runtime.

O servidor recebe somente espécie/posição para plantar e ID/contador esperado para colher. Preços, nível, timestamps, rendimento e capacidade são calculados no servidor. O contador esperado bloqueia inclusive uma repetição antiga depois que outro ciclo já venceu. Compra/colheita usam os mesmos bloqueios e transações do repositório existente. No arquivo de desenvolvimento, as operações são serializadas e gravadas atomicamente; produção exige PostgreSQL. Não foi feito deploy ou teste contra PostgreSQL real nesta revisão.

A migração v5→v6 preserva obstáculos removidos, semente do mapa, ferramentas, inventário anterior, moedas, XP, animais, produção, canteiros, decorações, posições e melhorias. Acrescenta as oito frutas zeradas e converte o pomar antigo uma única vez. Nenhum obstáculo é regenerado nessa migração.

## Arte original

Skill `imagegen`, ferramenta nativa `image_gen`, sem assets de outros jogos. Fontes em `public/assets/trees/orchard/{apple,pear,cherry,orange,lemon,peach,mango,avocado}/source-v1.png`. A mangueira recebeu remoção do fundo por IA em `source-v2.png`, mantendo a fonte inicial. Arquivos usados pelo jogo: `stages-v1.webp` e `portrait-v1.webp` em cada pasta. As dezesseis texturas somam aproximadamente 717 KiB; a cena inicia com o atlas da macieira e carrega os demais apenas quando há árvores daquela espécie.

Cada espécie tem tronco, folhagem e silhueta próprios. Frutos estão pintados nas poses correspondentes; não são círculos ou emojis colocados sobre uma árvore genérica. O atlas permite trocar para uma copa integralmente vazia após a colheita.

Prompt final comum para as sete espécies depois da macieira, substituindo `{description}` pelas descrições abaixo:

> Production spritesheet for ONE ORIGINAL premium cartoon 2.5D isometric farm game tree species. {description}. EXACTLY SIX FRAMES arranged 3 columns and 2 rows, evenly spaced identical square cells with transparent gutters. Consistent isometric 2:1 camera, sunlight upper-left, richly hand-painted polished mobile game art with sculpted foliage. NO labels or text, no frame borders, no ground tiles, genuine transparent background. Root at same relative bottom-center in every cell. Trees must fit wholly inside cells. Preserve SAME trunk anatomy and canopy identity across adult frames. Frame order row-major: (0) tiny sapling, few leaves, 28% adult height, no fruit; (1) young developing tree, 60% adult height, no fruit; (2) fully mature healthy green tree with ABSOLUTELY NO FRUITS anywhere; (3) same mature tree with a few tiny unripe green fruits; (4) same mature tree with some developing half-grown species-specific fruits; (5) same mature tree with clearly visible ripe species-specific fruits integrated naturally into canopy, recognizable at 110px wide. Frames 2 and 5 match structure. Fruit must be proper illustrated fruit, never plain circles. Six complete separated trees, never overlap between cells.

Descrições:

- Apple: APPLE TREE: stout crooked brown trunk branching low, broad round dense dome canopy, small rounded bright green leaves, unmistakable red apples.
- Pear: PEAR TREE: upright slender trunk, elegant tall teardrop crown, glossy pointed oval leaves, dangling yellow-green pear-shaped pears.
- Cherry: CHERRY TREE: dark reddish forked slender trunk, wide airy tiered umbrella crown, small serrated leaves, clusters of paired red cherries on thin stems.
- Orange: ORANGE TREE: short knotted warm trunk, compact spherical layered crown of dark glossy oval citrus leaves, bright round orange fruits nestled among leaves.
- Lemon: LEMON TREE: slim lightly twisting ochre trunk, irregular asymmetrical branching canopy, narrow glossy yellow-green leaves, elongated yellow lemons.
- Peach: PEACH TREE: graceful low reddish spreading trunk, flat wide open crown, long thin lanceolate leaves, fuzzy pink-orange peaches with natural central seams.
- Mango: MANGO TREE: strong gracefully curved gray-brown trunk, broad drooping umbrella canopy with long dark green leaves in sprays, hanging oblong red-yellow mangoes.
- Avocado: AVOCADO TREE: thick pale gray branching trunk with strong forks, tall lush irregular oval crown, large broad glossy deep green leaves, dark green pear-shaped avocados.

A macieira usou a mesma descrição específica com o seguinte restante do prompt:

> A carefully aligned SIX FRAME sheet: EXACTLY 3 columns and 2 rows, six separate complete trees, evenly spaced identical square cells, generous transparent gutters. Camera consistent isometric 2:1, soft sunny lighting upper-left, original richly hand-painted mobile game art with sculpted foliage depth. NO labels, NO text, NO ground tiles, genuine transparent background. Keep each root planted at same relative bottom-center of its cell. Mature trees must fit wholly inside their cells including leaves and soft tiny contact shadow. Across frames preserve the SAME trunk anatomy and canopy identity, only growth and fruit changes. Frame order left-to-right top row then bottom row: (0) tiny newly planted sapling with slender stem and a few leaves, about 28% mature height; (1) young developing tree about 60% mature height, no fruit; (2) fully mature healthy lush green tree COMPLETELY WITHOUT FRUIT, all fruit must be absent; (3) exactly same mature tree with a few tiny unripe green fruits beginning to form; (4) same mature tree with some developing half-grown fruits; (5) same mature tree full of clearly visible ripe species-specific fruits integrated naturally among foliage, recognizable when tree is 110px wide. Frames 2 and 5 should be matching adult structures. NO colored circles standing in for fruit. No frame borders. Never overlap trees between cells.

Edição final da mangueira, tendo a folha original como alvo:

> Edit target: this six-frame mango tree spritesheet. Remove ALL the green/gray gradient background completely to genuine alpha transparency, including between branches and leaves. Preserve all six trees, their exact 3-column 2-row layout, positions, relative growth sizes, trunk anatomy, foliage, fruit and painting unchanged. Keep a clean soft anti-aliased cutout around every leaf and root. No ground, no backdrop, no glow, no gradient haze, no contact shadow other than a tiny transparent soft root shadow. Background removal only. The six sprites must be fully isolated on truly transparent pixels.

## Verificação realizada

Build e 54 testes passaram. Os testes de regras percorrem crescimento e dois ciclos de todas as espécies, usando horários de referência do servidor: antecipação, duplicação, longo período offline sem acumulação, capacidade, preços/níveis, ocupação, migração e vida útil opcional. As esperas de 2–10 horas foram verificadas com esses horários controlados, sem alterar tempos do jogo.

`node --import tsx scripts/orchard-visual.mjs` passou: renderização e inspeção das 48 poses, colheita real de uma macieira inicial, três maçãs no inventário, copa vazia, novo timestamp de duas horas, mudança do relógio do navegador sem aceleração, fechar/reabrir contexto com o mesmo cookie, compra de uma muda e **62 segundos de espera real** para observar muda → crescimento → adulta sem frutos. Também verificou reload e layout horizontal, sem erros JS ou assets ausentes.

`node --import tsx scripts/orchard-lazy-visual.mjs` passou: compra de pereira, atlas carregado sob demanda, atlas de cerejeira não carregado e renderização da pereira salva após reload.

`node scripts/orchard-mobile.mjs` passou com gestos de toque: arrastar, selecionar, colher, temporizador e reload. `node scripts/persistence-check.mjs` encerrou/reiniciou uma API isolada e manteve frutas e ciclo, rejeitando pedidos simultâneos e repetidos. O smoke test geral de plantações, câmera, animais e pedidos passou. Chrome emulado não substitui validação em Android físico.

Capturas em `docs/screenshots/orchard-v1-*.png`: galeria dos estágios, fazenda, copa pronta/vazia, temporizador, loja, muda, crescimento, adulta e toque. A galeria em `/scripts/orchard-preview.html` é um verificador isolado de arte em desenvolvimento, sem inventário ou economia simulados.

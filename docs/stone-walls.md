# Muros de pedra v2

O sistema anterior era um desenho fixo em `environment.ts`: duas linhas de blocos arredondados, sem compra, movimento, rotação, colisão ou posições de muros no snapshot salvo. As duas bordas mantêm as mesmas coordenadas. Não há mudança no servidor, progresso, economia, plantações ou cercados de animais.

## Implementação

- `src/game/map/walls.ts`: grafo de vizinhança com segmentos nos dois eixos da grade, extremos, cantos internos/externos e conexões. Divide interseções, elimina segmentos duplicados e liga peças adjacentes automaticamente com `wallPathsFromCells`. `wallContainsPoint` fornece a espessura contínua para integração futura com posicionamento/colisão; não existe personagem caminhando pelo mapa para bloquear no sistema atual.
- `src/game/entities/StoneWalls.ts`: material original de pedras irregulares sobre faces projetadas em 3D, coroamento com formas chanfradas variáveis, luz superior e sombras laterais discretas. Altura de 22 unidades, sem degraus entre módulos. A textura mantém a fase nas divisões do cache. Trechos retos são unidos mesmo quando recebidos como peças separadas.
- Renderização gera sprites locais em resolução 2× apenas ao criar/substituir o layout. Durante o jogo não há geração de geometria por quadro. As duas bordas usam aproximadamente 2 MiB de cache RGBA, além do material compartilhado de 17 KiB em WebP. Não houve benchmark em aparelho físico.
- `replace` valida a geometria antes de remover a versão visível; `replaceCells` permite reconstruir as conexões ao mudar uma disposição. Isso prepara a integração, mas não cria uma compra ou movimentação persistente fictícia na interface.
- `FarmScene.ts` carrega o material; `environment.ts` usa o novo renderizador.

## Arte original e pipeline

Gerada com a ferramenta nativa `image_gen`, sem CLI ou assets de terceiros. Fonte em `public/assets/terrain/walls/fieldstone-v1.png`; arquivo usado pelo jogo em `public/assets/terrain/walls/fieldstone-v1.webp` (512×171, 17.054 bytes). A redução está integrada a `scripts/assets/prepare.py` e ao manifesto de assets.

Prompt final:

> Create one seamless tileable MATERIAL TEXTURE for the side faces of a premium cartoon 3D farm game's low dry stone wall. Orthographic straight-on view, completely filled edge to edge by tightly interlocked rounded irregular fieldstones, NOT rectangular bricks, no cubes, no perspective. Exactly THREE irregular staggered courses across image height, about eight medium fieldstones across image width, each stone different gently rounded polygon / river rock shape; stones fit tightly with very thin dark warm-gray mortar crevices. Pale warm gray, soft limestone beige and light gray, softly painted 3D sculpted rock, subtle tiny grain and bevel shading, broad gentle highlights upper left, darker under crevices. Unmistakably organic stone masonry. No grass, no floor, no background, no text no objects, no plants. Repeatable left/right edges. This bitmap will be mapped onto an isometric wall mesh. High quality original stylized game material, not photorealistic.

## Validação realizada

Build, 33 testes e smoke test geral passaram. Os novos testes verificam detecção dos vizinhos, extremos, duas orientações, quatro cantos, quadrado fechado, cruzamentos, sobreposições deduplicadas, transformação de posição/orientação e footprint.

`node scripts/walls-visual.mjs` passou sem erros JavaScript ou assets ausentes. Foram renderizados e inspecionados: peça isolada, linha de 10 peças, canto de 90°, quadrado fechado, dois muros conectados e muros junto de caminho/plantação. Também foram conferidos os muros reais da fazenda com zoom e viewport horizontal 844×390. A primeira versão visual foi descartada por continuar regular demais; as capturas finais usam o material original e o cache 2×.

Capturas: `docs/screenshots/walls-v2-cases.png`, `walls-v2-case-1.png` até `walls-v2-case-6.png`, `walls-v2-detail.png`, `walls-v2-farm.png` e `walls-v2-mobile.png`. A galeria isolada fica em `/scripts/wall-preview.html` no servidor de desenvolvimento e não usa estado ou comandos do jogador.

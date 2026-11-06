# Culturas e controles compactos

A barra fixa mostra três ferramentas pequenas e os atalhos Loja, Inventário, Pedidos e Mais. Construções e Animais ficam em Mais. Plantar abre um seletor contextual com cinco culturas; selecionar uma semente fecha o seletor. O plantio por arrasto continua disponível, assim como tocar nos canteiros com a ferramenta selecionada. As quantidades são as do silo do servidor.

| Cultura | Nível | Crescimento | Compra de 3 sementes |
| --- | --- | --- | --- |
| Trigo | 1 | 2 min | 3 moedas |
| Milho | 1 | 5 min | 7 moedas |
| Cenoura | 2 | 10 min | 9 moedas |
| Soja | 3 | 20 min | 12 moedas |
| Cana-de-açúcar | 4 | 30 min | 15 moedas |

São configurações próprias de FARM VALLEY, não uma reprodução do catálogo completo de Hay Day. Cada plantio consome uma cultura armazenada e produz duas. Cenoura, soja e cana dão respectivamente 2, 3 e 4 XP por colheita. Os desbloqueios, compras, capacidade do silo e tempos são validados pelo servidor. A migração acrescenta os novos saldos zerados e preserva plantações, inventário e posições salvas dos cercados.

## Arte original

Ferramenta: imagegen integrada, três gerações independentes com transparência. Fontes preservadas em `public/assets/crops/{carrot,soybean,sugarcane}/source-v1.png`. Sprites WebP gerados por `python scripts/assets/prepare-crops.py`; aproximadamente 44 KB para os três sprites. Sem imagens de outros jogos.

Prompt comum: “Original FARM VALLEY premium mobile farm game sprite. [subject]. Polished hand-painted stylized 3D cartoon illustration, isometric 2.5D viewed 30 degrees down, soft warm sunlight from upper left, juicy greens and sculptural volume, natural botanical shape, clean readable small silhouette. ONE isolated plant asset only, entire plant visible, centered with transparent padding, transparent background. No soil tile, no grass patch, no cast ground shadow, no container, no frame, no text. Designed to repeat in isometric crop rows; consistent detail with premium original farming game art.”

Subjects:

- Carrot: “a single carrot crop plant rooted at ground line, dense delicate feathery green carrot foliage, just the orange shoulder of the root visible at base, root not floating or fully pulled”.
- Soybean: “a single mature soybean bush, broad trifoliate softly rounded green leaves, several plump pale green soybean pods hanging naturally beneath leaves, unmistakably soybean not pea vine”.
- Sugarcane: “a single compact clump of three sugarcane stalks, pale green segmented cylindrical thick canes, visible nodes, long arching blade leaves, no corn ears”.

As quatro fases são terra semeada, broto, crescimento e planta madura. Os estágios intermediários das novas culturas usam a geometria leve existente; a fase madura usa a ilustração original de cada cultura.

## Validação

`tests/crops.test.ts` testa as três culturas, bloqueio de nível, compra, plantio em lote, colheita antecipada, capacidade, recompensa e migração. Tempos longos são verificados com instantes de referência no teste do servidor, sem esperar 30 minutos reais.

`node --import tsx scripts/crops-visual.mjs` inicia uma API isolada na porta 3198 com um save de teste no nível 4. Confere cinco sprites maduros, seleção de sementes, plantio e colheita por toque, rejeição de colheita antecipada, salvamento e telas de 1280×800 e 960×540. Essa fixture não altera o progresso de jogadores. Capturas em `docs/screenshots/crops-v1-*.png`.

`npm run test:browser` cobre o fluxo normal desde o nível 1, arrasto para colher e plantar, inventário, animais, pedidos, persistência e orientação.

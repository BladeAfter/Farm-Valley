# Direção de arte — Vale de Alecrim

A alpha 0.2 substitui o terreno plano e os prédios vetoriais por sprites originais detalhados. A referência visual orientou densidade, leitura do campo e volume; nenhum asset ou interface de Hay Day foi reutilizado.

- Casa de reboco creme, telhas terracota, venezianas turquesa e varanda com videira.
- Celeiro coral, telhado azul petróleo, madeira aparente e feno.
- Silo de pedra clara com cobertura cobre/verde.
- Evolução dos armazéns: celeiro inicial baixo de madeira e silo inicial de tábuas com aros; etapa intermediária com reforços, fundação e ampliação; etapa avançada com as construções detalhadas maiores. A aparência é determinada pela melhoria de capacidade efetivamente comprada. Casa reduzida a 145 unidades de largura; celeiro em 116/130/145 e silo em 62/72/82. Todos têm posições separadas e acessos próprios, com folga de pelo menos 12 unidades entre os limites visuais em qualquer etapa.
- Carvalhos volumosos, macieiras com frutos vermelhos, flores e caminhos de terra.
- Solo dos canteiros: textura original de terra arada sobre uma faixa contínua, bordas levemente irregulares e sulcos atravessando a lavoura. A grade permanece invisível; os losangos só aparecem como indicação de seleção. Grama refeita com formas pintadas mais suaves e menor ruído visual.
- Trigo: broto verde, vegetação/espigas verdes e clump dourado maduro; 9 clumps por campo formam uma lavoura densa.
- Milho: folhagem larga e espigas amarelas. Os dois estágios iniciais do milho ainda são desenhos procedurais.
- Vaca v4: personagem inteiramente refeito por IA, marfim com manchas cinza, coleira verde e pequeno sino. Oito poses completas com pescoço contínuo e pernas visíveis: parada, piscar, duas passadas, alimentação, mastigação, deitada e cauda. A largura de exibição caiu de 120 para 84 unidades (30% menor). Todos os quadros usam uma escala comum e apoio dos cascos em y=184; `CowSprite` controla a animação.
- Galinhas v3: novas poses completas, com corpo compacto, pescoço curto e acabamento creme. Inclui parada, piscar, duas passadas, bicar, ciscar, descansar e abrir as asas. `ChickenSprite` usa quadros de 192×192, exibidos em 36×36; a altura visível é aproximadamente 30% menor que a montagem antiga. As duas galinhas compartilham a textura, com comportamentos em tempos diferentes.
- Cabra Amora: pelagem marfim com manchas areia, chifres voltados para trás, barbicha curta e coleira terracota com medalha turquesa. Oito poses completas, exibidas em 64×48, com caminhar, pastar, mastigar e repousar.
- Porco Pingo: rosa suave, focinho natural, orelhas expressivas, quatro cascos visíveis e cauda enrolada. Oito poses completas em 58×43,5, com caminhar, comer, farejar e descansar. Produção amigável de trufas; o animal permanece na fazenda após a coleta.
- Os novos personagens usam `PastureAnimal`, com animação suspensa fora da câmera. A cabra tem um pasto acima da estrada; o porco, um cercado separado próximo ao celeiro, com pequena área de lama. As fontes PNG são preservadas e `prepare_pasture.py` alinha todas as poses pelos cascos antes de compactar em WebP.

Pipeline: preservar fonte PNG → recortar margem alpha → reduzir textura → WebP com alpha → carregar as texturas compactas no Phaser. Folhas de rig usam retângulos medidos em `scripts/assets/animal-frames.json`; a arte gerada não segue células iguais. Cada parte ganha textura independente. Não há animação de animais feita apenas deslocando uma imagem inteira.

Correção dos animais: cabeça completa, articulação compartilhada do pescoço/corpo, pernas com comprimento definido pela altura até o chão e territórios menores para evitar sobreposição. Os balões permanentes de fome foram removidos. Apenas produtos prontos exibem um pequeno indicador desenhado no Phaser, sem depender de textura de ícone.

A perspectiva e o acabamento ainda podem ser refinados. Não se declara equivalência artística de 100% com um jogo comercial.


# Pesquisa e decisão de plantio — 28/10/2026

A solicitação é aproximar a qualidade e o gesto de jogo da referência, preservando a identidade artística original.

Fontes consultadas:
- https://supercell.com/en/games/hayday/ — apresentação oficial e direção geral do jogo.
- https://hayday.fandom.com/wiki/Crops — documentação comunitária: usar uma cultura do silo como semente, colher duas e não cobrar moedas a cada plantio.
- https://hayday.fandom.com/wiki/Crops_List — documentação comunitária dos tempos: trigo 2 minutos e milho 5 minutos.
- https://extension.umn.edu/agriculture/crop-production/small-grains/spring-wheat-growth-and-development-guide — desenvolvimento real do trigo: folhas e perfilhos, alongamento, emissão de espigas e maturação; perda do verde nas espigas e hastes maduras.

Implementação:
- 1 semente do silo por campo; colheita de 2 unidades e 1 XP.
- Trigo em 120 s; milho em 300 s. Relógio e quantidades controlados pela API.
- Quatro estágios: terra semeada, brotos, folhagem/espigas verdes, espigas maduras douradas.
- Ferramentas explícitas para câmera, sementes e colheita; pintura dos campos por arrasto e confirmação de um lote atômico no servidor.
- 24 campos iniciais, parte com colheita de boas-vindas real e disponível.

As páginas da wiki são comunitárias. A mecânica foi escolhida para esta implementação; não constitui verificação exaustiva de todas as regras da versão atual de Hay Day. Não são reutilizadas texturas, sprites, marcas ou interfaces do jogo de referência.


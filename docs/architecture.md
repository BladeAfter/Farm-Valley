# Arquitetura — alpha 0.3

## Autoridade e persistência

O cliente mantém apenas um snapshot recebido da API. O servidor controla inventário, moedas, XP, campos, alimentação, produtos e pedidos. Schemas Zod rejeitam campos extras, preços, quantidades e relógio enviados pelo cliente. O plantio usa uma cultura do silo; cada colheita produz duas. O relógio do servidor decide maturação e produção.

Cada comando aplica regras a um clone. Um gesto com vários canteiros vira uma operação atômica: uma falha não desconta parcialmente o inventário. Colheitas e pedidos repetidos são rejeitados. No PostgreSQL, a mesma operação usa transação e SELECT FOR UPDATE. Sessão anônima: cookie HttpOnly, token aleatório e hash no banco. A migração do snapshot preserva moedas, XP e campos existentes.

Sem DATABASE_URL, o adaptador agora grava `.data/farm-sessions.json` no servidor de desenvolvimento: fila de transações, arquivo temporário, fsync e rename antes de responder. Reinício preserva o progresso. O adaptador de arquivo é para um único processo; PostgreSQL continua obrigatório em produção. Não há banco em nuvem publicado ou PostgreSQL real validado nesta entrega.

## Mundo e entrada

Phaser renderiza um mundo separado da interface React. O cenário combina texturas de grama/terra, rio, construções, árvores, flores, cercas e campos individualmente interativos. Não existe uma imagem de fundo que simule a fazenda inteira.

O modo Explorar arrasta a câmera. Os modos Plantar/Colher pintam canteiros e não movimentam a câmera. Arrastar uma semente da interface inicia um gesto de plantio; a entrada é acompanhada até pointerup/pointercancel. A validação final é sempre do servidor.

Os campos reconstroem seus sprites apenas quando o estágio ou a seleção muda. O vento atualiza a rotação dos clumps visíveis. Vaca e galinhas usam oito poses completas por especie em spritesheets, com escala comum e apoio dos pes. Ambos alternam IDLE/WALK/EAT/REST/PRODUCE; animação fora da câmera é suspensa. A cena tem alvo de 30 FPS. O desempenho ainda precisa ser medido em Android físico.

## Recursos

O snapshot atual é **v7**, com nove tipos de máquinas, 34 receitas, sete culturas, nove árvores frutíferas e produção de cinco espécies de animais. `src/data/production.ts` centraliza as receitas, preços, níveis e maestria. `server/services/production.ts` aplica compra, filas sequenciais, cancelamento futuro com devolução validada, coleta única, ampliação, venda e alimentação em lote. A mesma transação existente persiste inventário, horários e posições. Os detalhes de compatibilidade das migrações anteriores aparecem abaixo; a produção nova é descrita em [production.md](production.md).

O snapshot v4 acrescenta `goatMilk`, `truffle`, uma cabra e um porco. `migrateFarm` mantém moedas, experiência, campos, animais já existentes e níveis de armazéns. A migração é idempotente e os novos animais não são duplicados após reload. `animalProducts` define os tempos, itens e XP; o cliente envia somente o ID do animal para alimentar/coletar. Leite de cabra e trufas contam na capacidade do celeiro e têm pedidos próprios.

O snapshot v3 inclui `storage.barn` e `storage.silo`. A migração preserva moedas, inventário, XP, campos e animais de snapshots anteriores. `upgrade-storage` exige a etapa esperada, nível do jogador e moedas; a capacidade é calculada pela configuração compartilhada, não recebida do cliente. As etapas são 100/150/250 espaços, com requisitos de níveis 1/2/4. A compra é atômica no mesmo repositório transacional das demais operações.

`FarmBuildings` mantém posições e tamanhos definidos em `src/data/buildings.ts`. Os modelos iniciais são carregados na abertura; as formas seguintes são carregadas pelo Phaser quando necessárias. A atualização do snapshot muda textura e tamanho sem reposicionar construções nem aproximá-las umas das outras. Os limites de capacidade são usados na colheita, coleta de animais, compras e fabricação de ração.

`FieldTerrain` desenha o solo como uma textura contínua mascarada pelo contorno da lavoura. Sulcos e bordas são reconstruídos apenas quando as coordenadas dos campos mudam. `CropField` cuida das culturas e da seleção, sem desenhar placas individuais de terra; a grade de interação e a validação no servidor permanecem iguais.

Fontes PNG geradas por IA permanecem preservadas; o manifesto registra as texturas WebP runtime. A produção v7 acrescenta 16 texturas, cerca de 611 KiB, com carregamento das máquinas, ovelha e cacaueiro sob demanda. Produtos têm ícones vetoriais originais e indicadores pequenos no mapa. Os arquivos-fonte PNG ainda são copiados pelo publicDir do Vite para dist; separar fontes artísticas dos recursos distribuídos é uma etapa pendente do pacote Android. Phaser permanece no bundle principal; divisão e cache do engine são etapas futuras.

## Próximos sistemas

- PostgreSQL real, concorrência, backup, conta recuperável, publicação HTTPS.
- Expansão de novas regiões e novas etapas de capacidade.
- Rebanhos adicionais e medições de balanceamento da produção.
- Telegram com initData verificado no servidor e pacote Android com orientação nativa.
- Pinch zoom, medições de memória/GPU e testes em aparelho físico.


# Mercado entre jogadores

Acesso: **Mais → Mercado**. Comprar mostra anúncios de outras sessões; Meus anúncios permite selecionar qualquer item real do inventário, informar quantidade/preço total e publicar. Machados, TNT, dinamite, frutas, leite, sementes e produtos fabricados usam os ícones e nomes existentes. Sincronizar atualiza anúncios e saldo, incluindo vendas feitas enquanto o vendedor está aberto.

O mercado também possui uma banca física no cenário: toque no toldo verde e creme para abrir o mesmo mercado. A posição é escolhida pelo servidor numa área livre e fica salva em `marketStand`, sem remover objetos existentes. A área de 1,5 × 1,5 células bloqueia outras colocações. Se não houver espaço, o acesso pelo menu permanece disponível. Nesta versão a banca é fixa.

Arte original gerada com a skill imagegen: banca isométrica de madeira, toldo verde/creme, frutas, leite e ferramentas; placa com símbolo de cesta sem texto. Fonte PNG e WebP em `public/assets/buildings/market`. `scripts/assets/prepare-market.py` apenas recorta a margem transparente e reduz o arquivo para 384 px; a cena exibe largura de 112 px. Verificação: `tests/market-stand.test.ts` e `node scripts/market-stand-visual.mjs`, com captura desktop/mobile e teste de abertura/persistência.

Cada anúncio aceita 1–100 unidades, até 10 anúncios ativos por vendedor. O teto de preço total é dez vezes o valor de venda configurado por unidade (base 1 para itens sem preço de venda). Não há taxa, XP ou criação de moedas. O preço exibido é pelo lote inteiro.

Publicar retira o lote do inventário e o reserva no anúncio. Comprar transfere o lote, desconta moedas e paga o vendedor numa única transação. Só há um comprador por anúncio; compras próprias, IDs repetidos, campos extras e estoque/saldo/capacidade insuficientes são rejeitados. Cancelar devolve o lote e exige espaço no armazém correspondente. Se não houver espaço, o anúncio permanece intacto.

No PostgreSQL, `market_listings` guarda anúncios, com RLS e acesso apenas pelo backend; as fazendas mantêm o JSONB existente. Um lock transacional do mercado e bloqueios ordenados das sessões evitam duplicações e atualizações perdidas. No desenvolvimento, a mesma fila transacional do arquivo guarda as duas fazendas e o anúncio atomicamente. `db:import` também leva os anúncios do arquivo ao PostgreSQL, junto das sessões recém-importadas.

É um mercado entre sessões do mesmo servidor. A conexão Supabase está ativa no servidor local desde 7 de novembro de 2026. A hospedagem pública e contas recuperáveis continuam pendentes. As sessões anônimas continuam com validade de 30 dias; anúncios de sessões expiradas não aparecem. Não há busca, paginação ou notificações automáticas de venda nesta primeira versão.

Validação: `tests/market.test.ts` cobre ferramentas/frutas/leite, reserva, cancelamento, validação, concorrência e reinício; `node scripts/market-visual.mjs` usa duas sessões independentes, publicação e compra pela interface, recursos reais, rejeição de repetição, reload e layout 640×360. A suíte completa chegou a 131 testes. `scripts/postgres-check.ts` passou no Supabase real, incluindo dois compradores simultâneos e pagamento único.

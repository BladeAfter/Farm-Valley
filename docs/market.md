# Mercado entre jogadores

Acesso: **Mais → Mercado**. Comprar mostra anúncios de outras sessões; Meus anúncios permite selecionar qualquer item real do inventário, informar quantidade/preço total e publicar. Machados, TNT, dinamite, frutas, leite, sementes e produtos fabricados usam os ícones e nomes existentes. Sincronizar atualiza anúncios e saldo, incluindo vendas feitas enquanto o vendedor está aberto.

Cada anúncio aceita 1–100 unidades, até 10 anúncios ativos por vendedor. O teto de preço total é dez vezes o valor de venda configurado por unidade (base 1 para itens sem preço de venda). Não há taxa, XP ou criação de moedas. O preço exibido é pelo lote inteiro.

Publicar retira o lote do inventário e o reserva no anúncio. Comprar transfere o lote, desconta moedas e paga o vendedor numa única transação. Só há um comprador por anúncio; compras próprias, IDs repetidos, campos extras e estoque/saldo/capacidade insuficientes são rejeitados. Cancelar devolve o lote e exige espaço no armazém correspondente. Se não houver espaço, o anúncio permanece intacto.

No PostgreSQL, `market_listings` guarda anúncios, com RLS e acesso apenas pelo backend; as fazendas mantêm o JSONB existente. Um lock transacional do mercado e bloqueios ordenados das sessões evitam duplicações e atualizações perdidas. No desenvolvimento, a mesma fila transacional do arquivo guarda as duas fazendas e o anúncio atomicamente. `db:import` também leva os anúncios do arquivo ao PostgreSQL, junto das sessões recém-importadas.

É um mercado entre sessões do mesmo servidor. A hospedagem pública, a conexão Supabase (ainda depende da senha configurada) e contas recuperáveis não foram ativadas por esta implementação. As sessões anônimas continuam com validade de 30 dias; anúncios de sessões expiradas não aparecem. Não há busca, paginação ou notificações automáticas de venda nesta primeira versão.

Validação: `tests/market.test.ts` cobre ferramentas/frutas/leite, reserva, cancelamento, validação, concorrência e reinício; `node scripts/market-visual.mjs` usa duas sessões independentes, publicação e compra pela interface, recursos reais, rejeição de repetição, reload e layout 640×360. A suíte completa passou com 127 testes; build aprovado. As transações PostgreSQL ainda precisam de validação contra o banco remoto real.

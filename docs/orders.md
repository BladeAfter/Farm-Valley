# Encomendas da vila

O mural oferece de dois a seis pedidos conforme o nível. O servidor gera os produtos, quantidades, moedas, experiência e identificadores. Entregas validam todo o estoque em uma transação; duplicatas são rejeitadas. Entregar repõe a vaga após 45 segundos; descartar espera 120 segundos e não oferece recompensa.

O envio agora usa o caminhão da fazenda: ele carrega, viaja e retorna em 45 segundos. Outro envio aguarda o retorno; o descarte continua disponível. Viagem persistida e detalhes em `delivery-truck.md`.

A migração preserva o primeiro pedido legado e o progresso existente. O quadro físico ocupa uma célula livre e abre o mesmo mural da interface. Os cartões mostram estoque real, origem do produto, recompensas, confirmação de entrega e contagem de reposição.

Arte original: cinco retratos e o quadro foram gerados com IA; Clara usa ilustração SVG original. Arquivos em `public/assets/ui/customers` e `public/assets/buildings/order-board`. Prompts registrados em `scripts/assets/order-prompts.json`; conversão de tamanho/formato em `prepare-orders.py`.

Verificações: `tests/orders.test.ts` e `node --import tsx scripts/orders-visual.mjs`, com API e save isolados, cinco resoluções e entrega/descarte/reinício reais. Em 7 de novembro, `scripts/postgres-check.ts` também verificou no Supabase real a entrega concorrente, a recompensa única e a viagem persistida.

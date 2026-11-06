# Farm Valley — reformulação de interface

Implementação e auditoria em 5 de novembro de 2026. As regras de negócio e os salvamentos existentes foram preservados; nenhuma migração de economia foi aplicada nesta reformulação.

## Telas e navegação

- **Loja e construções:** catálogo único com Agricultura, Animais, Fábricas, Árvores, Decorações, Armazenamento e Suprimentos. Cards ilustrados selecionam um item; o rodapé mostra descrição, requisito e uma única ação. Compra/posicionamento usa os comandos autoritativos já existentes. Mover fica no mapa, por pressão longa, sem uma lista de botões na loja.
- **Animais:** cards por espécie/cercado, retrato, estado, ração disponível, produto e temporizador. Alimentar/coletar em lote afeta apenas os animais do cercado escolhido. Interação direta e ícones de recursos prontos do mapa foram preservados.
- **Fábricas:** miniatura, estrelas correspondentes à regra atual de maestria, receitas, estoque, ingredientes e fila. Maestria tem uma visualização própria. Ingredientes e fabricação ficam separados da loja. Espaços bloqueados repetidos foram substituídos por uma única ação de ampliação.
- **Pedidos:** cartão compacto com retrato vetorial original do cliente, item real, quantidade, disponibilidade e recompensas. Os detalhes expandem separadamente. O servidor atual tem um pedido ativo por vez: a interface não inventa pedidos paralelos.
- **Silo/celeiro:** abas, ocupação, estoque ilustrado e detalhes do produto. A melhoria abre separadamente e mostra somente o armazém escolhido e sua próxima etapa. A regra existente exige moedas e nível, sem materiais: a interface não inventa requisitos.
- **HUD:** moedas/diamantes com contadores animados, experiência compacta, configurações, câmera e navegação Loja/Inventário/Pedidos/Mais. A orientação de primeira colheita desaparece após obter XP; avisos desaparecem após 4,5 segundos.
- **Contexto do mapa:** tocar no celeiro ou silo abre a aba correspondente. Tocar em um canteiro vazio oferece seleção local de sementes e plantio. Construções e cercados continuam movendo por pressão longa de 1,2 s, com as colisões existentes.

## Componentes e arquivos

`src/components/ui/GameComponents.tsx`: GameModal, GameBottomSheet, GameTabs, ItemCard, BuildingCard, AnimalCard, RecipeCard, RewardBadge, LevelLock, UpgradePanel e ProgressIndicator.

`src/components/ui/ResourceCounter.tsx`: animação de valores com cancelamento de frames e respeito a movimento reduzido.

`src/components/buildings/ProductionQueue.tsx`: fila real, progressos, coleta, cancelamento e espaços disponíveis.

Fluxos: `shop/FarmShop.tsx`, `orders/OrdersPanel.tsx`, `animals/AnimalProductionPanel.tsx`, `buildings/MachinePanel.tsx`, `inventory/InventoryPanel.tsx`, `modals/FarmPanels.tsx` e `modals/PlotPopover.tsx`.

Estilo em `src/styles/premium-ui.css`, importado após o estilo legado em `src/main.tsx`. Nova miniatura isométrica original em `public/assets/ui/field.svg`. As demais ilustrações reutilizam os assets originais do jogo.

Integrações em `src/store/useFarm.ts`, `src/game/scenes/FarmScene.ts`, `src/components/hud/Hud.tsx`, `src/components/hud/FarmControls.tsx` e `src/App.tsx`.

## Responsividade e acesso

Modais pequenos, médios e grandes têm cabeçalho fixo e rolagem interna. Painéis contextuais pequenos se alinham à parte inferior em telas estreitas. O catálogo mantém detalhes e ação fora da rolagem dos cards. Na fábrica em landscape pequeno, estrelas/maestria passam para o cabeçalho para manter fabricar e ampliar visíveis.

Escape fecha o modal, Tab fica contido nele e o foco é restaurado ao fechar. Controles têm nomes acessíveis, seleção por `aria-pressed`, imagens decorativas sem leitura duplicada e transições desativadas quando o jogador pede movimento reduzido. O relógio dos painéis só atualiza quando um painel com temporizador está aberto.

## Verificação executada

- `npm test`: **110/110** testes de regras de negócio.
- `npm run build`: TypeScript e Vite aprovados. O aviso de bundle grande, dominado pelo Phaser, permanece.
- `npm run test:browser`: plantio/colheita por arrasto, alimentação, pedido, recarregamento, orientação, bloqueio de compra por nível, seleção de sementes no canteiro e abertura direta do celeiro.
- `node --import tsx scripts/production-visual.mjs`: compra/confirmar, fila FIFO, cancelamento, expansão, coleta, venda, alimentação em lote, pedido real, falha de resposta após commit, reinício da API, movimento por pressão longa e rejeição de relógio adulterado. Catálogo com sete categorias e painéis em **1280×800, 960×540, 844×390, 640×360 e 1024×768**; imagens dentro dos cards, ausência de transbordamento horizontal, fechamento, ações principais e melhoria separada. Usa salvamento temporário isolado.
- Conferência visual dos screenshots, com correção do transbordamento inicial das miniaturas e do rodapé da fábrica em tela pequena. Os testes finais passaram sem erros JavaScript ou assets ausentes.

Screenshots: `ui-fabricas-desktop.png`, `ui-agricultura-desktop.png`, `ui-animals-desktop.png`, `ui-orders-desktop.png`, `ui-armazenamento-desktop.png`, `ui-factory-small-landscape.png` e `ui-storage-landscape.png`, em `docs/screenshots`.

## Limites e solicitações de regras pendentes

A maestria atual continua baseada em lotes (0/10/40/100, redução 0/3/5/8%). O pedido anterior de maestria por tempo-base, proveniência de produtos e bônus de venda ainda exige implementação própria no servidor; não foi simulado nesta interface.

A fazenda atual ainda inicia com 24 canteiros e compra unidades adicionais por 5 moedas. O pedido anterior de começar com um gratuito, desbloquear por nível e guardar construções compradas ainda exige migração e regras próprias. A loja mostra os valores reais existentes; não anuncia essa progressão como pronta.

Compra de novos cercados de vacas, galinhas, cabras e porcos continua indisponível; os existentes podem ser visitados. A compra do aprisco de ovelhas funciona pela API. Nenhum botão indisponível finge comprar outra espécie.

Conta recuperável, Telegram autenticado, Android físico, hospedagem em nuvem e PostgreSQL real não foram validados nesta etapa.

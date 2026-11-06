# Produção agropecuária e fábricas — versão 7

O jogo agora usa uma cadeia real: culturas → rações por espécie → produtos animais → alimentos → vendas e pedidos. Os comandos passam pela API e pelo repositório transacional existentes. Não há progresso de produção mantido somente no navegador.

## Jogar

- **Loja → Máquinas:** compre, escolha um lugar da grade e pressione **Construir**. A prévia mostra a construção e o espaço ocupado antes de gastar moedas.
- Toque na fábrica para escolher uma receita e fabricar. Os ingredientes são consumidos nesse momento. Produtos prontos precisam ser coletados.
- Segure uma máquina por 1,2 segundo e arraste para movê-la, como nos cercados. Filas e horários acompanham a máquina.
- Nos animais, alimente/colete individualmente ou use as ações em lote. Um toque no animal com produto pronto coleta diretamente. O celeiro cheio mantém o produto na origem.
- No inventário, escolha uma categoria, a quantidade por venda e o produto. O servidor retira estoque real e credita o preço configurado.
- As fontes de sementes de reserva continuam na loja. A compra de rações de reserva permanece disponível; fabricar usa ingredientes e tempo, em vez de moedas.

## Máquinas e receitas

| Máquina | Nível | Compra | Receitas |
| --- | --- | --- | --- |
| Fábrica de ração | 2 | 60 | 5 rações específicas, 3 unidades por lote |
| Padaria | 4 | 160 | Pão, pão de milho, biscoito, muffin, torta |
| Laticínios | 6 | 240 | Creme, manteiga, queijo, queijo de cabra |
| Confeitaria | 10 | 420 | Bolo simples, cenoura, maçã, chocolate, morango |
| Engenho de açúcar | 14 | 580 | Mascavo, branco, xarope |
| Pipoqueira | 16 | 660 | Pipoca simples, com manteiga, doce |
| Churrasqueira | 20 | 850 | Bacon grelhado, ovos com bacon, batatas assadas |
| Casa de sucos | 24 | 1.100 | Maçã, cenoura, frutas |
| Sorveteria | 28 | 1.350 | Baunilha, morango, chocolate |

São **34 receitas** com ingredientes, quantidades, tempos, XP e níveis centralizados em [production.ts](../src/data/production.ts). As receitas pedidas de ração, padaria, laticínios e confeitaria usam os ingredientes e tempos do pedido. As receitas das cinco máquinas adicionais foram configuradas para encadear açúcar, manteiga, creme, bacon e frutas. O catálogo contém **36 novos produtos**, incluindo bacon e lã.

Morango e batata são novas culturas, liberadas nos níveis 10 e 18. O cacaueiro usa os seis estágios do pomar existente, com nível 10, crescimento inicial de 5 minutos, ciclo de 6 horas e três frutos. Produtos agrícolas, estoque e capacidade usam os sistemas anteriores.

### Animais e compatibilidade

Próximos ciclos: galinha **20 min**, vaca **1 h**, cabra **2 h**, porco **3 h/bacon**, ovelha **4 h/lã**. Cada animal consome uma unidade da ração correspondente. A ovelha e seu aprisco podem ser comprados/posicionados no nível 18 por 120 moedas.

Os quatro tipos de animais do kit inicial existente continuam disponíveis; não foram removidos nem bloqueados retroativamente. Os níveis de referência 3/8/12 para vaca/porco/cabra não retiram animais de fazendas existentes. Isso também preserva o kit inicial da versão alpha. A aquisição adicional de rebanhos de vacas, cabras, porcos e galinhas não foi adicionada nesta entrega; o aprisco de ovelhas é a nova aquisição disponível.

O snapshot migra de 6 para 7 sem reiniciar inventário, moedas, XP, culturas, obstáculos removidos, pomar ou posições. Produções animais já iniciadas mantêm seu prazo anterior e seu produto, inclusive a última produção de trufas do porco. Após coletá-la, a próxima alimentação produz bacon em três horas. Trufas armazenadas continuam utilizáveis em vendas e pedidos. As antigas rações universais são preservadas como uma reserva finita; novas compras/fabricações entregam rações por espécie. O comando antigo de fabricação instantânea é rejeitado com orientação para usar a fábrica.

## Filas, cancelamento e maestria

- Cada máquina começa com **2 espaços**; ampliações até **6** custam 30/60/120/200 moedas. A compra exige a quantidade atual de espaços para rejeitar repetição.
- Os lotes guardam ID, receita, início, conclusão, duração e quantidade. A fila é sequencial, usando o término do último lote como início do seguinte. Itens concluídos continuam ocupando espaço até serem coletados.
- Não é necessário um processo agendador para continuar offline: os horários persistidos determinam o estado quando o jogador retorna.
- Só é possível cancelar um lote **ainda não iniciado**. Os ingredientes voltam uma vez, se houver espaço no silo/celeiro. Os lotes seguintes são reprogramados sem ganhar produção gratuita.
- A coleta remove o ID do lote e credita produto/XP na mesma transação. Repetir o ID não credita novamente.
- Enfileiramento e venda exigem a revisão esperada da fazenda. Repetir uma solicitação após ela ter sido confirmada pelo servidor não repete seu custo/recompensa. A recuperação de uma resposta perdida consulta o servidor sem reenviar o POST automaticamente.
- Maestria conta lotes **coletados**, não itens de um lote. Em 10/40/100 lotes, o bônus de velocidade é 3%/5%/8%. O benefício vale para novos lotes e não altera horários já salvos.

## Economia e armazenamento

O catálogo define os valores de venda. Rações compradas na loja têm preço maior que sua revenda; não é possível lucrar comprando e revendendo o mesmo pacote. Os demais preços consideram ingredientes e tempo, mas ainda precisam de balanceamento com telemetria de jogadores reais.

As categorias do inventário são Produtos animais, Rações, Padaria, Laticínios, Bolos e doces, Industrializados, Ingredientes agrícolas e Ferramentas. Culturas contam no silo; os outros itens contam no celeiro. Produtos prontos permanecem com o animal ou máquina quando não há espaço.

Pedidos usam somente produtos de cadeias acessíveis: nível, máquinas e fontes de ingredientes são verificados recursivamente. Ter estoque suficiente também torna um item acessível. O cliente envia o número e o item esperado do pedido, não escolhe a recompensa.

## Arte, animações e desempenho

- **14 fontes originais de IA**: nove máquinas, oito poses da ovelha em uma folha, aprisco, seis estágios do cacaueiro em uma folha e duas culturas. Não foram usadas imagens de outros jogos.
- As nove texturas de máquinas somam aproximadamente **348 KiB**. Todas as 16 novas texturas runtime somam cerca de **611 KiB**. Fontes PNG são preservadas, mas não são solicitadas pelo jogo.
- Máquinas só carregam no Phaser quando são possuídas ou selecionadas para compra. A ovelha e seu abrigo carregam quando ela é adquirida. O cacaueiro usa o carregamento sob demanda do pomar.
- Engrenagens, fumaça e vapor funcionam só durante fabricação e são suspensos fora da câmera. A coleta usa pequenos efeitos de produto e partículas. Sons curtos são sintetizados, habilitados após uma interação; há opção para desligá-los em Configurações.
- Os 36 ícones de produção são vetores originais leves, com ilustrações próprias para pão, pão de milho, torta, muffin, lácteos, bolos, bebidas e demais produtos.

Prompts exatos: [production-prompts.json](../scripts/assets/production-prompts.json). Preparação: `python scripts/assets/prepare-production.py`; ícones: `node --import tsx scripts/assets/production-icons.ts`. O manifesto é atualizado pela preparação.

## Arquivos principais

| Área | Arquivos |
| --- | --- |
| Configuração | `src/data/production.ts`, `src/types/game.ts`, `src/types/orchard.ts`, `src/types/land.ts` |
| Regras e segurança | `server/services/production.ts`, `server/services/farm.ts`, `server/validators/command.ts` |
| Mapa e seleção | `src/game/entities/FactoryBuildings.ts`, `src/game/scenes/FarmScene.ts`, `src/data/land.ts` |
| Animais | `src/game/entities/{CowSprite,ChickenSprite,PastureAnimal,AnimalPens}.ts`, `src/data/{pens,animals}.ts` |
| Interface | `src/components/buildings/{MachinePanel,MachineShop}.tsx`, `src/components/animals/AnimalProductionPanel.tsx`, `src/components/inventory/InventoryPanel.tsx`, `src/components/shop/FeedShop.tsx`, `src/components/modals/FarmPanels.tsx`, `src/components/obstacles/PlacementBar.tsx` |
| Estado, som e estilo | `src/store/useFarm.ts`, `src/services/farmAudio.ts`, `src/utils/time.ts`, `src/styles/index.css` |
| Arte | `public/assets/buildings/machines/`, `public/assets/animals/sheep/`, `public/assets/buildings/pens/sheep-*`, `public/assets/trees/orchard/cocoa/`, `public/assets/crops/{strawberry,potato}/`, `public/assets/products/production/` |

## Validação e limites

`tests/production.test.ts` cobre todas as receitas, durações, custos, filas, cancelamento, espaço, maestria, venda, migração, alimentação em lote, ovelha, regras dos pedidos e concorrência. Tempos de até quatro horas são testados com instantes de referência na regra do servidor, sem esperar essas horas no navegador.

`node --import tsx scripts/production-visual.mjs` inicia uma API isolada na porta 3199 com um save válido de nível alto. Testa imagens das nove máquinas, compra pela interface com prévia/confirmar, fila, espaços, cancelamento, conclusão real de um lote previamente iniciado quase completo, coleta única, venda, cuidado de animais em lote, perda de resposta após commit, movimento por pressão longa, reinício do processo da API, rejeição do relógio adulterado do cliente e tela horizontal 960×540. As capturas estão em `docs/screenshots/production-v1-*.png`. Esse save é de teste e não altera o progresso dos jogadores.

O jogo continua executável com o servidor local persistente. PostgreSQL real, publicação em nuvem, recuperação de conta, Telegram autenticado e Android físico não foram validados nesta entrega. O adaptador local é de processo único; produção continua exigindo `DATABASE_URL`. Medições reais de memória/GPU e balanceamento de longo prazo permanecem pendentes.

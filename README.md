# Farm Valley — alpha 0.3

Jogo de fazenda isométrico com React, TypeScript, Phaser 3, Zustand, Tailwind e API autoritativa Express/PostgreSQL.

## Jogar localmente

```sh
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente http://localhost:5173). A API usa a porta 3001.

- **Explorar:** arraste o mapa. Use + / − ou a roda do mouse para zoom.
- **Colher:** selecione a foice e arraste pelos campos dourados.
- **Plantar:** abra o seletor de sementes e escolha uma das sete culturas. Arraste a semente ou pinte os campos vazios com a cultura selecionada.
- Cada campo usa **1 cultura do silo como semente** e produz **2 unidades**, com XP configurado por cultura. Plantar não custa moedas.
- Trigo: **2 minutos**; milho: **5 minutos**. Os tempos são validados pela API.
- **Animais:** galinha 20 min/ovo, vaca 1 h/leite, cabra 2 h/leite de cabra, porco 3 h/bacon e ovelha 4 h/lã. Alimentação individual ou em lote consome a ração da espécie. Produtos prontos podem ser coletados diretamente no animal ou no painel. Ovelha e aprisco são adquiridos no nível 18. Produções antigas preservam produto e prazo anteriores.
- **Pedidos:** entregue produtos reais e receba moedas e XP. O servidor impede entrega repetida.
- **Loja:** catálogo ilustrado de Agricultura, Animais, Fábricas, Árvores, Decorações, Armazenamento e Suprimentos. Selecione um card para consultar e comprar/posicionar; a categoria **Fábricas** oferece nove máquinas com prévia e confirmação no mapa. Veja [telas e validação da interface](docs/ui-redesign.md).
- **Produção:** 34 receitas, filas sequenciais de 2 até 6 espaços, coleta, cancelamento de lotes não iniciados, maestria, vendas e pedidos integrados. Veja [regras e arquivos](docs/production.md).
- **Árvores Frutíferas:** a categoria da Loja oferece nove espécies, incluindo cacau, com arte e estágios próprios. Escolha uma muda e toque num espaço livre. As seis macieiras iniciais são funcionais e começam com uma colheita pronta. Toque na árvore para colher ou consultar o temporizador. Após colher, ela inicia outro ciclo, mesmo com o jogo fechado. Frutas usam a capacidade do celeiro.
- Produção: macieira 2 h/3 frutas; pereira 3 h/3; cerejeira 4 h/4; laranjeira 5 h/3; limoeiro 6 h/4; pessegueiro 7 h/3; mangueira 8 h/3; abacateiro 10 h/3. Crescimento inicial separado de 1 a 5 minutos. Preços, níveis, valores de venda e tempos ficam em `src/types/orchard.ts`. Limite opcional de quatro colheitas desativado por padrão.
- Toque no celeiro/silo para abrir o inventário. Toque em um campo no modo Explorar para ver o tempo e as ações.
- **Armazéns:** celeiro e silo começam rústicos, com 100 espaços cada. No nível 2, cada um pode ser melhorado para 150 por 75 moedas; no nível 4, para 250 por 180 moedas. Cada etapa tem arte própria e é comprada separadamente pelo Inventário. O servidor valida nível, custo e etapa atual.
- **Limpar terreno:** toque nas árvores, rochas, troncos e arbustos. O painel mostra a ferramenta exigida e o estoque. Cada remoção consome uma unidade, é confirmada pelo servidor e libera a área da grade.
- **Ferramentas:** a fazenda recebe duas de cada tipo no kit inicial, também concedido uma única vez na migração. Elas aparecem na aba Celeiro do inventário e contam na sua capacidade. Novas fontes de ferramentas ficam para recompensas futuras; não há compra obrigatória.
- **Construções:** a loja permite posicionar canteiros por 5 moedas e floreiras por 8. Para reposicionar construções e cercados sem custo, segure o objeto no mapa por 1,2 s e arraste. O servidor bloqueia obstáculos, outras construções, cercados, pomar, caminhos, rio e áreas fechadas.

A fazenda nova inclui 24 campos, com uma colheita inicial real disponível, 8 trigos, 6 milhos, 4 rações, uma vaca, duas galinhas, uma cabra e um porco. Os animais têm cercados próprios. Fabrique ração por espécie na fábrica do mapa ou compre pacotes de reserva em Suprimentos. A atualização de fazendas anteriores acrescenta cabra/porco sem reiniciar moedas, inventário, campos ou armazéns. A nova progressão de compra de canteiros e a maestria por horas ainda estão pendentes.

## Banco e limites

Copie `.env.example` para `.env` e configure `DATABASE_URL` com um PostgreSQL existente. A API cria a tabela na inicialização e usa transação com bloqueio da fazenda nas operações. Sem PostgreSQL, o servidor usa **arquivo persistente de desenvolvimento** em `.data/farm-sessions.json`, com operações serializadas e gravação atômica. Esse arquivo permanece ao reiniciar a API; faça backup para mantê-lo em outra máquina. `FARM_SAVE_PATH` permite outro caminho. Esse adaptador é para um único processo local; em produção a API exige PostgreSQL. Não existe salvamento em localStorage. Estados do antigo modo somente em memória que já foram perdidos não podem ser recuperados.

A sessão anônima usa cookie HttpOnly e hash do token no banco. O Supabase foi ativado e verificado no PostgreSQL real em 7 de novembro de 2026; veja [migração e testes](docs/supabase.md). Um APK de teste foi gerado; veja [Android](docs/android.md). Vinculação a uma conta recuperável, Telegram initData, hospedagem pública e validação em Android físico continuam pendentes.

## Verificar

```sh
npm run build
npm test
npm run test:browser
node scripts/obstacles-visual.mjs
node scripts/obstacles-mobile.mjs
node --import tsx scripts/land-placement-visual.mjs
node scripts/persistence-check.mjs
node --import tsx scripts/orchard-visual.mjs
node scripts/orchard-mobile.mjs
node --import tsx scripts/orchard-lazy-visual.mjs
node --import tsx scripts/production-visual.mjs
node --import tsx scripts/hold-move-check.mjs
```

O teste de navegador exige servidores ativos e Chrome instalado. Use `CHROME_PATH` para outro executável e `FARM_BASE_URL` para outro endereço.

## Arte original e pipeline

Construções, grama, terra, árvores, flores, trigo, milho e animais foram gerados por IA como assets separados e integrados ao Phaser. O mundo não é uma imagem única. As fontes PNG permanecem em `public/assets`; o jogo carrega WebP compactos. Vaca e galinhas usam spritesheets de oito poses completas, alinhadas pelos pés. Ícones de interface/produtos são vetores originais.

```sh
python scripts/assets/prepare.py
python scripts/assets/prepare-production.py
node --import tsx scripts/assets/production-icons.ts
node scripts/assets/rasterize.mjs
```

A preparação exige Python com Pillow; a rasterização dos ícones exige Chrome/Playwright. O manifesto de texturas está em `public/assets/manifest.json`.

Veja [pesquisa do plantio](docs/planting-research.md), [arquitetura](docs/architecture.md) e [verificação](docs/verification.md).

## Atualização: pedidos, alimentação e idiomas

O mural agora possui pedidos individuais com estoque e recompensas validados pelo servidor, descarte e reposição temporizada. A alimentação mostra comida por espécie, aproximação do animal e consumo visual. Em Configurações, o seletor permite alternar entre 16 idiomas sem reiniciar o mapa.

Documentação: [pedidos](docs/orders.md), [alimentação](docs/feeding.md) e [localização](docs/localization.md). As traduções ainda aguardam revisão por falantes nativos.

Verificações adicionais:

```sh
node scripts/localization-visual.mjs
node --import tsx scripts/orders-visual.mjs
node --import tsx scripts/feeding-visual.mjs
```

## Limitações de implantação

Expansão de novas regiões, aquisição de rebanhos adicionais, amigos, conta recuperável, backend publicado, integração autenticada Android/Telegram, pinch zoom, balanceamento com jogadores e medições em celular físico.


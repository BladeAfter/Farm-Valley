# Localização

16 idiomas: português brasileiro, inglês, espanhol, russo, turco, persa, árabe, francês, alemão, italiano, indonésio, hindi, chinês simplificado, japonês, coreano e polonês.

O catálogo contém 330 chaves por idioma. São traduções iniciais; a revisão por falantes nativos permanece pendente. Consulte `locale-coverage.json`. Nomes próprios dos moradores e da fazenda são preservados.

O motor em `src/i18n` usa Zustand e Intl, com pacotes carregados sob demanda, fallback inglês e cache local dos pacotes já visitados. A escolha manual tem prioridade sobre a detecção do navegador e é salva localmente e no servidor da sessão do jogador. Isso não substitui um futuro sistema de contas. O progresso continua controlado pelo servidor.

Persa e árabe usam RTL na interface; o canvas mantém direção LTR. Números, durações e plurais usam Intl, com formas adicionais para russo, polonês e árabe. As fontes dependem das famílias disponíveis no dispositivo; ainda é necessária revisão em aparelhos Android físicos.

Para editar traduções, altere os arquivos `src/i18n/catalog/*.tsv` (separador `|`, ordem em `languages.ts`) e execute `node scripts/build-locales.mjs`. Não traduza IDs de comandos, receitas ou itens. Novas formas plurais ficam em `plurals.ts`.

Validação: testes unitários de cobertura, variáveis e variantes; `node scripts/localization-visual.mjs` verifica os 16 idiomas, persistência, estabilidade do canvas e economia, RTL e largura de 640 px. Capturas ficam em `docs/screenshots/language-*-small.png`. A auditoria JSX em `scripts/assets/audit-texts.mjs` complementa os testes, sem substituir revisão linguística humana.

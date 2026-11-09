# Colocar o backend online

Publicado em `https://farm-valley.onrender.com`. Em 8 de novembro de 2026, `/healthz`, página inicial e o teste de navegador completo passaram no endereço público, com `storage: "postgres"`. No Render, a conexão do Supabase usa **Session pooler** (IPv4); a senha fica somente na variável secreta do serviço.

O backend Node/Express já existe em `server/`. O Supabase armazena os dados PostgreSQL; ainda é necessário um serviço que execute o Node. O `render.yaml` prepara um único Web Service que serve o jogo e a API na mesma origem HTTPS, mantendo os cookies de sessão.

1. Crie/entre na conta em https://dashboard.render.com/ e escolha **New → Blueprint**.
2. Conecte o repositório `BladeAfter/Farm-Valley`, branch `main`. O arquivo `render.yaml` preenche os comandos de compilação/inicialização.
3. Preencha `DATABASE_URL` em variável secreta com a conexão PostgreSQL real do Supabase. Substitua o placeholder pela senha do banco, com caracteres especiais codificados para URL. Não publique a senha no GitHub ou no chat.
4. Se a rede do provedor não alcançar o endereço direto IPv6 do Supabase, use a URL de **Session pooler** copiada do painel Supabase. Ela tem hostname e usuário próprios; não troque apenas o host manualmente.
5. Se for necessário o CA do Supabase para verificar TLS, envie o certificado público como Secret File e configure `DATABASE_CA_PATH` com o caminho correspondente. Não desative a verificação de certificado.
6. Inicie o deploy. O banco é inicializado ao iniciar a API. `/healthz` só responde `ok:true` se a conexão PostgreSQL responder. A página inicial deve abrir o jogo e `/api/farm` deve informar `storage: "postgres"` depois da sessão criada.
7. Copie a URL HTTPS gerada pelo serviço. Esse endereço será usado para configurar o APK.

O plano gratuito é configurado apenas para experimentar; confirme no provedor os limites e a suspensão por inatividade antes de usá-lo com jogadores. Esta configuração não cria uma conta Render nem publica automaticamente o serviço.

As fazendas locais anteriores não são copiadas automaticamente ao serviço. O procedimento em `supabase.md` importa os dados existentes com a mesma senha e preserva as sessões. Sem sistema de contas recuperáveis, cada dispositivo/navegador continua com a própria sessão; hospedar não une progressos automaticamente.

Referências oficiais: https://render.com/docs/blueprint-spec e https://render.com/docs/configure-environment-variables

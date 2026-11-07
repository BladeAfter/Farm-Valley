# Persistência no Supabase

Destino: `db.lawtneoasbcujjyfutal.supabase.co:5432/postgres`.

A senha não foi fornecida: a conexão e a importação ainda não foram executadas neste banco. O jogo permanece usando o armazenamento configurado atualmente até a ativação abaixo.

1. Pare a API antes da migração, para não perder alterações feitas durante a cópia.
2. Copie `.env.example` para `.env` no servidor. Configure `DATABASE_REQUIRED=true` e `DATABASE_URL` com a URL fornecida e a senha real no lugar de `YOUR-PASSWORD`. Caracteres especiais da senha precisam de codificação de URL. Não use prefixo `VITE_` nem publique esse arquivo.
3. Se necessário, baixe o certificado CA do painel Supabase e configure `DATABASE_CA_PATH` com seu caminho. A validação TLS permanece habilitada.
4. Execute `npm run db:check`. A confirmação deve mostrar conexão PostgreSQL e `ssl: true`.
5. Execute `npm run db:import` para importar `.data/farm-sessions.json`. O comando cria o esquema, importa em uma única transação e ignora sessões já existentes, sem sobrescrever o destino ou remover o arquivo original. Repita com segurança se necessário.
6. Reinicie com `npm run dev` ou `npm run server`. O log deve indicar PostgreSQL; a resposta de `/api/farm` deve conter `storage: "postgres"`. Confirme o progresso e recarregue o jogo.

Toda a fazenda fica no JSONB `public.sessions.farm`: inventário, moedas, diamantes, XP, canteiros, animais, alimentação, produção, construções/posições, árvores, obstáculos, melhorias, pedidos e idioma. O servidor mantém bloqueio de linha e transação para cada operação. Nenhum fallback para arquivo acontece quando uma URL PostgreSQL foi configurada e falha.

RLS é habilitado e os papéis públicos/anon/authenticated não acessam os saves diretamente. A conexão de backend usa o usuário PostgreSQL fornecido. O navegador nunca recebe a senha do banco. O login atual continua sendo uma sessão anônima em cookie de 30 dias: uma conta recuperável e sincronização entre dispositivos ainda exigem autenticação própria.

Assets de imagem e áudio continuam sendo arquivos do projeto; não são progresso de jogador e não são copiados para PostgreSQL.

A conexão direta pode exigir IPv6. Se a hospedagem só tiver IPv4, copie do painel a URL de **Session pooler**, sem inventar região/hostname/usuário. Referência: https://supabase.com/docs/guides/database/connecting-to-postgres

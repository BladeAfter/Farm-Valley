# Persistência no Supabase

Destino: `db.lawtneoasbcujjyfutal.supabase.co:5432/postgres`.

Ativado no servidor local em 7 de novembro de 2026, com TLS e verificação do certificado: 41 sessões e 3 anúncios foram importados e comparados integralmente com o arquivo local. O arquivo original e um backup permaneceram em `.data/`. As credenciais estão apenas nos arquivos privados `.env` e `.env.supabase`, ignorados pelo Git.

O certificado público oficial está em `server/database/certs/supabase-ca-2021.crt`, obtido de `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`. SHA-256 do certificado: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. A verificação TLS não foi desativada.

`node --import tsx scripts/postgres-check.ts` passou contra este PostgreSQL real: compradores simultâneos, entregas simultâneas, recompensa única e persistência da viagem. O teste cria e remove apenas suas próprias sessões temporárias. A hospedagem pública da API continua sendo uma etapa separada, descrita em `hosting.md`.

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

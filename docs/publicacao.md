# Publicação: Vercel + Render + Neon

## Preparação local

No backend: `npm ci`, `npm run build`, `npx prisma migrate deploy`.
Crie o administrador usando `npm run admin:create`. O comando sugere
`victor@hotmail.com`, pede nome e senha oculta, e nunca redefine uma conta existente.
Mantenha o `.env` apontando para o banco pretendido. Não execute o seed legado em
produção: ele apaga cadastros anteriores.

Desenvolvimento: `npm run dev` no backend e no frontend, em terminais separados.
Produção local: `npm start` no backend depois do build.

## Render (API)

Use o repositório do projeto e a pasta raiz `back-end`, ou o Blueprint `render.yaml`.
Build: `npm ci --include=dev && npm run build`.
Start: `npx prisma migrate deploy && npm start`.
Health check: `/health`.
O build inclui o Prisma Client gerado dentro de `dist/generated/prisma`.

Configure variáveis no serviço:

| Variável | Valor |
| --- | --- |
| DATABASE_URL | Conexão PostgreSQL do Neon com TLS |
| JWT_KEY | Segredo aleatório longo; o Blueprint gera um se ainda não existir |
| FRONTEND_URL | Origem HTTPS exata do frontend, sem barra final |
| TRUST_PROXY | `1` para o proxy do Render |
| OPENAI_API_KEY | Chave do projeto OpenAI com crédito disponível |
| OPENAI_MODEL | Identificador de modelo de texto disponível na sua conta |

`PORT` é fornecida pelo Render. A autenticação administrativa é obrigatória nas
rotas de gestão; o catálogo público só mostra planos ativos.

## Vercel (frontend)

Importe o mesmo repositório com Root Directory `front-end` e framework Vite.
Configure `VITE_API_URL` com a URL HTTPS da API do Render, sem barra final.
Build: `npm run build`; saída: `dist`. O arquivo `front-end/vercel.json` contém
as configurações. As páginas usam fragmentos (`/#cliente`, `/#gestao`), sem
necessidade de reescritas de rota no servidor estático.

Depois de obter a URL da Vercel, ajuste `FRONTEND_URL` no Render e faça redeploy.
Sempre que mudar `VITE_API_URL`, reconstrua o frontend. Nunca copie chave de IA,
JWT_KEY ou DATABASE_URL para variáveis `VITE_`.

## Conteúdo inicial e IA

Entre em `/#gestao` com o administrador criado. Em Planos, marque os destaques.
Em Horários, publique vagas futuras. Em Informações IA, clique em Consultar IA.
O servidor consulta a Responses API da OpenAI, salva texto, modelo e data, e
identifica sua origem na página do cliente. Não há texto fictício substituindo a IA.
Sem chave/modelo, a operação informa indisponibilidade. A edição do plano invalida
o texto anterior; o cache limita novas consultas do mesmo conteúdo a uma por dia.

## Verificação após publicar

1. Abrir o catálogo sem login, pesquisar e reexibir destaques.
2. Cadastrar cliente e testar login com Manter conectado; recarregar e sair.
3. Reservar uma vaga e conferir Meus agendamentos.
4. Confirmar a solicitação no admin e conferir resposta no cliente.
5. Conferir gráficos, conteúdo de IA identificado e bloqueio da API sem token.

Não considere o requisito 12 concluído até as URLs públicas estarem funcionando
em conjunto. Os arquivos de configuração, sozinhos, não comprovam publicação.

Referências: [Render Blueprint](https://render.com/docs/blueprint-spec),
[Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[OpenAI Responses API](https://developers.openai.com/api/docs/guides/text).

# Projeto Manager — projeto separado

O template do Blogger foi separado em arquivos comuns de HTML, CSS e JavaScript, mantendo o código principal do jogo junto para preservar o estado compartilhado e o funcionamento das funções.

## Estrutura

```text
Projeto-Manager/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── eventos.js
│   └── app.js
├── assets/
│   └── favicon.svg
└── README.md
```

## Como executar

1. Extraia a pasta do ZIP.
2. Abra a pasta no VS Code.
3. Inicie um servidor local, por exemplo com a extensão **Live Server**.
4. Abra o `index.html` pelo endereço local mostrado pelo servidor.

Também é possível iniciar um servidor com Python, dentro da pasta do projeto:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Neon e Vercel

1. Instale o Node.js LTS.
2. Execute `npm install` na raiz do projeto.
3. Crie um banco no Neon e defina `DATABASE_URL` nas variáveis da Vercel.
4. Execute `db/schema.sql` no SQL Editor do Neon.
5. Execute `db/migration-001-source-payload.sql`, `db/migration-002-gameplay-relations.sql` e `db/migration-003-auth.sql` no SQL Editor.
6. Para importar o JSON inicial, use `npm run seed:soccerwiki -- caminho/arquivo.json`.

Endpoints iniciais:

- `GET /api/health`: verifica a conexão com o Neon.
- `GET /api/catalog`: retorna ligas, clubes, competições, estádios e dirigentes.
- `GET /api/catalog?entity=clubs`: retorna apenas clubes.
- `GET /api/world?search=Silva&limit=100`: consulta jogadores paginados.
- `POST /api/auth` com `{ "action": "send", "email": "..." }`: envia código via Resend.
- `POST /api/auth` com `{ "action": "verify", "email": "...", "code": "123456" }`: cria sessão.

O arquivo `db/gameplay-data.example.json` mostra o formato esperado para os dados personalizados de elenco, contratos, temporadas, competições e finanças.

## Configuração e dependências

- `js/config.js`: contém a URL do Google Apps Script usada pelo projeto original para login, carregamento e salvamento das carreiras. O funcionamento dessas funções depende de a API remota continuar publicada e acessível.
- `js/eventos.js`: contém o catálogo estático de eventos e eventos da bilheteria.
- `js/app.js`: contém o motor e a lógica principal do jogo.
- `css/style.css`: contém os estilos da interface.
- `assets/favicon.svg`: ícone extraído do HTML original.

A imagem de estádio do menu inicial (e do fundo da tela de nova carreira) fica em `assets/estadio.jpg`; para trocá-la, substitua esse arquivo mantendo o mesmo nome.

Os estilos da seção visual V3 foram mantidos ativos corrigindo o fechamento ausente de um comentário CSS no arquivo de origem.
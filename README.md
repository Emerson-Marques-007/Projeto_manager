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

## Configuração e dependências

- `js/config.js`: contém a URL do Google Apps Script usada pelo projeto original para login, carregamento e salvamento das carreiras. O funcionamento dessas funções depende de a API remota continuar publicada e acessível.
- `js/eventos.js`: contém o catálogo estático de eventos e eventos da bilheteria.
- `js/app.js`: contém o motor e a lógica principal do jogo.
- `css/style.css`: contém os estilos da interface.
- `assets/favicon.svg`: ícone extraído do HTML original.

A imagem de estádio do menu inicial estava como marcador `URL_DA_IMAGEM_DO_ESTADIO` no original. Para definir uma imagem, altere esse valor em `css/style.css` para uma URL válida ou para `../assets/estadio.jpg` depois de adicionar o arquivo de imagem à pasta `assets`.

Os estilos da seção visual V3 foram mantidos ativos corrigindo o fechamento ausente de um comentário CSS no arquivo de origem.

# Financial Control Lab — Frontend

Interface web do sistema de controle financeiro multi-tenant. Consome a API REST do backend para gerenciar clientes, fornecedores, produtos, estoque, lançamentos e contas pessoais. Inclui fluxos completos de autenticação (login, registro, verificação de email, alteração e recuperação de senha), páginas legais em conformidade com a LGPD e cookie consent banner.

## Stack

- **HTML5**, **CSS3** e **JavaScript** vanilla (sem frameworks)
- **CSS Variables** — design system centralizado (cores, tipografia, espaçamento, radius)
- Deploy via **Vercel** com deploy automático

## Funcionalidades

### Autenticação
- Login e cadastro com verificação de email obrigatória
- Autenticação JWT armazenada no `localStorage`
- Redirecionamento automático para login quando o token expira (401)

### Alteração de senha (usuário logado)
- Formulário na área interna com senha atual, nova senha e confirmação
- Envio de email de confirmação — a senha só é aplicada após clicar no link
- Página de confirmação (`confirmar-alteracao-senha.html`) com estados de loading, sucesso e erro

### Recuperação de senha (usuário deslogado)
- Link "Esqueci minha senha" na tela de login
- Formulário para informar email e receber link de recuperação
- Página de reset (`resetar-senha.html`) com formulário para definir nova senha
- Validação client-side: senhas coincidem, mínimo 6 caracteres

### Páginas legais (LGPD)
- Termos de Uso, Política de Privacidade e Política de Cookies
- Conteúdo em conformidade com a Lei 13.709/2018
- Links acessíveis no footer de todas as páginas de autenticação

### Cookie Consent Banner
- Auto-injetado via JavaScript puro em todas as páginas
- Opções: "Aceitar todos" ou "Apenas necessários"
- Persistência em `localStorage` com timestamp e expiração de 365 dias

### Dashboard
- Visão consolidada com cards de resumo (receitas, despesas, saldos)
- Resumo diário e navegação mensal

### Clientes
- Listagem, cadastro, edição e exclusão
- Lançamentos no modelo conta-corrente com extrato agrupado por mês

### Fornecedores
- Listagem, cadastro, edição e exclusão
- Lançamentos de compra com preço unitário por operação

### Produtos e Estoque
- Catálogo de produtos com CRUD completo
- Movimentações de estoque (entrada/saída)

### Contas Pessoais
- CRUD completo com parcelamento automático
- Navegação mensal com resumo

### Vendas
- Registro de vendas com integração automática ao estoque

## Estrutura do Projeto

```
/
├── index.html                          # Landing page
├── login.html                          # Login
├── registro.html                       # Cadastro
├── verificar.html                      # Verificação de email (token via URL)
├── esqueci-senha.html                  # Solicitar recuperação de senha
├── resetar-senha.html                  # Definir nova senha (token via URL)
├── confirmar-alteracao-senha.html      # Confirmar alteração de senha (token via URL)
├── alterar-senha.html                  # Alterar senha (área logada, com sidebar)
├── dashboard.html                      # Dashboard principal
├── clientes.html                       # Gestão de clientes
├── fornecedores.html                   # Gestão de fornecedores
├── produtos.html                       # Catálogo de produtos
├── vendas.html                         # Registro de vendas
├── pessoal.html                        # Contas pessoais
├── termos-de-uso.html                  # Termos de Uso
├── politica-de-privacidade.html        # Política de Privacidade (LGPD)
├── politica-de-cookies.html            # Política de Cookies
├── assets/
│   └── logo.svg                        # Logo do sistema
├── img/
│   └── favicon.png                     # Favicon
├── css/
│   ├── variables.css                   # Design tokens (cores, fontes, espaçamento)
│   ├── global.css                      # Reset e estilos base
│   ├── components.css                  # Buttons, inputs, cards, toasts, spinners
│   ├── layout.css                      # Sidebar, topbar, app-layout
│   ├── pages.css                       # Estilos de páginas de autenticação
│   └── legal.css                       # Estilos das páginas legais
├── js/
│   ├── api.js                          # Wrapper fetch com auth e tratamento de erros
│   ├── auth.js                         # Route guard, logout, mobile sidebar
│   ├── components.js                   # Toasts e componentes reutilizáveis
│   ├── cookie-consent.js               # Banner de consentimento de cookies
│   ├── router.js                       # Highlight do nav-item ativo na sidebar
│   ├── utils.js                        # Funções utilitárias
│   ├── dashboard.js                    # Lógica do dashboard
│   ├── clientes.js                     # CRUD de clientes
│   ├── fornecedores.js                 # CRUD de fornecedores
│   ├── produtos.js                     # CRUD de produtos
│   ├── pessoal.js                      # Contas pessoais
│   └── vendas.js                       # Vendas
```

## Design System

O design é construído sobre CSS Variables centralizadas em `variables.css`:

- **Tema** — dark theme com backgrounds hierárquicos (`#0f1117`, `#1a1d27`, `#242836`)
- **Accent** — verde-esmeralda (`#10b981`) para ações primárias e destaques
- **Tipografia** — Inter (Google Fonts), com escala de `0.75rem` a `2rem`
- **Componentes** — classes reutilizáveis (`btn`, `btn-primary`, `form-input`, `auth-card`, etc.)
- **Responsividade** — sidebar colapsável com hamburger menu em mobile

## Como Rodar Localmente

Não há build step nem dependências npm — é HTML/CSS/JS puro.

### Opção 1 — Live Server (VS Code)
1. Abra o projeto no VS Code
2. Instale a extensão **Live Server**
3. Clique com o botão direito no `index.html` → **Open with Live Server**
4. Acesse em `http://localhost:5500`

### Opção 2 — Servidor HTTP simples
```bash
# Com Python
python -m http.server 5500

# Com Node.js
npx serve -l 5500
```

### Configuração da API

A URL base da API está em `js/api.js` na constante `API_BASE`. Atualmente aponta para o backend na VPS:

```
https://controlefinanceirolab.duckdns.org
```

Para desenvolvimento local, troque para:

```
http://localhost:8080
```

> O backend precisa estar rodando e com CORS configurado para a origin do frontend.

## Deploy

Hospedado no **Vercel** com deploy automático a partir do repositório GitHub.

- **URL de Produção:** [cadin-financeiro.vercel.app](https://cadin-financeiro.vercel.app)
- **Backend:** [controlefinanceirolab.duckdns.org](https://controlefinanceirolab.duckdns.org)

### Configuração no Vercel

- **Framework Preset:** Other
- **Build Command:** nenhum
- **Output Directory:** `.` (raiz do projeto)

## Autor

**Eduardo Ciudad** — Desenvolvedor Backend Java

- GitHub: [github.com/eduardo-Ciudad](https://github.com/eduardo-Ciudad)
- LinkedIn: [linkedin.com/in/eduardociudadf](https://linkedin.com/in/eduardociudadf/)
- Instagram: [@ciudad_dev](https://instagram.com/ciudad_dev)
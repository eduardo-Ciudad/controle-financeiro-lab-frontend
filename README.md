# FinancialControl — Frontend

Interface web do sistema de controle financeiro desenvolvido para um fornecedor de tecidos. Consome a API REST do backend para gerenciar clientes, fornecedores, produtos, estoque, lançamentos e contas pessoais.

## Stack

- **HTML5**, **CSS3** e **JavaScript** vanilla (sem frameworks)
- Deploy via **Vercel**

## Funcionalidades

### Autenticação
- Tela de login com autenticação JWT
- Armazenamento do token no `localStorage`
- Redirecionamento automático para login quando o token expira

### Dashboard
- Visão consolidada com cards de resumo (receitas, despesas, saldos)
- Resumo diário

### Clientes
- Listagem, cadastro, edição e exclusão de clientes
- Visualização de lançamentos vinculados a cada cliente
- Consulta de saldo por cliente

### Fornecedores
- Listagem, cadastro, edição e exclusão de fornecedores
- Lançamentos de contas a pagar por fornecedor

### Produtos e Estoque
- Catálogo de produtos com CRUD completo
- Registro de movimentações de estoque (entrada/saída)
- Visualização de saldo de estoque por produto

### Contas Pessoais
- CRUD completo de contas pessoais
- Criação de compras parceladas (parcelamento automático via API)
- Navegação mensal com cards de resumo
- Visualização de resumo diário

### Lançamentos
- Registro de lançamentos para clientes (contas a receber)
- Registro de lançamentos para fornecedores (contas a pagar)
- Filtros e navegação por período

## Estrutura do Projeto

```
/
├── index.html              # Tela de login
├── dashboard.html          # Dashboard principal
├── clientes.html           # Gestão de clientes
├── fornecedores.html       # Gestão de fornecedores
├── produtos.html           # Catálogo de produtos
├── estoque.html            # Movimentação de estoque
├── lancamentos.html        # Lançamentos de clientes
├── lancamentos-fornecedor.html  # Lançamentos de fornecedores
├── contas-pessoais.html    # Contas pessoais e parcelamento
├── css/
│   └── style.css           # Estilos globais
├── js/
│   ├── auth.js             # Lógica de autenticação e gerenciamento de token
│   ├── api.js              # Funções de comunicação com a API (fetch + headers JWT)
│   ├── dashboard.js        # Lógica do dashboard
│   ├── clientes.js         # CRUD de clientes
│   ├── fornecedores.js     # CRUD de fornecedores
│   ├── produtos.js         # CRUD de produtos
│   ├── estoque.js          # Movimentação de estoque
│   ├── lancamentos.js      # Lançamentos de clientes
│   ├── lancamentos-fornecedor.js  # Lançamentos de fornecedores
│   └── contas-pessoais.js  # Contas pessoais e parcelamento
└── vercel.json             # Configuração de deploy no Vercel
```

> **Nota:** Os nomes dos arquivos podem variar. Confira com a estrutura real do repositório e ajuste conforme necessário.

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

# Com Node.js (npx, sem instalar nada)
npx serve -l 5500
```

### Configuração da API

O frontend se comunica com o backend via fetch. A URL base da API está configurada nos arquivos JS. Para apontar para o backend local durante o desenvolvimento, altere a URL base para:

```
http://localhost:8080
```

Para produção, a URL aponta para:

```
https://financialcontrol-api-blin.onrender.com
```

> **Importante:** O backend precisa estar rodando e com CORS configurado para a origin do frontend (`http://localhost:5500` em dev, `https://cadin-financeiro.vercel.app` em produção).

## Deploy

O frontend é hospedado no **Vercel** com deploy automático a partir do repositório GitHub.

- **URL de Produção:** [cadin-financeiro.vercel.app](https://cadin-financeiro.vercel.app)
- **Backend:** [financialcontrol-api-blin.onrender.com](https://financialcontrol-api-blin.onrender.com)

### Configuração no Vercel

- **Framework Preset:** Other
- **Build Command:** nenhum (não há build step)
- **Output Directory:** `.` (raiz do projeto)

## Comunicação com a API

Todas as requisições à API (exceto login) incluem o header de autenticação:

```javascript
headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
}
```

O token JWT é obtido no login e armazenado no `localStorage`. Quando o token expira ou é inválido, o usuário é redirecionado automaticamente para a tela de login.

## Autor

**Eduardo Ciudad**
- GitHub: [eduardo-Ciudad](https://github.com/eduardo-Ciudad)
- LinkedIn: [eduardociudadf](https://linkedin.com/in/eduardociudadf/)
- Portfolio: [eduardo-ciudad-portfolio.vercel.app](https://eduardo-ciudad-portfolio.vercel.app)
/* Produtos page — CRUD, estoque, ajustes */
(function () {
    requireAuth();

    var mainContent = document.getElementById('mainContent');

    var state = {
        listPage: 0,
        listTotalPages: 1,
        search: '',
        produtoAtual: null,
    };

    document.addEventListener('DOMContentLoaded', function () {
        renderListSection();
        loadProdutos();
        loadEstoqueValor();
    });

    /* ===========================
       LIST SECTION
    =========================== */
    function renderListSection() {
        mainContent.innerHTML =
            '<section id="listaSection">' +
            '<div class="section-header">' +
            '<h2 style="margin:0">Produtos</h2>' +
            '<div class="section-actions">' +
            '<div class="search-box">' +
            '<svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>' +
            '</svg>' +
            '<input type="search" id="searchInput" class="form-input" placeholder="Buscar produto...">' +
            '</div>' +
            '<button class="btn btn-primary" id="btnNovoProduto">+ Novo Produto</button>' +
            '</div>' +
            '</div>' +
            '<div class="dashboard-grid" id="estoqueResumoGrid" style="grid-template-columns:1fr 1fr;margin-bottom:var(--space-lg)">' +
                '<div class="stat-card"><div class="stat-label">Estoque (Custo)</div><div class="stat-value text-muted">—</div></div>' +
                '<div class="stat-card"><div class="stat-label">Estoque (Venda)</div><div class="stat-value text-muted">—</div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="table-wrapper">' +
            '<table class="table">' +
            '<thead><tr>' +
            '<th>Nome</th>' +
            '<th class="text-right">Custo</th>' +
            '<th class="text-right">Preço de Venda</th>' +
            '<th class="text-right">Estoque</th>' +
            '<th class="text-right">Valor em Estoque</th>' +
            '<th>Status</th>' +
            '</tr></thead>' +
            '<tbody id="produtosTableBody">' + skeletonRows(5) + '</tbody>' +
            '</table>' +
            '</div>' +
            '<div id="produtosPagination"></div>' +
            '</div>' +
            '</section>' +
            '<section id="detalheSection" class="hidden"></section>';

        document.getElementById('btnNovoProduto').addEventListener('click', openModalNovoProduto);
        document.getElementById('searchInput').addEventListener('input', debounce(function (e) {
            state.search = e.target.value.trim();
            state.listPage = 0;
            loadProdutos();
        }, 350));
    }

    async function loadProdutos() {
        var tbody = document.getElementById('produtosTableBody');
        if (tbody) tbody.innerHTML = skeletonRows(5);

        try {
            var params = '?page=' + state.listPage + '&size=20';
            if (state.search) params += '&nome=' + encodeURIComponent(state.search);
            var data = await api.get('/produtos' + params);

            var content = Array.isArray(data) ? data : (data.content || []);
            var totalPages = data.totalPages || 1;
            state.listTotalPages = totalPages;

            renderProdutosTable(content);
            renderPagination(
                document.getElementById('produtosPagination'),
                state.listPage, totalPages,
                function (p) { state.listPage = p; loadProdutos(); }
            );
        } catch (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erro ao carregar produtos.</td></tr>';
            handleApiError(err);
        }
    }

    function renderProdutosTable(produtos) {
        var tbody = document.getElementById('produtosTableBody');
        if (!tbody) return;
        if (!produtos.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum produto encontrado.</td></tr>';
            return;
        }
        tbody.innerHTML = produtos.map(function (p) {
            var estoque = parseFloat(p.quantidadeAtual) || 0;
            var valorEstoque = parseFloat(p.valorEmEstoque) || 0;
            var estoqueColor = estoque <= 0 ? 'text-danger' : estoque < 5 ? 'text-warning' : '';
            return '<tr class="clickable" data-id="' + p.id + '">' +
                '<td><strong>' + escapeHtml(p.nome) + '</strong>' +
                (p.descricao ? '<br><small class="text-muted">' + escapeHtml(p.descricao) + '</small>' : '') +
                '</td>' +
                '<td class="text-right font-mono">' + (p.precoCusto ? formatMoney(p.precoCusto) : '—') + '</td>' +
                '<td class="text-right font-mono">' + formatMoney(p.precoVenda || 0) + '</td>' +
                '<td class="text-right font-mono ' + estoqueColor + '">' + estoque + '</td>' +
                '<td class="text-right font-mono">' + formatMoney(valorEstoque) + '</td>' +
                '<td>' + statusBadge(p.ativo !== false) + '</td>' +
                '</tr>';
        }).join('');

        tbody.querySelectorAll('tr.clickable').forEach(function (row) {
            row.addEventListener('click', function () {
                openDetalhe(this.getAttribute('data-id'));
            });
        });
    }

    /* ===========================
       DETAIL SECTION
    =========================== */
    async function openDetalhe(id) {
        var detalhe = document.getElementById('detalheSection');
        document.getElementById('listaSection').classList.add('hidden');
        detalhe.classList.remove('hidden');
        state.produtoAtual = { id: id };

        detalhe.innerHTML = '<div class="loading-center"><span class="spinner spinner-lg"></span></div>';

        try {
            var [produto, estoque] = await Promise.all([
                api.get('/produtos/' + id),
                api.get('/produtos/' + id + '/estoque').catch(function () { return null; }),
            ]);
            renderDetalhe(produto, estoque);
        } catch (err) {
            detalhe.innerHTML = '<p class="text-danger">Erro ao carregar produto.</p>';
            handleApiError(err);
        }
    }

    function renderDetalhe(produto, estoqueData) {
        var detalhe = document.getElementById('detalheSection');
        // CORRETO
        var qtd = parseFloat(estoqueData ? estoqueData.quantidadeAtual : produto.quantidadeAtual) || 0;
        var valorVenda = parseFloat(produto.valorVendaEmEstoque) || 0;
var valorCompra = parseFloat(produto.valorCompraEmEstoque) || 0;
        var estoqueColor = qtd <= 0 ? 'text-danger' : qtd < 5 ? 'text-warning' : 'text-success';

        detalhe.innerHTML =
            '<div class="back-btn-row">' +
            '<button class="btn btn-secondary btn-sm" id="btnVoltar">← Voltar</button>' +
            '<h3>' + escapeHtml(produto.nome) + '</h3>' +
            '</div>' +

            '<div class="detail-grid">' +
            // Info card
            '<div class="card">' +
            '<div class="card-header">' +
            '<h4>Dados do Produto</h4>' +
            '<button class="btn btn-secondary btn-sm" id="btnEditar">Editar</button>' +
            '</div>' +
            '<div class="card-body">' +
            '<div class="info-grid">' +
            infoItem('Nome', produto.nome) +
            infoItem('Descrição', produto.descricao) +
            infoItem('Preço de Custo', produto.precoCusto ? formatMoney(produto.precoCusto) : '—') +
            infoItem('Preço de Venda', formatMoney(produto.precoVenda || 0)) +
            infoItem('Lucro por Unidade', produto.lucroPorUnidade ? formatMoney(produto.lucroPorUnidade) : '—') +
            infoItem('Margem de Lucro', produto.margemLucro ? parseFloat(produto.margemLucro).toFixed(1) + '%' : '—') +
            infoItem('Status', produto.ativo !== false ? 'Ativo' : 'Inativo') +
            '</div>' +
            '</div>' +
            '</div>' +

            // Estoque card
            '<div class="card estoque-card">' +
            '<div class="card-body" style="text-align:center;padding:var(--space-xl)">' +
            '<div class="stat-label">Estoque Atual</div>' +
            '<div class="saldo-value ' + estoqueColor + '">' + parseFloat(qtd) + ' un.</div>' +
            '<div class="stat-label mt-md">Valor de Venda em Estoque</div>' +
            '<div class="font-mono text-lg text-success">' + formatMoney(valorVenda) + '</div>' +
            '<div class="stat-label mt-md">Valor de Compra em Estoque</div>' +
            '<div class="font-mono text-lg">' + formatMoney(valorCompra) + '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +

            // Action bar
            '<div class="action-bar">' +
            '<button class="btn btn-primary" id="btnAjuste">Ajustar Estoque</button>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn-danger btn-sm" id="btnInativar">' +
            (produto.ativo !== false ? 'Inativar' : 'Reativar') +
            '</button>' +
            '</div>';

        document.getElementById('btnVoltar').addEventListener('click', voltarLista);
        document.getElementById('btnEditar').addEventListener('click', function () {
            openModalEditarProduto(produto);
        });
        document.getElementById('btnAjuste').addEventListener('click', function () {
            openModalAjusteEstoque(produto.id);
        });
        document.getElementById('btnInativar').addEventListener('click', function () {
            confirmDialog(
                'Tem certeza que deseja alterar o status deste produto?',
                function () { toggleAtivo(produto.id); }
            );
        });
    }

    function voltarLista() {
        document.getElementById('detalheSection').classList.add('hidden');
        document.getElementById('listaSection').classList.remove('hidden');
        state.produtoAtual = null;
        loadProdutos();
        loadEstoqueValor();
    }

    function infoItem(label, value) {
        return '<div class="info-item">' +
            '<div class="info-item-label">' + label + '</div>' +
            '<div class="info-item-value">' + escapeHtml(value || '—') + '</div>' +
            '</div>';
    }

    /* ===========================
       MODAIS CRUD
    =========================== */
    function formProdutoHtml(produto) {
        produto = produto || {};
        return '<form id="formProduto" novalidate>' +
            formGroup('nome', 'Nome *', 'text', produto.nome, 'Nome do produto') +
            formGroup('descricao', 'Descrição', 'text', produto.descricao, 'Descrição opcional') +
            formGroup('precoCusto', 'Preço de Custo', 'number', produto.precoCusto, '0.00') +
            formGroup('precoVenda', 'Preço de Venda (calculado +30%)', 'number', produto.precoVenda, '0.00') +
            '</form>';
    }

    function formGroup(id, label, type, value, placeholder) {
        var step = type === 'number' ? ' step="0.01" min="0"' : '';
        return '<div class="form-group">' +
            '<label class="form-label" for="' + id + '">' + label + '</label>' +
            '<input class="form-input" type="' + type + '" id="' + id + '" name="' + id + '"' +
            step +
            ' value="' + escapeHtml(value != null ? String(value) : '') + '"' +
            ' placeholder="' + escapeHtml(placeholder || '') + '">' +
            '<span class="form-error" id="' + id + 'Error"></span>' +
            '</div>';
    }

    function openModalNovoProduto() {
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnSalvarProduto">Salvar</button>';
        var overlay = openModal('Novo Produto', formProdutoHtml(), footer);
        bindMarkupCalc(overlay);
        overlay.querySelector('#btnSalvarProduto').addEventListener('click', function () {
            salvarProduto(null);
        });
    }

    function openModalEditarProduto(produto) {
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnSalvarProduto">Salvar</button>';
        var overlay = openModal('Editar Produto', formProdutoHtml(produto), footer);
        bindMarkupCalc(overlay);
        overlay.querySelector('#btnSalvarProduto').addEventListener('click', function () {
            salvarProduto(produto.id);
        });
    }

    function bindMarkupCalc(overlay) {
        var inputCusto = overlay.querySelector('#precoCusto');
        var inputVenda = overlay.querySelector('#precoVenda');
        if (!inputCusto || !inputVenda) return;
        inputCusto.addEventListener('input', function () {
            var custo = parseFloat(this.value);
            if (custo > 0 && !inputVenda.dataset.editadoManualmente) {
                inputVenda.value = (custo * 1.30).toFixed(2);
            }
        });
        inputVenda.addEventListener('input', function () {
            this.dataset.editadoManualmente = 'true';
        });
    }

    async function salvarProduto(id) {
        clearFormErrors(document.getElementById('activeModal'));
        var btn = document.querySelector('#activeModal #btnSalvarProduto');
        setButtonLoading(btn, true);

        var precoCustoRaw = document.getElementById('precoCusto').value;
        var body = {
            nome: document.getElementById('nome').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            precoCusto: precoCustoRaw ? parseFloat(precoCustoRaw) : null,
            precoVenda: parseFloat(document.getElementById('precoVenda').value),
        };

        try {
            if (id) {
                await api.put('/produtos/' + id, body);
                showToast('Produto atualizado com sucesso.', 'success');
            } else {
                await api.post('/produtos', body);
                showToast('Produto cadastrado com sucesso.', 'success');
            }
            closeModal();
            if (id) {
                openDetalhe(id);
            } else {
                loadProdutos();
            }
        } catch (err) {
            setButtonLoading(btn, false);
            handleApiError(err);
        }
    }

    async function toggleAtivo(id) {
        try {
            await api.delete('/produtos/' + id);
            showToast('Status do produto alterado.', 'success');
            voltarLista();
        } catch (err) {
            handleApiError(err);
        }
    }

    /* ===========================
       AJUSTE DE ESTOQUE
    =========================== */
    function openModalAjusteEstoque(produtoId) {
        var body =
            '<form id="formAjuste" novalidate>' +
            '<div class="form-group">' +
            '<label class="form-label">Tipo *</label>' +
            '<select class="form-select" id="tipoAjuste">' +
            '<option value="ENTRADA">Entrada (adicionar)</option>' +
            '<option value="SAIDA">Saída (remover)</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Quantidade *</label>' +
            '<input class="form-input" type="number" id="quantidadeAjuste" min="1" step="1" placeholder="0">' +
            '<span class="form-error" id="quantidadeAjusteError"></span>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Motivo</label>' +
            '<input class="form-input" type="text" id="motivoAjuste" placeholder="Opcional">' +
            '</div>' +
            '</form>';

        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnConfirmarAjuste">Confirmar Ajuste</button>';
        var overlay = openModal('Ajustar Estoque', body, footer);
        overlay.querySelector('#btnConfirmarAjuste').addEventListener('click', function () {
            confirmarAjuste(produtoId, overlay);
        });
    }

    async function confirmarAjuste(produtoId, overlay) {
        clearFormErrors(overlay);
        var btn = overlay.querySelector('#btnConfirmarAjuste');
        setButtonLoading(btn, true);

        var body = {
            tipo: overlay.querySelector('#tipoAjuste').value,
            quantidade: parseFloat(overlay.querySelector('#quantidadeAjuste').value),
            motivo: overlay.querySelector('#motivoAjuste').value.trim(),
        };

        if (!body.quantidade || body.quantidade < 1) {
            showToast('Informe uma quantidade válida.', 'warning');
            setButtonLoading(btn, false);
            return;
        }

        try {
            await api.post('/produtos/' + produtoId + '/estoque/ajustes', body);
            showToast('Estoque ajustado com sucesso.', 'success');
            closeModal();
            openDetalhe(produtoId);
        } catch (err) {
            setButtonLoading(btn, false);
            handleApiError(err);
        }
    }

    /* ===========================
       ESTOQUE — VALOR TOTAL
    =========================== */
    async function loadEstoqueValor() {
        var grid = document.getElementById('estoqueResumoGrid');
        if (!grid) return;
        try {
            var data = await api.get('/produtos/estoque/valor-total');
            grid.innerHTML =
                '<div class="stat-card">' +
                    '<div class="stat-label">Estoque (Custo)</div>' +
                    '<div class="stat-value">' + formatMoney(data.totalCusto || 0) + '</div>' +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-label">Estoque (Venda)</div>' +
                    '<div class="stat-value text-success">' + formatMoney(data.totalVenda || 0) + '</div>' +
                '</div>';
        } catch (err) {
            console.error('Erro ao carregar valor do estoque:', err);
        }
    }

    /* ===========================
       HELPERS
    =========================== */
    function debounce(fn, delay) {
        var timer;
        return function () {
            clearTimeout(timer);
            var args = arguments, ctx = this;
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }
})();

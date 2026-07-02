/* Fornecedores page — CRUD, saldo, extrato, compras, pagamentos, estorno */
(function () {
    requireAuth();

    var mainContent = document.getElementById('mainContent');

    var state = {
        listPage: 0,
        listTotalPages: 1,
        search: '',
        fornecedorAtual: null,
        extratoPage: 0,
        extratoTotalPages: 1,
        produtos: [],
    };

    document.addEventListener('DOMContentLoaded', function () {
        renderListSection();
        loadFornecedores();
    });

    /* ===========================
       LIST SECTION
    =========================== */
    function renderListSection() {
        mainContent.innerHTML =
            '<section id="listaSection">' +
            '<div class="section-header">' +
            '<h2 style="margin:0">Fornecedores</h2>' +
            '<div class="section-actions">' +
            '<div class="search-box">' +
            '<svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>' +
            '</svg>' +
            '<input type="search" id="searchInput" class="form-input" placeholder="Buscar fornecedor...">' +
            '</div>' +
            '<button class="btn btn-primary" id="btnNovoFornecedor">+ Novo Fornecedor</button>' +
            '</div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="table-wrapper">' +
            '<table class="table">' +
            '<thead><tr>' +
            '<th>Nome</th>' +
            '<th>Documento</th>' +
            '<th>Telefone</th>' +
            '<th>Status</th>' +
            '<th class="text-right">Saldo</th>' +
            '</tr></thead>' +
            '<tbody id="fornecedoresTableBody">' + skeletonRows(4) + '</tbody>' +
            '</table>' +
            '</div>' +
            '<div id="fornecedoresPagination"></div>' +
            '</div>' +
            '</section>' +
            '<section id="detalheSection" class="hidden"></section>';

        document.getElementById('btnNovoFornecedor').addEventListener('click', openModalNovoFornecedor);
        document.getElementById('searchInput').addEventListener('input', debounce(function (e) {
            state.search = e.target.value.trim();
            state.listPage = 0;
            loadFornecedores();
        }, 350));
    }

    async function loadFornecedores() {
        var tbody = document.getElementById('fornecedoresTableBody');
        if (tbody) tbody.innerHTML = skeletonRows(4);

        try {
            var params = '?page=' + state.listPage + '&size=20';
            if (state.search) params += '&nome=' + encodeURIComponent(state.search);
            var data = await api.get('/fornecedores' + params);

            var content = Array.isArray(data) ? data : (data.content || []);
            state.listTotalPages = data.totalPages || 1;

            renderFornecedoresTable(content);
            renderPagination(
                document.getElementById('fornecedoresPagination'),
                state.listPage, state.listTotalPages,
                function (p) { state.listPage = p; loadFornecedores(); }
            );
        } catch (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Erro ao carregar fornecedores.</td></tr>';
            handleApiError(err);
        }
    }

    function renderFornecedoresTable(fornecedores) {
    var tbody = document.getElementById('fornecedoresTableBody');
    if (!tbody) return;
    if (!fornecedores.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum fornecedor encontrado.</td></tr>';
        return;
    }
    tbody.innerHTML = fornecedores.map(function (f) {
        return '<tr class="clickable" data-id="' + f.id + '">' +
            '<td><strong>' + escapeHtml(f.nome) + '</strong></td>' +
            '<td>' + escapeHtml(f.documento || '—') + '</td>' +
            '<td>' + escapeHtml(f.telefone || '—') + '</td>' +
            '<td>' + statusBadge(f.ativo !== false) + '</td>' +
            '<td class="text-right font-mono saldo-cell" data-fornecedor-id="' + f.id + '">' +
                '<span class="text-muted">…</span>' +
            '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('tr.clickable').forEach(function (row) {
        row.addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var nome = this.querySelector('td strong').textContent;
            openDetalhe(id, nome);
        });
    });

    fornecedores.forEach(function (f) {
        api.get('/fornecedores/' + f.id + '/saldo').then(function (saldo) {
            var cell = tbody.querySelector('.saldo-cell[data-fornecedor-id="' + f.id + '"]');
            if (!cell) return;
            var valor = saldo ? saldo.saldo : 0;
            var situacao = saldo ? saldo.situacao : 'QUITADO';

            if (situacao === 'DEVEDOR') {
                cell.innerHTML = '<span class="text-danger">' + formatMoney(valor) + '</span>';
            } else if (situacao === 'CREDOR') {
                cell.innerHTML = '<span class="text-info">' + formatMoney(valor) + '</span>';
            } else {
                cell.innerHTML = '<span class="text-success">Quitado</span>';
            }
        }).catch(function () {
            var cell = tbody.querySelector('.saldo-cell[data-fornecedor-id="' + f.id + '"]');
            if (cell) cell.innerHTML = '<span class="text-muted">—</span>';
        });
    });
}

    /* ===========================
       DETAIL SECTION
    =========================== */
    async function openDetalhe(id, nome) {
        var detalhe = document.getElementById('detalheSection');
        document.getElementById('listaSection').classList.add('hidden');
        detalhe.classList.remove('hidden');

        state.fornecedorAtual = { id: id, nome: nome };
        state.extratoPage = 0;

        detalhe.innerHTML = '<div class="loading-center"><span class="spinner spinner-lg"></span></div>';

        try {
            var [fornecedor, saldo] = await Promise.all([
                api.get('/fornecedores/' + id),
                api.get('/fornecedores/' + id + '/saldo'),
            ]);
            renderDetalhe(fornecedor, saldo);
            loadExtrato();
        } catch (err) {
            detalhe.innerHTML = '<p class="text-danger">Erro ao carregar fornecedor.</p>';
            handleApiError(err);
        }
    }

    function renderDetalhe(fornecedor, saldo) {
        var detalhe = document.getElementById('detalheSection');
        var situacao = saldo ? saldo.situacao : 'QUITADO';
        var valorSaldo = saldo ? saldo.saldo : 0;
        var saldoClass = situacao === 'DEVEDOR' ? 'devedor' : situacao === 'CREDOR' ? 'credor' : 'quitado';
        var saldoColor = situacao === 'DEVEDOR' ? 'text-danger' : situacao === 'CREDOR' ? 'text-info' : 'text-success';
        var saldoLabel = situacao === 'DEVEDOR' ? 'A Pagar' : situacao === 'CREDOR' ? 'Crédito com Fornecedor' : 'Quitado';

        detalhe.innerHTML =
            '<div class="back-btn-row">' +
            '<button class="btn btn-secondary btn-sm" id="btnVoltar">← Voltar</button>' +
            '<h3>' + escapeHtml(fornecedor.nome) + '</h3>' +
            '</div>' +

            '<div class="detail-grid">' +
            '<div class="card">' +
            '<div class="card-header">' +
            '<h4>Dados Cadastrais</h4>' +
            '<button class="btn btn-secondary btn-sm" id="btnEditar">Editar</button>' +
            '</div>' +
            '<div class="card-body">' +
            '<div class="info-grid">' +
            infoItem('Nome', fornecedor.nome) +
            infoItem('Documento', fornecedor.documento) +
            infoItem('Telefone', fornecedor.telefone) +
            infoItem('E-mail', fornecedor.email) +
            infoItem('Endereço', fornecedor.endereco) +
            infoItem('Cadastrado em', formatDate(fornecedor.criadoEm || fornecedor.dataCadastro)) +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div class="card saldo-card ' + saldoClass + '">' +
            '<div class="card-body" style="text-align:center;padding:var(--space-xl)">' +
            '<div class="stat-label">' + saldoLabel + '</div>' +
            '<div class="saldo-value ' + saldoColor + '">' + formatMoney(valorSaldo) + '</div>' +
            '<div style="margin-top:var(--space-md)">' + situacaoBadge(situacao) + '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div class="action-bar">' +
            '<button class="btn btn-primary" id="btnCompra">Registrar Compra</button>' +
            '<button class="btn btn-secondary" id="btnPagamento">Registrar Pagamento</button>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn-danger btn-sm" id="btnInativar">' +
            (fornecedor.ativo !== false ? 'Inativar' : 'Reativar') +
            '</button>' +
            '</div>' +

            '<div class="card">' +
            '<div class="card-header"><h4>Extrato</h4></div>' +
            '<div class="table-wrapper">' +
            '<table class="table">' +
            '<thead><tr>' +
            '<th>Data</th>' +
            '<th>Categoria</th>' +
            '<th>Descrição</th>' +
            '<th class="text-right">Valor</th>' +
            '<th class="text-right">Saldo</th>' +
            '<th></th>' +
            '</tr></thead>' +
            '<tbody id="extratoTableBody">' + skeletonRows(6) + '</tbody>' +
            '</table>' +
            '</div>' +
            '<div id="extratoPagination"></div>' +
            '</div>';

        document.getElementById('btnVoltar').addEventListener('click', voltarLista);
        document.getElementById('btnEditar').addEventListener('click', function () {
            openModalEditarFornecedor(fornecedor);
        });
        document.getElementById('btnCompra').addEventListener('click', function () {
            openModalCompra(state.fornecedorAtual.id);
        });
        document.getElementById('btnPagamento').addEventListener('click', function () {
            openModalPagamento(state.fornecedorAtual.id);
        });
        document.getElementById('btnInativar').addEventListener('click', function () {
            confirmDialog(
                'Tem certeza que deseja alterar o status deste fornecedor?',
                function () { toggleAtivo(state.fornecedorAtual.id); }
            );
        });
    }

    function voltarLista() {
        document.getElementById('detalheSection').classList.add('hidden');
        document.getElementById('listaSection').classList.remove('hidden');
        state.fornecedorAtual = null;
        loadFornecedores();
    }

    function infoItem(label, value) {
        return '<div class="info-item">' +
            '<div class="info-item-label">' + label + '</div>' +
            '<div class="info-item-value">' + escapeHtml(value || '—') + '</div>' +
            '</div>';
    }

    /* ===========================
       EXTRATO
    =========================== */
    async function loadExtrato() {
        var tbody = document.getElementById('extratoTableBody');
        if (tbody) tbody.innerHTML = skeletonRows(6);

        try {
            var data = await api.get(
                '/fornecedores/' + state.fornecedorAtual.id +
                '/extrato?page=' + state.extratoPage + '&size=15'
            );
            var items = Array.isArray(data) ? data : (data.content || []);
            state.extratoTotalPages = data.totalPages || 1;

            renderExtrato(items);
            renderPagination(
                document.getElementById('extratoPagination'),
                state.extratoPage, state.extratoTotalPages,
                function (p) { state.extratoPage = p; loadExtrato(); }
            );
        } catch (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erro ao carregar extrato.</td></tr>';
            handleApiError(err);
        }
    }

    function renderExtrato(items) {
        var tbody = document.getElementById('extratoTableBody');
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum lançamento encontrado.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(function (item) {
            var valorColor = item.categoria === 'PAGAMENTO' ? 'text-success' : 'text-danger';
            var valorPrefix = item.categoria === 'PAGAMENTO' ? '-' : '+';
            var valorAbs = Math.abs(item.valor || 0);
            var saldoColor = (item.saldoAcumulado || 0) >= 0 ? 'text-danger' : 'text-success';
            var isEstornado = item.estornado || item.categoria === 'ESTORNO';

            return '<tr' + (isEstornado ? ' style="opacity:0.5"' : '') + '>' +
                '<td class="text-mono text-sm">' + formatDate(item.data || item.dataCompetencia) + '</td>' +
                '<td>' + categoriaBadge(item.categoria) + '</td>' +
                '<td class="text-secondary">' + escapeHtml(item.descricao || '—') + '</td>' +
                '<td class="text-right font-mono ' + valorColor + '">' + valorPrefix + formatMoney(valorAbs) + '</td>' +
                '<td class="text-right font-mono ' + saldoColor + '">' + formatMoney(item.saldoAcumulado || 0) + '</td>' +
                '<td class="text-right">' +
                (!isEstornado && item.id
                    ? '<button class="btn btn-ghost btn-sm" data-id="' + item.id + '" title="Estornar">↩ Estornar</button>'
                    : '') +
                '</td>' +
                '</tr>';
        }).join('');

        tbody.querySelectorAll('[data-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                confirmDialog(
                    'Tem certeza que deseja estornar este lançamento? Esta ação não pode ser desfeita.',
                    function () { estornar(id); },
                    'Estornar lançamento'
                );
            });
        });
    }

    async function estornar(lancamentoId) {
        try {
            await api.post('/lancamentos-fornecedor/' + lancamentoId + '/estornos', {});
            showToast('Lançamento estornado com sucesso.', 'success');
            loadExtrato();
            reloadSaldo();
        } catch (err) {
            handleApiError(err);
        }
    }

    async function reloadSaldo() {
        if (!state.fornecedorAtual) return;
        try {
            var saldo = await api.get('/fornecedores/' + state.fornecedorAtual.id + '/saldo');
            var situacao = saldo ? saldo.situacao : 'QUITADO';
            var valor = saldo ? saldo.saldo : 0;
            var saldoClass = situacao === 'DEVEDOR' ? 'devedor' : situacao === 'CREDOR' ? 'credor' : 'quitado';
            var saldoColor = situacao === 'DEVEDOR' ? 'text-danger' : situacao === 'CREDOR' ? 'text-info' : 'text-success';
            var saldoLabel = situacao === 'DEVEDOR' ? 'A Pagar' : situacao === 'CREDOR' ? 'Crédito com Fornecedor' : 'Quitado';

            var card = document.querySelector('.saldo-card');
            if (card) {
                card.className = 'card saldo-card ' + saldoClass;
                card.innerHTML =
                    '<div class="card-body" style="text-align:center;padding:var(--space-xl)">' +
                    '<div class="stat-label">' + saldoLabel + '</div>' +
                    '<div class="saldo-value ' + saldoColor + '">' + formatMoney(valor) + '</div>' +
                    '<div style="margin-top:var(--space-md)">' + situacaoBadge(situacao) + '</div>' +
                    '</div>';
            }
        } catch (_) { }
    }

    /* ===========================
       MODAIS CRUD
    =========================== */
    function formFornecedorHtml(f) {
        f = f || {};
        return '<form id="formFornecedor" novalidate>' +
            fg('nome', 'Nome *', 'text', f.nome, 'Razão social') +
            fg('documento', 'CPF / CNPJ', 'text', f.documento, '00.000.000/0000-00') +
            fg('telefone', 'Telefone', 'tel', f.telefone, '(11) 3333-4444') +
            fg('email', 'E-mail', 'email', f.email, 'contato@empresa.com') +
            fg('endereco', 'Endereço', 'text', f.endereco, 'Rua Exemplo, 456') +
            '</form>';
    }

    function fg(id, label, type, value, placeholder) {
        return '<div class="form-group">' +
            '<label class="form-label" for="' + id + '">' + label + '</label>' +
            '<input class="form-input" type="' + type + '" id="' + id + '" name="' + id + '"' +
            ' value="' + escapeHtml(value || '') + '"' +
            ' placeholder="' + escapeHtml(placeholder || '') + '">' +
            '<span class="form-error" id="' + id + 'Error"></span>' +
            '</div>';
    }

    function openModalNovoFornecedor() {
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnSalvar">Salvar</button>';
        var overlay = openModal('Novo Fornecedor', formFornecedorHtml(), footer);
        overlay.querySelector('#btnSalvar').addEventListener('click', function () {
            salvarFornecedor(null);
        });
    }

    function openModalEditarFornecedor(f) {
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnSalvar">Salvar</button>';
        var overlay = openModal('Editar Fornecedor', formFornecedorHtml(f), footer);
        overlay.querySelector('#btnSalvar').addEventListener('click', function () {
            salvarFornecedor(f.id);
        });
    }

    async function salvarFornecedor(id) {
        clearFormErrors(document.getElementById('activeModal'));
        var btn = document.querySelector('#activeModal #btnSalvar');
        setButtonLoading(btn, true);

        var body = {
            nome: document.getElementById('nome').value.trim(),
            documento: document.getElementById('documento').value.trim(),
            telefone: document.getElementById('telefone').value.trim(),
            email: document.getElementById('email').value.trim(),
            endereco: document.getElementById('endereco').value.trim(),
        };

        try {
            if (id) {
                await api.put('/fornecedores/' + id, body);
                showToast('Fornecedor atualizado.', 'success');
            } else {
                await api.post('/fornecedores', body);
                showToast('Fornecedor cadastrado.', 'success');
            }
            closeModal();
            id ? openDetalhe(id, body.nome) : loadFornecedores();
        } catch (err) {
            setButtonLoading(btn, false);
            handleApiError(err);
        }
    }

    async function toggleAtivo(id) {
        try {
            await api.delete('/fornecedores/' + id);
            showToast('Status do fornecedor alterado.', 'success');
            voltarLista();
        } catch (err) {
            handleApiError(err);
        }
    }

    /* ===========================
       MODAL COMPRA (com custoUnitario)
    =========================== */
    async function openModalCompra(fornecedorId) {
        if (!state.produtos.length) {
            try {
                var res = await api.get('/produtos?size=200&ativo=true');
                state.produtos = Array.isArray(res) ? res : (res.content || []);
            } catch (_) { }
        }

        var body =
            '<form id="formCompra" novalidate>' +
            '<div class="form-group">' +
            '<label class="form-label">Data de Competência *</label>' +
            '<input class="form-input" type="date" id="dataCompetencia" value="' + todayISO() + '">' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Descrição</label>' +
            '<input class="form-input" type="text" id="descricao" placeholder="Opcional">' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Itens *</label>' +
            '<div class="item-list" id="itemList"></div>' +
            '<button type="button" class="btn btn-secondary btn-sm mt-sm" id="btnAdicionarItem">+ Adicionar Item</button>' +
            '</div>' +
            '<div class="compra-total" id="compraTotal">Total: <span>R$ 0,00</span></div>' +
            '</form>';

        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnConfirmarCompra">Confirmar Compra</button>';
        var overlay = openModal('Registrar Compra (Fornecedor)', body, footer, 'modal-lg');

        addItemRow(overlay);
        overlay.querySelector('#btnAdicionarItem').addEventListener('click', function () {
            addItemRow(overlay);
        });
        overlay.querySelector('#btnConfirmarCompra').addEventListener('click', function () {
            salvarCompra(fornecedorId, overlay);
        });
    }

    function addItemRow(overlay) {
        var list = overlay.querySelector('#itemList');
        var idx = list.children.length;
        var prodOptions = state.produtos.map(function (p) {
            return '<option value="' + p.id + '" data-preco="' + (p.precoCusto || p.precoVenda) + '">' +
                escapeHtml(p.nome) + '</option>';
        }).join('');

        var row = document.createElement('div');
        row.className = 'item-row';
        row.style.gridTemplateColumns = '1fr 80px 120px auto auto';
        row.innerHTML =
            '<div class="form-group" style="margin:0">' +
            '<select class="form-select item-produto">' +
            '<option value="">Produto...</option>' + prodOptions +
            '</select>' +
            '</div>' +
            '<div class="form-group" style="margin:0">' +
            '<input class="form-input item-qtd" type="number" min="1" value="1" placeholder="Qtd">' +
            '</div>' +
            '<div class="form-group" style="margin:0">' +
            '<input class="form-input item-custo font-mono" type="number" min="0" step="0.01" placeholder="Custo unit.">' +
            '</div>' +
            '<div class="item-total" id="itemTotal' + idx + '">R$ 0,00</div>' +
            '<button type="button" class="btn btn-ghost btn-icon item-remove" title="Remover">✕</button>';

        var calc = function () { updateItemTotal(row); updateCompraTotal(overlay); };
        row.querySelector('.item-produto').addEventListener('change', function () {
            var opt = this.options[this.selectedIndex];
            var preco = opt ? parseFloat(opt.getAttribute('data-preco') || 0) : 0;
            row.querySelector('.item-custo').value = preco.toFixed(2);
            calc();
        });
        row.querySelector('.item-qtd').addEventListener('input', calc);
        row.querySelector('.item-custo').addEventListener('input', calc);
        row.querySelector('.item-remove').addEventListener('click', function () {
            row.remove();
            updateCompraTotal(overlay);
        });

        list.appendChild(row);
    }

    function updateItemTotal(row) {
        var custo = parseFloat(row.querySelector('.item-custo').value) || 0;
        var qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
        row.querySelector('.item-total').textContent = formatMoney(custo * qtd);
    }

    function updateCompraTotal(overlay) {
        var total = 0;
        overlay.querySelectorAll('.item-row').forEach(function (row) {
            var custo = parseFloat(row.querySelector('.item-custo').value) || 0;
            var qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
            total += custo * qtd;
        });
        var span = overlay.querySelector('#compraTotal span');
        if (span) span.textContent = formatMoney(total);
    }

    async function salvarCompra(fornecedorId, overlay) {
        clearFormErrors(overlay);
        var btn = overlay.querySelector('#btnConfirmarCompra');
        setButtonLoading(btn, true);

        var itens = [];
        var valid = true;
        overlay.querySelectorAll('.item-row').forEach(function (row) {
            var produtoId = row.querySelector('.item-produto').value;
            var quantidade = parseFloat(row.querySelector('.item-qtd').value);
            var custoUnitario = parseFloat(row.querySelector('.item-custo').value);
            if (!produtoId || !quantidade || quantidade < 1) { valid = false; return; }
            itens.push({ produtoId: produtoId, quantidade: quantidade, custoUnitario: custoUnitario || 0 });
        });

        if (!itens.length || !valid) {
            showToast('Adicione ao menos um item válido.', 'warning');
            setButtonLoading(btn, false);
            return;
        }

        var body = {
            itens: itens,
            dataCompetencia: overlay.querySelector('#dataCompetencia').value,
            descricao: overlay.querySelector('#descricao').value.trim(),
        };

        try {
            await api.post('/fornecedores/' + fornecedorId + '/compras', body);
            showToast('Compra registrada com sucesso.', 'success');
            closeModal();
            loadExtrato();
            reloadSaldo();
        } catch (err) {
            setButtonLoading(btn, false);
            handleApiError(err);
        }
    }

    /* ===========================
       MODAL PAGAMENTO
    =========================== */
    function openModalPagamento(fornecedorId) {
        var body =
            '<form id="formPagamento" novalidate>' +
            '<div class="form-group">' +
            '<label class="form-label">Valor *</label>' +
            '<input class="form-input font-mono" type="number" id="valor" min="0.01" step="0.01" placeholder="0,00">' +
            '<span class="form-error" id="valorError"></span>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Data *</label>' +
            '<input class="form-input" type="date" id="data" value="' + todayISO() + '">' +
            '<span class="form-error" id="dataError"></span>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Forma de Pagamento</label>' +
            '<select class="form-select" id="formaPagamento">' +
            '<option value="DINHEIRO">Dinheiro</option>' +
            '<option value="PIX">PIX</option>' +
            '<option value="CARTAO_DEBITO">Cartão de Débito</option>' +
            '<option value="CARTAO_CREDITO">Cartão de Crédito</option>' +
            '<option value="TRANSFERENCIA">Transferência</option>' +
            '<option value="BOLETO">Boleto</option>' +
            '<option value="CHEQUE">Cheque</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Descrição</label>' +
            '<input class="form-input" type="text" id="descricaoPag" placeholder="Opcional">' +
            '</div>' +
            '</form>';

        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnConfirmarPagamento">Confirmar Pagamento</button>';
        var overlay = openModal('Registrar Pagamento', body, footer);
        overlay.querySelector('#btnConfirmarPagamento').addEventListener('click', function () {
            salvarPagamento(fornecedorId, overlay);
        });
    }

    async function salvarPagamento(fornecedorId, overlay) {
        clearFormErrors(overlay);
        var btn = overlay.querySelector('#btnConfirmarPagamento');
        setButtonLoading(btn, true);

        var body = {
            valor: parseFloat(overlay.querySelector('#valor').value),
            data: overlay.querySelector('#data').value,
            formaPagamento: overlay.querySelector('#formaPagamento').value,
            descricao: overlay.querySelector('#descricaoPag').value.trim(),
        };

        if (!body.valor || body.valor <= 0) {
            showToast('Informe um valor válido.', 'warning');
            setButtonLoading(btn, false);
            return;
        }

        try {
            await api.post('/fornecedores/' + fornecedorId + '/pagamentos', body);
            showToast('Pagamento registrado com sucesso.', 'success');
            closeModal();
            loadExtrato();
            reloadSaldo();
        } catch (err) {
            setButtonLoading(btn, false);
            handleApiError(err);
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

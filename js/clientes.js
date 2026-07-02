/* Clientes page — CRUD, saldo, extrato, compras, pagamentos, estorno */
(function () {
    requireAuth();

    var mainContent = document.getElementById('mainContent');

    // State
    var state = {
        listPage: 0,
        listTotalPages: 1,
        search: '',
        clienteAtual: null,
        extratoPage: 0,
        extratoTotalPages: 1,
        produtos: [],
    };

    /* ===========================
       INIT
    =========================== */
    document.addEventListener('DOMContentLoaded', function () {
        renderListSection();
        loadClientes();
    });

    /* ===========================
       LIST SECTION
    =========================== */
    function renderListSection() {
        mainContent.innerHTML =
            '<section id="listaSection">' +
            '<div class="section-header">' +
            '<h2 style="margin:0">Clientes</h2>' +
            '<div class="section-actions">' +
            '<div class="search-box">' +
            '<svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>' +
            '</svg>' +
            '<input type="search" id="searchInput" class="form-input" placeholder="Buscar cliente...">' +
            '</div>' +
            '<button class="btn btn-primary" id="btnNovoCliente">+ Novo Cliente</button>' +
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
            '<tbody id="clientesTableBody">' +
            skeletonRows(4) +
            '</tbody>' +
            '</table>' +
            '</div>' +
            '<div id="clientesPagination"></div>' +
            '</div>' +
            '</section>' +
            '<section id="detalheSection" class="hidden"></section>';

        document.getElementById('btnNovoCliente').addEventListener('click', openModalNovoCliente);
        document.getElementById('searchInput').addEventListener('input', debounce(function (e) {
            state.search = e.target.value.trim();
            state.listPage = 0;
            loadClientes();
        }, 350));
    }

    async function loadClientes() {
        var tbody = document.getElementById('clientesTableBody');
        if (tbody) tbody.innerHTML = skeletonRows(4);

        try {
            var params = '?page=' + state.listPage + '&size=20';
            if (state.search) params += '&nome=' + encodeURIComponent(state.search);
            var data = await api.get('/clientes' + params);

            var content = Array.isArray(data) ? data : (data.content || []);
            var totalPages = data.totalPages || 1;
            state.listTotalPages = totalPages;

            renderClientesTable(content);
            renderPagination(
                document.getElementById('clientesPagination'),
                state.listPage, totalPages,
                function (p) { state.listPage = p; loadClientes(); }
            );
        } catch (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Erro ao carregar clientes.</td></tr>';
            handleApiError(err);
        }
    }

    function renderClientesTable(clientes) {
    var tbody = document.getElementById('clientesTableBody');
    if (!tbody) return;
    if (!clientes.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum cliente encontrado.</td></tr>';
        return;
    }
    tbody.innerHTML = clientes.map(function (c) {
        return '<tr class="clickable" data-id="' + c.id + '">' +
            '<td><strong>' + escapeHtml(c.nome) + '</strong></td>' +
            '<td>' + escapeHtml(c.documento || '—') + '</td>' +
            '<td>' + escapeHtml(c.telefone || '—') + '</td>' +
            '<td>' + statusBadge(c.ativo !== false) + '</td>' +
            '<td class="text-right font-mono saldo-cell" data-cliente-id="' + c.id + '">' +
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

    // Carrega saldo de cada cliente
    clientes.forEach(function (c) {
        api.get('/clientes/' + c.id + '/saldo').then(function (saldo) {
            var cell = tbody.querySelector('.saldo-cell[data-cliente-id="' + c.id + '"]');
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
            var cell = tbody.querySelector('.saldo-cell[data-cliente-id="' + c.id + '"]');
            if (cell) cell.innerHTML = '<span class="text-muted">—</span>';
        });
    });
}

    /* ===========================
       DETAIL SECTION
    =========================== */
    async function openDetalhe(id, nome) {
        var detalhe = document.getElementById('detalheSection');
        var lista = document.getElementById('listaSection');
        lista.classList.add('hidden');
        detalhe.classList.remove('hidden');

        state.clienteAtual = { id: id, nome: nome };
        state.extratoPage = 0;

        detalhe.innerHTML = '<div class="loading-center"><span class="spinner spinner-lg"></span></div>';

        try {
            var [cliente, saldo] = await Promise.all([
                api.get('/clientes/' + id),
                api.get('/clientes/' + id + '/saldo'),
            ]);
            renderDetalhe(cliente, saldo);
            loadExtrato();
        } catch (err) {
            detalhe.innerHTML = '<p class="text-danger">Erro ao carregar cliente.</p>';
            handleApiError(err);
        }
    }

    function renderDetalhe(cliente, saldo) {
        var detalhe = document.getElementById('detalheSection');
        var situacao = saldo ? saldo.situacao : 'QUITADO';
        var valorSaldo = saldo ? saldo.saldo : 0;
        var saldoClass = situacao === 'DEVEDOR' ? 'devedor' : situacao === 'CREDOR' ? 'credor' : 'quitado';
        var saldoColor = situacao === 'DEVEDOR' ? 'text-danger' : situacao === 'CREDOR' ? 'text-info' : 'text-success';

        detalhe.innerHTML =
            '<div class="back-btn-row">' +
            '<button class="btn btn-secondary btn-sm" id="btnVoltar">← Voltar</button>' +
            '<h3>' + escapeHtml(cliente.nome) + '</h3>' +
            '</div>' +

            '<div class="detail-grid">' +
            // Info card
            '<div class="card">' +
            '<div class="card-header">' +
            '<h4>Dados Cadastrais</h4>' +
            '<button class="btn btn-secondary btn-sm" id="btnEditar">Editar</button>' +
            '</div>' +
            '<div class="card-body">' +
            '<div class="info-grid">' +
            infoItem('Nome', cliente.nome) +
            infoItem('Documento', cliente.documento) +
            infoItem('Telefone', cliente.telefone) +
            infoItem('E-mail', cliente.email) +
            infoItem('Endereço', cliente.endereco) +
            infoItem('Cadastrado em', formatDate(cliente.criadoEm || cliente.dataCadastro)) +
            '</div>' +
            '</div>' +
            '</div>' +

            // Saldo card
            '<div class="card saldo-card ' + saldoClass + '">' +
            '<div class="card-body" style="text-align:center;padding:var(--space-xl)">' +
            '<div class="stat-label">Saldo</div>' +
            '<div class="saldo-value ' + saldoColor + '">' + formatMoney(valorSaldo) + '</div>' +
            '<div style="margin-top:var(--space-md)">' + situacaoBadge(situacao) + '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +

            // Action bar
            '<div class="action-bar">' +
            '<button class="btn btn-primary" id="btnCompra">Registrar Compra</button>' +
            '<button class="btn btn-secondary" id="btnPagamento">Registrar Pagamento</button>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn-danger btn-sm" id="btnInativar">' +
            (cliente.ativo !== false ? 'Inativar' : 'Reativar') +
            '</button>' +
            '</div>' +

            // Extrato
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

        // Event bindings
        document.getElementById('btnVoltar').addEventListener('click', voltarLista);
        document.getElementById('btnEditar').addEventListener('click', function () {
            openModalEditarCliente(cliente);
        });
        document.getElementById('btnCompra').addEventListener('click', function () {
            openModalCompra(state.clienteAtual.id);
        });
        document.getElementById('btnPagamento').addEventListener('click', function () {
            openModalPagamento(state.clienteAtual.id);
        });
        document.getElementById('btnInativar').addEventListener('click', function () {
            var ativo = cliente.ativo !== false;
            var msg = ativo
                ? 'Tem certeza que deseja inativar este cliente? Esta ação pode ser revertida.'
                : 'Deseja reativar este cliente?';
            confirmDialog(msg, function () { toggleAtivo(state.clienteAtual.id); });
        });
    }

    function voltarLista() {
        document.getElementById('detalheSection').classList.add('hidden');
        document.getElementById('listaSection').classList.remove('hidden');
        state.clienteAtual = null;
        loadClientes();
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
                '/clientes/' + state.clienteAtual.id +
                '/extrato?page=' + state.extratoPage + '&size=15'
            );
            var items = Array.isArray(data) ? data : (data.content || []);
            var totalPages = data.totalPages || 1;
            state.extratoTotalPages = totalPages;

            renderExtrato(items);
            renderPagination(
                document.getElementById('extratoPagination'),
                state.extratoPage, totalPages,
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

        // Ordena do mais recente pro mais antigo
        items.sort(function (a, b) {
            var da = new Date(a.data || a.dataCompetencia);
            var db = new Date(b.data || b.dataCompetencia);
            return db - da;
        });

        // Agrupa por mês
        var meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        var mesAtual = '';

        tbody.innerHTML = items.map(function (item) {
            var dataStr = item.data || item.dataCompetencia;
            var d = new Date(dataStr);
            var chave = meses[d.getMonth()] + ' ' + d.getFullYear();

            var separador = '';
            if (chave !== mesAtual) {
                mesAtual = chave;
                separador = '<tr class="mes-separador">' +
                    '<td colspan="6">' + chave + '</td>' +
                    '</tr>';
            }

            var valorColor = item.categoria === 'PAGAMENTO' ? 'text-success' : 'text-danger';
            var valorPrefix = item.categoria === 'PAGAMENTO' ? '+' : '-';
            var valorAbs = Math.abs(item.valor || 0);
            var saldoColor = (item.saldoAcumulado || 0) >= 0 ? 'text-success' : 'text-danger';
            var isEstornado = item.estornado || item.categoria === 'ESTORNO';

            return separador +
                '<tr' + (isEstornado ? ' style="opacity:0.5"' : '') + '>' +
                '<td class="text-mono text-sm">' + formatDate(dataStr) + '</td>' +
                '<td>' + categoriaBadge(item.categoria) + '</td>' +
                '<td class="text-secondary desc-cell" data-lanc-id="' + item.id + '" data-cat="' + item.categoria + '">' + escapeHtml(item.descricao || '—') + '</td>' +
                '<td class="text-right font-mono ' + valorColor + '">' +
                valorPrefix + formatMoney(valorAbs) +
                '</td>' +
                '<td class="text-right font-mono ' + saldoColor + '">' + formatMoney(item.saldoAcumulado || 0) + '</td>' +
                '<td class="text-right">' +
                (!isEstornado && item.id
                    ? '<button class="btn btn-ghost btn-sm" data-id="' + item.id + '" title="Estornar">↩ Estornar</button>'
                    : '') +
                '</td>' +
                '</tr>';
        }).join('');

        // Event listeners (igual antes)
        tbody.querySelectorAll('[data-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var lancamentoId = this.getAttribute('data-id');
                confirmDialog(
                    'Tem certeza que deseja estornar este lançamento? Esta ação não pode ser desfeita.',
                    function () { estornar(lancamentoId); },
                    'Estornar lançamento'
                );
            });
        });

        tbody.querySelectorAll('[data-cat="COMPRA"]').forEach(function (cell) {
            var lancId = cell.getAttribute('data-lanc-id');
            api.get('/lancamentos/' + lancId).then(function (lanc) {
                if (lanc.itens && lanc.itens.length) {
                    cell.innerHTML = lanc.itens.map(function (i) {
                        return parseFloat(i.quantidade) + 'x ' + escapeHtml(i.nomeProduto);
                    }).join(', ');
                }
            }).catch(function () { });
        });


    }

    async function estornar(lancamentoId) {
        try {
            await api.post('/lancamentos/' + lancamentoId + '/estornos', {});
            showToast('Lançamento estornado com sucesso.', 'success');
            loadExtrato();
            reloadSaldo();
        } catch (err) {
            handleApiError(err);
        }
    }

    async function reloadSaldo() {
        if (!state.clienteAtual) return;
        try {
            var saldo = await api.get('/clientes/' + state.clienteAtual.id + '/saldo');
            var situacao = saldo ? saldo.situacao : 'QUITADO';
            var valor = saldo ? saldo.saldo : 0;
            var saldoClass = situacao === 'DEVEDOR' ? 'devedor' : situacao === 'CREDOR' ? 'credor' : 'quitado';
            var saldoColor = situacao === 'DEVEDOR' ? 'text-danger' : situacao === 'CREDOR' ? 'text-info' : 'text-success';

            var saldoCard = document.querySelector('.saldo-card');
            if (saldoCard) {
                saldoCard.className = 'card saldo-card ' + saldoClass;
                saldoCard.innerHTML =
                    '<div class="card-body" style="text-align:center;padding:var(--space-xl)">' +
                    '<div class="stat-label">Saldo</div>' +
                    '<div class="saldo-value ' + saldoColor + '">' + formatMoney(valor) + '</div>' +
                    '<div style="margin-top:var(--space-md)">' + situacaoBadge(situacao) + '</div>' +
                    '</div>';
            }
        } catch (_) { }
    }

    /* ===========================
       MODAIS CRUD
    =========================== */
    function formClienteHtml(cliente) {
        cliente = cliente || {};
        return '<form id="formCliente" novalidate>' +
            formGroup('nome', 'Nome *', 'text', cliente.nome, 'João Silva') +
            formGroup('documento', 'CPF / CNPJ', 'text', cliente.documento, '000.000.000-00') +
            formGroup('telefone', 'Telefone', 'tel', cliente.telefone, '(11) 99999-9999') +
            formGroup('email', 'E-mail', 'email', cliente.email, 'joao@email.com') +
            formGroup('endereco', 'Endereço', 'text', cliente.endereco, 'Rua Exemplo, 123') +
            '</form>';
    }

    function formGroup(id, label, type, value, placeholder) {
        return '<div class="form-group">' +
            '<label class="form-label" for="' + id + '">' + label + '</label>' +
            '<input class="form-input" type="' + type + '" id="' + id + '" name="' + id + '"' +
            ' value="' + escapeHtml(value || '') + '"' +
            ' placeholder="' + escapeHtml(placeholder || '') + '">' +
            '<span class="form-error" id="' + id + 'Error"></span>' +
            '</div>';
    }

    function openModalNovoCliente() {
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnSalvarCliente">Salvar</button>';
        var overlay = openModal('Novo Cliente', formClienteHtml(), footer);
        overlay.querySelector('#btnSalvarCliente').addEventListener('click', function () {
            salvarCliente(null);
        });
    }

    function openModalEditarCliente(cliente) {
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnSalvarCliente">Salvar</button>';
        var overlay = openModal('Editar Cliente', formClienteHtml(cliente), footer);
        overlay.querySelector('#btnSalvarCliente').addEventListener('click', function () {
            salvarCliente(cliente.id);
        });
    }

    async function salvarCliente(id) {
        clearFormErrors(document.getElementById('activeModal'));
        var btn = document.querySelector('#activeModal #btnSalvarCliente');
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
                await api.put('/clientes/' + id, body);
                showToast('Cliente atualizado com sucesso.', 'success');
            } else {
                await api.post('/clientes', body);
                showToast('Cliente cadastrado com sucesso.', 'success');
            }
            closeModal();
            if (id && state.clienteAtual) {
                openDetalhe(id, body.nome);
            } else {
                loadClientes();
            }
        } catch (err) {
            setButtonLoading(btn, false);
            handleApiError(err);
        }
    }

    async function toggleAtivo(id) {
        try {
            await api.delete('/clientes/' + id);
            showToast('Status do cliente alterado.', 'success');
            voltarLista();
        } catch (err) {
            handleApiError(err);
        }
    }

    /* ===========================
       MODAL COMPRA
    =========================== */
    async function openModalCompra(clienteId) {
        // Load products first
        if (!state.produtos.length) {
            try {
                var res = await api.get('/produtos?size=200&ativo=true');
                state.produtos = Array.isArray(res) ? res : (res.content || []);
            } catch (_) { }
        }

        var body = buildCompraForm(false);
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnConfirmarCompra">Confirmar Compra</button>';
        var overlay = openModal('Registrar Compra', body, footer, 'modal-lg');

        addItemRow(overlay);
        overlay.querySelector('#btnAdicionarItem').addEventListener('click', function () {
            addItemRow(overlay);
        });
        overlay.querySelector('#btnConfirmarCompra').addEventListener('click', function () {
            salvarCompra(clienteId, overlay, false);
        });
    }

    function buildCompraForm(isFornecedor) {
        return '<form id="formCompra" novalidate>' +
            '<div class="form-group">' +
            '<label class="form-label">Data de Competência *</label>' +
            '<input class="form-input" type="date" id="dataCompetencia" value="' + todayISO() + '">' +
            '<span class="form-error" id="dataCompetenciaError"></span>' +
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
    }

    function addItemRow(overlay) {
        var list = overlay.querySelector('#itemList');
        var idx = list.children.length;
        var prodOptions = state.produtos.map(function (p) {
            return '<option value="' + p.id + '" data-preco="' + (p.precoVenda || 0) + '">' +
                escapeHtml(p.nome) + ' — ' + formatMoney(p.precoVenda || 0) + '</option>';
        }).join('');

        var row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML =
            '<div class="form-group" style="margin:0">' +
            '<select class="form-select item-produto" data-idx="' + idx + '">' +
            '<option value="">Selecione...</option>' + prodOptions +
            '</select>' +
            '</div>' +
            '<div class="form-group" style="margin:0">' +
            '<input class="form-input item-qtd" type="number" min="1" value="1" style="width:80px" placeholder="Qtd">' +
            '</div>' +
            '<div class="form-group" style="margin:0">' +
            '<input class="form-input item-preco" type="number" step="0.01" min="0" style="width:120px" placeholder="Preço unit.">' +
            '</div>' +
            '<div class="item-total" id="itemTotal' + idx + '">R$ 0,00</div>' +
            '<button type="button" class="btn btn-ghost btn-icon item-remove" title="Remover">✕</button>';

        row.querySelector('.item-produto').addEventListener('change', function () {
            var opt = this.options[this.selectedIndex];
            var preco = opt ? opt.getAttribute('data-preco') : '';
            row.querySelector('.item-preco').value = preco || '';
            updateItemTotal(row);
            updateCompraTotal(overlay);
        });
        row.querySelector('.item-qtd').addEventListener('input', function () { updateItemTotal(row); updateCompraTotal(overlay); });
        row.querySelector('.item-preco').addEventListener('input', function () { updateItemTotal(row); updateCompraTotal(overlay); });
        row.querySelector('.item-remove').addEventListener('click', function () {
            row.remove();
            updateCompraTotal(overlay);
        });

        list.appendChild(row);
    }

    function updateItemTotal(row) {
        var preco = parseFloat(row.querySelector('.item-preco').value) || 0;
        var qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
        row.querySelector('.item-total').textContent = formatMoney(preco * qtd);
    }

    function updateCompraTotal(overlay) {
        var total = 0;
        overlay.querySelectorAll('.item-row').forEach(function (row) {
            var preco = parseFloat(row.querySelector('.item-preco').value) || 0;
            var qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
            total += preco * qtd;
        });
        var totalEl = overlay.querySelector('#compraTotal span');
        if (totalEl) totalEl.textContent = formatMoney(total);
    }

    async function salvarCompra(entityId, overlay, isFornecedor) {
        clearFormErrors(overlay);
        var btn = overlay.querySelector('#btnConfirmarCompra');
        setButtonLoading(btn, true);

        var itens = [];
        var valid = true;
        overlay.querySelectorAll('.item-row').forEach(function (row) {
            var produtoId = row.querySelector('.item-produto').value;
            var qtd = parseFloat(row.querySelector('.item-qtd').value);
            if (!produtoId || !qtd || qtd < 1) { valid = false; return; }
            var preco = parseFloat(row.querySelector('.item-preco').value);
            if (!preco || preco <= 0) { valid = false; return; }
            itens.push({ produtoId: produtoId, quantidade: qtd, precoUnitario: preco });
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
            var endpoint = isFornecedor
                ? '/fornecedores/' + entityId + '/compras'
                : '/clientes/' + entityId + '/compras';
            await api.post(endpoint, body);
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
    function openModalPagamento(clienteId) {
        var body = formPagamentoHtml();
        var footer =
            '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
            '<button class="btn btn-primary" id="btnConfirmarPagamento">Confirmar Pagamento</button>';
        var overlay = openModal('Registrar Pagamento', body, footer);
        overlay.querySelector('#btnConfirmarPagamento').addEventListener('click', function () {
            salvarPagamento(clienteId, overlay, false);
        });
    }

    function formPagamentoHtml() {
        return '<form id="formPagamento" novalidate>' +
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
            '<option value="CARTAO">Cartão</option>' +
            '<option value="BOLETO">Boleto</option>' +
            '<option value="OUTRO">Outro</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label class="form-label">Descrição</label>' +
            '<input class="form-input" type="text" id="descricaoPag" placeholder="Opcional">' +
            '</div>' +
            '</form>';
    }

    async function salvarPagamento(entityId, overlay, isFornecedor) {
        clearFormErrors(overlay);
        var btn = overlay.querySelector('#btnConfirmarPagamento');
        setButtonLoading(btn, true);

        var body = {
            valor: overlay.querySelector('#valor').value,
            dataCompetencia: overlay.querySelector('#data').value,
            formaPagamento: overlay.querySelector('#formaPagamento').value,
            descricao: overlay.querySelector('#descricaoPag').value.trim(),
        };

        if (!body.valor || body.valor <= 0) {
            showToast('Informe um valor válido.', 'warning');
            setButtonLoading(btn, false);
            return;
        }

        try {
            var endpoint = isFornecedor
                ? '/fornecedores/' + entityId + '/pagamentos'
                : '/clientes/' + entityId + '/pagamentos';
            await api.post(endpoint, body);
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
            var args = arguments;
            var ctx = this;
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    // Expose helpers for fornecedores.js reuse (if needed)
    window._clienteHelpers = {
        formPagamentoHtml: formPagamentoHtml,
        salvarPagamento: salvarPagamento,
        buildCompraForm: buildCompraForm,
        addItemRow: addItemRow,
        salvarCompra: salvarCompra,
    };
})();

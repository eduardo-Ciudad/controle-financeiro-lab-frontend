/* Pessoal — contas pessoais do proprietário */
(function () {
    requireAuth();

    var mainContent = document.getElementById('mainContent');
    var state = {
        filtroStatus: '',
        mesAtual: new Date().toISOString().slice(0, 7),
    };

    document.addEventListener('DOMContentLoaded', function () {
        renderPage();
        loadResumo();
        loadContas();
    });

    /* ===== HELPERS ===== */

    function nomeMes(mesStr) {
        var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        var parts = mesStr.split('-');
        return meses[parseInt(parts[1]) - 1] + ' ' + parts[0];
    }

    function mudarMes(delta) {
        var parts = state.mesAtual.split('-');
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1 + delta, 1);
        state.mesAtual = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        var label = document.getElementById('labelMesAtual');
        if (label) label.textContent = nomeMes(state.mesAtual);
        loadResumo();
        loadContas();
    }

    /* ===== PAGE STRUCTURE ===== */

    function renderPage() {
        mainContent.innerHTML =
            // Card 1 — form (unchanged)
            '<div class="card" style="margin-bottom:var(--space-lg)">' +
                '<div class="card-header"><h3>Adicionar Conta</h3></div>' +
                '<div style="padding:var(--space-lg)">' +
                    '<form id="formPessoal" novalidate>' +
                        '<div class="pessoal-form-grid">' +
                            '<div class="form-group" style="margin:0">' +
                                '<label class="form-label" for="pessoalDescricao">Descrição *</label>' +
                                '<input class="form-input" type="text" id="pessoalDescricao" placeholder="Ex: Conta de luz" autocomplete="off">' +
                                '<span class="form-error" id="descricaoError"></span>' +
                            '</div>' +
                            '<div class="form-group" style="margin:0">' +
                                '<label class="form-label" for="pessoalValor">Valor *</label>' +
                                '<input class="form-input font-mono" type="number" id="pessoalValor" min="0.01" step="0.01" placeholder="0,00">' +
                                '<span class="form-error" id="valorError"></span>' +
                            '</div>' +
                            '<div class="form-group" style="margin:0">' +
                                '<label class="form-label" for="pessoalVencimento">Vencimento *</label>' +
                                '<input class="form-input" type="date" id="pessoalVencimento">' +
                                '<span class="form-error" id="dataVencimentoError"></span>' +
                            '</div>' +
                            '<div class="pessoal-submit-btn" style="display:flex;gap:var(--space-sm);align-items:flex-end">' +
                                '<button type="submit" class="btn btn-primary" id="btnAdicionarConta">Adicionar</button>' +
                                '<button type="button" class="btn btn-secondary" id="btnAbrirParcelamento">Parcelamento</button>' +
                            '</div>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +

            // Card 2 — monthly view
            '<div class="card">' +
                '<div class="card-header">' +
                    '<h3>Contas do Mês</h3>' +
                    '<div class="dia-nav">' +
                        '<button class="btn btn-sm btn-ghost" id="btnMesAnterior">←</button>' +
                        '<span id="labelMesAtual" style="font-size:var(--text-base);font-weight:600;color:var(--text-primary);min-width:160px;text-align:center">' + nomeMes(state.mesAtual) + '</span>' +
                        '<button class="btn btn-sm btn-ghost" id="btnProximoMes">→</button>' +
                    '</div>' +
                '</div>' +
                '<div style="padding:var(--space-lg) var(--space-lg) 0">' +
                    '<div class="resumo-pessoal-grid" id="resumoPessoalGrid"></div>' +
                    '<div id="filterTabs" style="display:flex;gap:var(--space-xs);margin-bottom:var(--space-lg)">' +
                        '<button class="btn btn-sm btn-primary filter-btn" data-status="">Todas</button>' +
                        '<button class="btn btn-sm btn-secondary filter-btn" data-status="PENDENTE">Pendentes</button>' +
                        '<button class="btn btn-sm btn-secondary filter-btn" data-status="PAGA">Pagas</button>' +
                    '</div>' +
                '</div>' +
                '<div class="table-wrapper">' +
                    '<table class="table">' +
                        '<thead><tr>' +
                            '<th>Descrição</th>' +
                            '<th class="text-right">Valor</th>' +
                            '<th>Vencimento</th>' +
                            '<th>Status</th>' +
                            '<th>Pagamento</th>' +
                            '<th class="text-right">Ações</th>' +
                        '</tr></thead>' +
                        '<tbody id="pessoalTableBody">' + skeletonRows(6) + '</tbody>' +
                    '</table>' +
                '</div>' +
            '</div>';

        document.getElementById('formPessoal').addEventListener('submit', handleFormSubmit);
        document.getElementById('btnAbrirParcelamento').addEventListener('click', openParcelamentoModal);
        document.getElementById('btnMesAnterior').addEventListener('click', function () { mudarMes(-1); });
        document.getElementById('btnProximoMes').addEventListener('click', function () { mudarMes(1); });

        document.getElementById('filterTabs').querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.filter-btn').forEach(function (b) {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                this.classList.remove('btn-secondary');
                this.classList.add('btn-primary');
                state.filtroStatus = this.getAttribute('data-status');
                loadContas();
            });
        });
    }

    /* ===== RESUMO ===== */

    function renderResumoLoading() {
        var grid = document.getElementById('resumoPessoalGrid');
        if (!grid) return;
        var skel =
            '<div class="stat-card">' +
                '<div class="skeleton skeleton-text" style="width:55%"></div>' +
                '<div class="skeleton" style="height:36px;margin-top:var(--space-sm)"></div>' +
                '<div class="skeleton skeleton-text" style="width:35%;margin-top:var(--space-xs)"></div>' +
            '</div>';
        grid.innerHTML = skel + skel + skel;
    }

    function renderResumo(resumo) {
        var grid = document.getElementById('resumoPessoalGrid');
        if (!grid) return;

        var pendenteCor = parseFloat(resumo.totalPendente) > 0 ? 'var(--warning)' : 'var(--text-muted)';

        function card(label, valor, qtd, cor) {
            var qtdTxt = qtd + ' conta' + (qtd !== 1 ? 's' : '');
            return '<div class="stat-card">' +
                '<div class="stat-label">' + label + '</div>' +
                '<div class="stat-value" style="font-size:var(--text-2xl)' + (cor ? ';color:' + cor : '') + '">' + formatMoney(valor) + '</div>' +
                '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-xs)">' + qtdTxt + '</div>' +
            '</div>';
        }

        grid.innerHTML =
            card('Total do Mês', resumo.totalMes, resumo.quantidadeTotal, '') +
            card('Pago', resumo.totalPago, resumo.quantidadePaga, 'var(--accent)') +
            card('Pendente', resumo.totalPendente, resumo.quantidadePendente, pendenteCor);
    }

    async function loadResumo() {
        renderResumoLoading();
        try {
            var resumo = await api.get('/pessoal/resumo?mes=' + state.mesAtual);
            renderResumo(resumo);
        } catch (err) {
            var grid = document.getElementById('resumoPessoalGrid');
            if (grid) grid.innerHTML = '';
            handleApiError(err);
        }
    }

    /* ===== PARCELAMENTO MODAL ===== */

    function openParcelamentoModal() {
        var bodyHtml =
            '<form id="formParcelamento" novalidate>' +
                '<div class="form-group">' +
                    '<label class="form-label" for="parcDescricao">Descrição *</label>' +
                    '<input class="form-input" type="text" id="parcDescricao" placeholder="Ex: Geladeira Consul" autocomplete="off">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label" for="parcValorTotal">Valor Total *</label>' +
                    '<input class="form-input font-mono" type="number" id="parcValorTotal" min="0.01" step="0.01" placeholder="0,00">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label" for="parcQuantidade">Nº de Parcelas *</label>' +
                    '<input class="form-input font-mono" type="number" id="parcQuantidade" min="2" max="48" step="1" placeholder="Ex: 4">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label" for="parcVencimento">Vencimento da 1ª Parcela *</label>' +
                    '<input class="form-input" type="date" id="parcVencimento">' +
                '</div>' +
                '<div id="parcPreview" style="display:none;margin-top:var(--space-md)"></div>' +
            '</form>';

        var footerHtml =
            '<button type="button" class="btn btn-secondary" id="btnCancelarParcelamento">Cancelar</button>' +
            '<button type="button" class="btn btn-primary" id="btnConfirmarParcelamento">Criar Parcelas</button>';

        var overlay = openModal('Novo Parcelamento', bodyHtml, footerHtml);

        ['parcValorTotal', 'parcQuantidade', 'parcVencimento'].forEach(function (id) {
            var el = overlay.querySelector('#' + id);
            if (el) el.addEventListener('input', function () { atualizarPreview(overlay); });
        });

        overlay.querySelector('#btnCancelarParcelamento').addEventListener('click', closeModal);
        overlay.querySelector('#btnConfirmarParcelamento').addEventListener('click', function () {
            handleParcelamentoSubmit(overlay);
        });

        overlay.querySelector('#formParcelamento').addEventListener('submit', function (e) {
            e.preventDefault();
            handleParcelamentoSubmit(overlay);
        });
    }

    function atualizarPreview(overlay) {
        var total = parseFloat(overlay.querySelector('#parcValorTotal').value);
        var qtd = parseInt(overlay.querySelector('#parcQuantidade').value);
        var dataStr = overlay.querySelector('#parcVencimento').value;
        var preview = overlay.querySelector('#parcPreview');

        if (!total || !qtd || qtd < 2 || !dataStr) {
            preview.style.display = 'none';
            return;
        }

        var valorParcela = Math.floor(total / qtd * 100) / 100;
        var valorUltima = parseFloat((total - valorParcela * (qtd - 1)).toFixed(2));

        var html = '<p style="font-size:var(--text-sm);color:var(--text-secondary);margin:0 0 var(--space-xs)">Prévia:</p>' +
            '<div style="display:flex;flex-direction:column;gap:2px;font-size:var(--text-sm)">';

        var base = new Date(dataStr + 'T12:00:00');
        for (var i = 0; i < qtd; i++) {
            var d = new Date(base);
            d.setMonth(d.getMonth() + i);
            var valor = i === qtd - 1 ? valorUltima : valorParcela;
            html += '<div style="display:flex;justify-content:space-between;padding:var(--space-xs) var(--space-sm);background:var(--bg-tertiary);border-radius:var(--radius-sm)">' +
                '<span>' + (i + 1) + '/' + qtd + ' — ' + d.toLocaleDateString('pt-BR') + '</span>' +
                '<span class="font-mono">' + formatMoney(valor) + '</span>' +
            '</div>';
        }
        html += '</div>';
        preview.innerHTML = html;
        preview.style.display = 'block';
    }

    async function handleParcelamentoSubmit(overlay) {
        var btn = overlay.querySelector('#btnConfirmarParcelamento');
        setButtonLoading(btn, true);

        var body = {
            descricao: overlay.querySelector('#parcDescricao').value.trim(),
            valorTotal: parseFloat(overlay.querySelector('#parcValorTotal').value),
            quantidadeParcelas: parseInt(overlay.querySelector('#parcQuantidade').value),
            dataVencimentoPrimeira: overlay.querySelector('#parcVencimento').value,
        };

        try {
            var parcelas = await api.post('/pessoal/parcelamentos', body);
            showToast(parcelas.length + ' parcelas criadas com sucesso.', 'success');
            closeModal();
            loadResumo();
            loadContas();
        } catch (err) {
            handleApiError(err);
        } finally {
            setButtonLoading(btn, false);
        }
    }

    /* ===== CONTAS LIST ===== */

    async function loadContas() {
        var tbody = document.getElementById('pessoalTableBody');
        if (tbody) tbody.innerHTML = skeletonRows(6);

        try {
            var params = '?mes=' + state.mesAtual;
            if (state.filtroStatus) params += '&status=' + state.filtroStatus;
            var data = await api.get('/pessoal' + params);
            var contas = Array.isArray(data) ? data : (data.content || []);
            renderTabela(contas);
        } catch (err) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erro ao carregar contas.</td></tr>';
            handleApiError(err);
        }
    }

    function renderTabela(contas) {
        var tbody = document.getElementById('pessoalTableBody');
        if (!tbody) return;

        if (!contas.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhuma conta cadastrada.</td></tr>';
            return;
        }

        var hoje = todayISO();
        tbody.innerHTML = contas.map(function (c) {
            var isVencida = c.status === 'PENDENTE' && c.dataVencimento && c.dataVencimento < hoje;
            var badge;
            if (c.status === 'PAGA') {
                badge = '<span class="badge badge-success">Paga</span>';
            } else if (isVencida) {
                badge = '<span class="badge badge-danger">Vencida</span>';
            } else {
                badge = '<span class="badge badge-warning">Pendente</span>';
            }

            var acoes = '';
            if (c.status !== 'PAGA') {
                acoes += '<button class="btn btn-sm btn-success-outline btn-pagar" data-id="' + c.id + '" style="margin-right:var(--space-xs)">Pagar</button>';
            }
            acoes += '<button class="btn btn-sm btn-ghost btn-excluir" data-id="' + c.id + '">Excluir</button>';

            return '<tr' + (isVencida ? ' style="background:rgba(239,68,68,0.05)"' : '') + '>' +
                '<td>' + escapeHtml(c.descricao) + '</td>' +
                '<td class="text-right font-mono">' + formatMoney(c.valor) + '</td>' +
                '<td class="font-mono">' + formatDate(c.dataVencimento) + '</td>' +
                '<td>' + badge + '</td>' +
                '<td class="font-mono text-secondary">' + (c.dataPagamento ? formatDate(c.dataPagamento) : '—') + '</td>' +
                '<td class="text-right">' + acoes + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('.btn-pagar').forEach(function (btn) {
            btn.addEventListener('click', function () {
                pagarConta(this.getAttribute('data-id'));
            });
        });

        tbody.querySelectorAll('.btn-excluir').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                confirmDialog(
                    'Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.',
                    function () { excluirConta(id); },
                    'Excluir conta'
                );
            });
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        clearFormErrors(document.getElementById('formPessoal'));

        var btn = document.getElementById('btnAdicionarConta');
        setButtonLoading(btn, true);

        var body = {
            descricao: document.getElementById('pessoalDescricao').value.trim(),
            valor: parseFloat(document.getElementById('pessoalValor').value),
            dataVencimento: document.getElementById('pessoalVencimento').value,
        };

        try {
            await api.post('/pessoal', body);
            showToast('Conta adicionada com sucesso.', 'success');
            document.getElementById('pessoalDescricao').value = '';
            document.getElementById('pessoalValor').value = '';
            document.getElementById('pessoalVencimento').value = '';
            loadResumo();
            loadContas();
        } catch (err) {
            handleApiError(err);
        } finally {
            setButtonLoading(btn, false);
        }
    }

    async function pagarConta(id) {
        try {
            await api.patch('/pessoal/' + id + '/pagar');
            showToast('Conta marcada como paga.', 'success');
            loadResumo();
            loadContas();
        } catch (err) {
            handleApiError(err);
        }
    }

    async function excluirConta(id) {
        try {
            await api.delete('/pessoal/' + id);
            showToast('Conta excluída.', 'success');
            loadResumo();
            loadContas();
        } catch (err) {
            handleApiError(err);
        }
    }
})();

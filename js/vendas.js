/* Vendas — registrar nova venda */
(function () {
    requireAuth();

    var mainContent = document.getElementById('mainContent');

    document.addEventListener('DOMContentLoaded', function () {
        renderPage();
        loadSelects();
    });

    function renderPage() {
        mainContent.innerHTML =
            '<div class="card">' +
                '<div class="card-header"><h3>Nova Venda</h3></div>' +
                '<div style="padding:var(--space-lg)">' +
                    '<form id="formVenda" novalidate>' +
                        '<div class="vendas-form-grid">' +
                            '<div class="form-group">' +
                                '<label class="form-label" for="vCliente">Cliente *</label>' +
                                '<select id="vCliente" class="form-input"><option value="">Carregando...</option></select>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label" for="vProduto">Produto *</label>' +
                                '<select id="vProduto" class="form-input"><option value="">Carregando...</option></select>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label" for="vQtd">Quantidade *</label>' +
                                '<input id="vQtd" type="number" class="form-input" min="0.01" step="0.01" placeholder="1">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label" for="vPreco">Preço Unitário R$ *</label>' +
                                '<input id="vPreco" type="number" class="form-input font-mono" min="0" step="0.01" placeholder="0.00">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label" for="vForma">Forma de Pagamento *</label>' +
                                '<select id="vForma" class="form-input">' +
                                    '<option value="">Selecione...</option>' +
                                    '<option value="PIX">PIX</option>' +
                                    '<option value="DINHEIRO">DINHEIRO</option>' +
                                    '<option value="CARTAO">CARTÃO</option>' +
                                    '<option value="FIADO">FIADO</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label" for="vData">Data *</label>' +
                                '<input id="vData" type="date" class="form-input" value="' + todayISO() + '">' +
                            '</div>' +
                        '</div>' +
                        '<div class="vendas-form-footer">' +
                            '<span class="vendas-total" id="vTotal">Total: R$ 0,00</span>' +
                            '<button type="submit" class="btn btn-primary" id="btnRegistrarVenda">Registrar Venda</button>' +
                        '</div>' +
                    '</form>' +
                    '<div id="vendaMsg" style="display:none;margin-top:var(--space-md);padding:var(--space-md);border-radius:var(--radius-md)"></div>' +
                '</div>' +
            '</div>';

        var selProduto = document.getElementById('vProduto');
        var inpQtd     = document.getElementById('vQtd');
        var inpPreco   = document.getElementById('vPreco');

        selProduto.addEventListener('change', function () {
            var opt   = this.options[this.selectedIndex];
            var preco = opt ? parseFloat(opt.getAttribute('data-preco')) : NaN;
            inpPreco.value = isNaN(preco) ? '' : preco.toFixed(2);
            atualizarTotal();
        });

        inpQtd.addEventListener('input', atualizarTotal);
        inpPreco.addEventListener('input', atualizarTotal);

        document.getElementById('formVenda').addEventListener('submit', function (e) {
            e.preventDefault();
            handleSubmit();
        });
    }

    async function loadSelects() {
        var selCliente = document.getElementById('vCliente');
        var selProduto = document.getElementById('vProduto');
        if (!selCliente || !selProduto) return;

        try {
            var results  = await Promise.all([
                api.get('/clientes?page=0&size=200'),
                api.get('/produtos?page=0&size=200')
            ]);
            var clientes = Array.isArray(results[0]) ? results[0] : (results[0].content || []);
            var produtos  = Array.isArray(results[1]) ? results[1] : (results[1].content  || []);

            selCliente.innerHTML = '<option value="">Selecione cliente...</option>' +
                clientes.map(function (c) {
                    return '<option value="' + c.id + '">' + escapeHtml(c.nome) + '</option>';
                }).join('');

            selProduto.innerHTML = '<option value="">Selecione produto...</option>' +
                produtos.map(function (p) {
                    return '<option value="' + p.id + '" data-preco="' + (p.precoVenda || 0) + '">' +
                        escapeHtml(p.nome) + '</option>';
                }).join('');
        } catch (err) {
            if (selCliente) selCliente.innerHTML = '<option value="">Erro ao carregar</option>';
            if (selProduto) selProduto.innerHTML = '<option value="">Erro ao carregar</option>';
            handleApiError(err);
        }
    }

    function atualizarTotal() {
        var qtd   = parseFloat(document.getElementById('vQtd').value)  || 0;
        var preco = parseFloat(document.getElementById('vPreco').value) || 0;
        var el    = document.getElementById('vTotal');
        if (el) el.textContent = 'Total: ' + formatMoney(qtd * preco);
    }

    async function handleSubmit() {
        var clienteId       = document.getElementById('vCliente').value;
        var produtoId       = document.getElementById('vProduto').value;
        var quantidade      = parseFloat(document.getElementById('vQtd').value);
        var precoUnitario   = parseFloat(document.getElementById('vPreco').value);
        var formaPagamento  = document.getElementById('vForma').value;
        var dataCompetencia = document.getElementById('vData').value;

        if (!clienteId || !produtoId || !quantidade || !precoUnitario || !formaPagamento || !dataCompetencia) {
            mostrarMsg('Preencha todos os campos antes de registrar.', false);
            return;
        }

        var btn = document.getElementById('btnRegistrarVenda');
        setButtonLoading(btn, true);

        try {
            await api.post('/vendas', {
                clienteId:       parseInt(clienteId,  10),
                produtoId:       parseInt(produtoId,  10),
                quantidade:      quantidade,
                precoUnitario:   precoUnitario,
                formaPagamento:  formaPagamento,
                dataCompetencia: dataCompetencia,
            });

            mostrarMsg('Venda registrada com sucesso!', true);
            document.getElementById('vCliente').value = '';
            document.getElementById('vProduto').value = '';
            document.getElementById('vQtd').value     = '';
            document.getElementById('vPreco').value   = '';
            document.getElementById('vForma').value   = '';
            document.getElementById('vData').value    = todayISO();
            atualizarTotal();
        } catch (err) {
            var msg = (err && (err.message || err.erro || err.error)) || 'Erro ao registrar a venda.';
            mostrarMsg(msg, false);
        } finally {
            setButtonLoading(btn, false);
        }
    }

    function mostrarMsg(texto, sucesso) {
        var el = document.getElementById('vendaMsg');
        if (!el) return;
        el.style.display    = 'block';
        el.style.background = sucesso ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
        el.style.border     = '1px solid ' + (sucesso ? 'var(--accent)' : 'var(--danger)');
        el.style.color      = sucesso ? 'var(--accent)' : 'var(--danger)';
        el.textContent      = texto;
        if (sucesso) {
            setTimeout(function () { el.style.display = 'none'; }, 4000);
        }
    }
})();

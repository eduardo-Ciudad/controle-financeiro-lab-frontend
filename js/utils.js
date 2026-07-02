/* Formatting utilities — exposed on window */

function formatMoney(value) {
    var num = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    // Add time to avoid UTC offset issues on date-only strings
    var d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('pt-BR');
}

function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    var d = new Date(isoStr);
    return isNaN(d) ? isoStr : d.toLocaleString('pt-BR');
}

function parseMoney(str) {
    if (typeof str === 'number') return str;
    // Convert "1.234,56" → 1234.56
    return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

function categoriaBadge(categoria) {
    var map = {
        COMPRA:    { cls: 'badge-info',    label: 'Compra' },
        PAGAMENTO: { cls: 'badge-success', label: 'Pagamento' },
        ESTORNO:   { cls: 'badge-warning', label: 'Estorno' },
        AJUSTE:    { cls: 'badge-muted',   label: 'Ajuste' },
    };
    var b = map[categoria] || { cls: 'badge-muted', label: categoria || '—' };
    return '<span class="badge ' + b.cls + '">' + b.label + '</span>';
}

function situacaoBadge(situacao) {
    var map = {
        DEVEDOR: { cls: 'badge-danger',  label: 'Devedor' },
        CREDOR:  { cls: 'badge-info',    label: 'Crédito' },
        QUITADO: { cls: 'badge-success', label: 'Quitado' },
    };
    var b = map[situacao] || { cls: 'badge-muted', label: situacao || '—' };
    return '<span class="badge ' + b.cls + '">' + b.label + '</span>';
}

function statusBadge(ativo) {
    return ativo
        ? '<span class="badge badge-success">Ativo</span>'
        : '<span class="badge badge-muted">Inativo</span>';
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

/* Reusable UI components — toast, modal, confirm, pagination, loading helpers */

/* ===== TOAST ===== */
function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 4000;
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
        '<span>' + escapeHtml(message) + '</span>' +
        '<button class="toast-close" aria-label="Fechar">&times;</button>';

    toast.querySelector('.toast-close').addEventListener('click', function () {
        dismissToast(toast);
    });

    container.appendChild(toast);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            toast.classList.add('toast-visible');
        });
    });

    setTimeout(function () { dismissToast(toast); }, duration);
}

function dismissToast(toast) {
    toast.classList.remove('toast-visible');
    setTimeout(function () { toast.remove(); }, 300);
}

/* ===== MODAL ===== */
function openModal(title, bodyHtml, footerHtml, extraClass) {
    closeModal();

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'activeModal';

    var modalClass = 'modal' + (extraClass ? ' ' + extraClass : '');
    overlay.innerHTML =
        '<div class="' + modalClass + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
            '<div class="modal-header">' +
                '<h3 class="modal-title" id="modalTitle">' + escapeHtml(title) + '</h3>' +
                '<button class="modal-close" id="modalCloseBtn" aria-label="Fechar">' +
                    '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' +
                    '</svg>' +
                '</button>' +
            '</div>' +
            '<div class="modal-body">' + bodyHtml + '</div>' +
            (footerHtml ? '<div class="modal-footer">' + footerHtml + '</div>' : '') +
        '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });

    // Keyboard close
    function onKeyDown(e) {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKeyDown); }
    }
    document.addEventListener('keydown', onKeyDown);
    overlay._keyHandler = onKeyDown;

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            overlay.classList.add('modal-overlay-visible');
        });
    });

    return overlay;
}

function closeModal() {
    var overlay = document.getElementById('activeModal');
    if (!overlay) return;
    if (overlay._keyHandler) document.removeEventListener('keydown', overlay._keyHandler);
    overlay.classList.remove('modal-overlay-visible');
    document.body.style.overflow = '';
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 250);
}

/* ===== CONFIRM DIALOG ===== */
function confirmDialog(message, onConfirm, title) {
    title = title || 'Confirmar ação';
    var footer =
        '<button class="btn btn-secondary" id="confirmCancel">Cancelar</button>' +
        '<button class="btn btn-danger" id="confirmOk">Confirmar</button>';
    var body = '<p>' + escapeHtml(message) + '</p>';
    var overlay = openModal(title, body, footer);
    overlay.querySelector('#confirmCancel').addEventListener('click', closeModal);
    overlay.querySelector('#confirmOk').addEventListener('click', function () {
        closeModal();
        onConfirm();
    });
}

/* ===== API ERROR HANDLER ===== */
function handleApiError(err) {
    if (err && err.fieldErrors && Array.isArray(err.fieldErrors)) {
        err.fieldErrors.forEach(function (fe) {
            var input = document.getElementById(fe.field) ||
                        document.querySelector('[name="' + fe.field + '"]');
            var errEl = document.getElementById(fe.field + 'Error') ||
                        document.querySelector('[data-error="' + fe.field + '"]');
            if (input) input.classList.add('input-error');
            if (errEl) errEl.textContent = fe.message;
        });
        return;
    }
    var msg = (err && (err.message || err.erro || err.error)) || 'Ocorreu um erro. Tente novamente.';
    showToast(msg, 'error');
}

function clearFormErrors(formEl) {
    var scope = formEl || document;
    scope.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });
    scope.querySelectorAll('.input-error').forEach(function (el) { el.classList.remove('input-error'); });
}

/* ===== PAGINATION ===== */
function renderPagination(container, page, totalPages, onPageChange) {
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    container.innerHTML =
        '<div class="pagination">' +
            '<span class="pagination-info">Página ' + (page + 1) + ' de ' + totalPages + '</span>' +
            '<div class="pagination-controls">' +
                '<button class="btn btn-secondary btn-sm" id="prevPageBtn"' + (page === 0 ? ' disabled' : '') + '>← Anterior</button>' +
                '<button class="btn btn-secondary btn-sm" id="nextPageBtn"' + (page >= totalPages - 1 ? ' disabled' : '') + '>Próximo →</button>' +
            '</div>' +
        '</div>';

    var prevBtn = container.querySelector('#prevPageBtn');
    var nextBtn = container.querySelector('#nextPageBtn');
    if (prevBtn) prevBtn.addEventListener('click', function () { if (page > 0) onPageChange(page - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (page < totalPages - 1) onPageChange(page + 1); });
}

/* ===== BUTTON LOADING ===== */
function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn._originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner spinner-sm"></span>';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn._originalHTML || btn.innerHTML;
        btn.disabled = false;
    }
}

/* ===== SKELETON ROWS ===== */
function skeletonRows(cols, rows) {
    rows = rows || 5;
    var html = '';
    for (var r = 0; r < rows; r++) {
        html += '<tr>';
        for (var c = 0; c < cols; c++) {
            html += '<td><div class="skeleton"></div></td>';
        }
        html += '</tr>';
    }
    return html;
}

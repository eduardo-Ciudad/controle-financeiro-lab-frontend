/* Router — marks active sidebar nav item based on current page filename */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        document.querySelectorAll('.nav-item[data-page]').forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
    });
})();

/* Auth module — route guard, logout, mobile sidebar */
(function () {
    function requireAuth() {
        if (!getToken()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    function logout() {
        localStorage.removeItem('fc_token');
        window.location.href = 'index.html';
    }

    window.requireAuth = requireAuth;
    window.logout = logout;

    document.addEventListener('DOMContentLoaded', function () {
        // Logout button
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Mobile hamburger
        var hamburgerBtn = document.getElementById('hamburgerBtn');
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');

        if (hamburgerBtn && sidebar) {
            hamburgerBtn.addEventListener('click', function () {
                sidebar.classList.toggle('sidebar-open');
                if (overlay) overlay.classList.toggle('active');
            });
            if (overlay) {
                overlay.addEventListener('click', function () {
                    sidebar.classList.remove('sidebar-open');
                    overlay.classList.remove('active');
                });
            }
        }
    });
})();

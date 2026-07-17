(function () {
    'use strict';

    var CONSENT_KEY = 'cookie_consent';
    var CONSENT_DATE_KEY = 'cookie_consent_date';
    var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

    function hasValidConsent() {
        var value = localStorage.getItem(CONSENT_KEY);
        var dateStr = localStorage.getItem(CONSENT_DATE_KEY);
        if (!value || !dateStr) return false;

        var savedDate = new Date(dateStr).getTime();
        if (isNaN(savedDate)) return false;

        return (Date.now() - savedDate) < MAX_AGE_MS;
    }

    function saveConsent(value) {
        localStorage.setItem(CONSENT_KEY, value);
        localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
    }

    function injectStyles() {
        if (document.getElementById('cookieConsentStyles')) return;

        var style = document.createElement('style');
        style.id = 'cookieConsentStyles';
        style.textContent =
            '.cookie-consent-banner {' +
            '  position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999;' +
            '  display: flex; justify-content: center;' +
            '  padding: var(--space-lg, 24px);' +
            '  transform: translateY(120%); opacity: 0;' +
            '  transition: transform 320ms ease, opacity 320ms ease;' +
            '  pointer-events: none;' +
            '}' +
            '.cookie-consent-banner.cookie-consent-visible {' +
            '  transform: translateY(0); opacity: 1; pointer-events: auto;' +
            '}' +
            '.cookie-consent-card {' +
            '  width: 100%; max-width: 640px;' +
            '  background: var(--glass-bg-strong, rgba(255,255,255,0.06));' +
            '  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));' +
            '  backdrop-filter: blur(var(--glass-blur, 12px));' +
            '  -webkit-backdrop-filter: blur(var(--glass-blur, 12px));' +
            '  border-radius: var(--radius-xl, 16px);' +
            '  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.5));' +
            '  padding: var(--space-lg, 24px);' +
            '  color: var(--text-primary, #f1f5f9);' +
            '  font-family: var(--font-family, sans-serif);' +
            '}' +
            '@supports not (backdrop-filter: blur(1px)) {' +
            '  .cookie-consent-card { background: var(--bg-secondary, #1a1d27); }' +
            '}' +
            '.cookie-consent-text {' +
            '  font-size: var(--text-sm, 0.875rem); color: var(--text-secondary, #94a3b8);' +
            '  margin: 0 0 var(--space-md, 16px); line-height: 1.6;' +
            '}' +
            '.cookie-consent-text a {' +
            '  color: var(--accent, #10b981); text-decoration: underline;' +
            '}' +
            '.cookie-consent-actions {' +
            '  display: flex; align-items: center; justify-content: flex-end;' +
            '  gap: var(--space-sm, 8px); flex-wrap: wrap;' +
            '}' +
            '.cookie-consent-btn {' +
            '  display: inline-flex; align-items: center; justify-content: center;' +
            '  padding: var(--space-sm, 8px) var(--space-lg, 24px);' +
            '  font-family: var(--font-family, sans-serif); font-size: var(--text-sm, 0.875rem);' +
            '  font-weight: 500; border-radius: var(--radius-md, 8px); cursor: pointer;' +
            '  border: 1px solid transparent; white-space: nowrap;' +
            '  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;' +
            '}' +
            '.cookie-consent-btn-primary {' +
            '  background-color: var(--accent, #10b981); color: #fff;' +
            '}' +
            '.cookie-consent-btn-primary:hover {' +
            '  background-color: var(--accent-hover, #059669);' +
            '}' +
            '.cookie-consent-btn-secondary {' +
            '  background: var(--glass-bg, transparent); color: var(--text-secondary, #94a3b8);' +
            '  border-color: var(--glass-border, var(--border, #2d3244));' +
            '}' +
            '.cookie-consent-btn-secondary:hover {' +
            '  color: var(--text-primary, #f1f5f9); border-color: var(--accent, #10b981);' +
            '}' +
            '@media (max-width: 560px) {' +
            '  .cookie-consent-banner { padding: var(--space-md, 16px); }' +
            '  .cookie-consent-actions { flex-direction: column; align-items: stretch; }' +
            '  .cookie-consent-btn { width: 100%; }' +
            '}';
        document.head.appendChild(style);
    }

    function buildBanner() {
        var banner = document.createElement('div');
        banner.className = 'cookie-consent-banner';
        banner.id = 'cookieConsentBanner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Aviso de cookies');

        banner.innerHTML =
            '<div class="cookie-consent-card">' +
            '  <p class="cookie-consent-text">' +
            '    🍪 Utilizamos cookies para melhorar sua experiência. Cookies essenciais são necessários para o funcionamento da plataforma. Você pode aceitar todos os cookies ou apenas os essenciais. ' +
            '    <a href="politica-de-cookies.html">Saiba mais</a>' +
            '  </p>' +
            '  <div class="cookie-consent-actions">' +
            '    <button type="button" class="cookie-consent-btn cookie-consent-btn-secondary" id="cookieConsentEssential">Apenas necessários</button>' +
            '    <button type="button" class="cookie-consent-btn cookie-consent-btn-primary" id="cookieConsentAcceptAll">Aceitar todos</button>' +
            '  </div>' +
            '</div>';

        return banner;
    }

    function hideBanner(banner) {
        banner.classList.remove('cookie-consent-visible');
        window.setTimeout(function () {
            if (banner.parentNode) banner.parentNode.removeChild(banner);
        }, 350);
    }

    function init() {
        if (hasValidConsent()) return;
        if (document.getElementById('cookieConsentBanner')) return;

        injectStyles();
        var banner = buildBanner();
        document.body.appendChild(banner);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                banner.classList.add('cookie-consent-visible');
            });
        });

        document.getElementById('cookieConsentAcceptAll').addEventListener('click', function () {
            saveConsent('all');
            hideBanner(banner);
        });

        document.getElementById('cookieConsentEssential').addEventListener('click', function () {
            saveConsent('essential');
            hideBanner(banner);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* API module — wraps fetch with auth token and error handling */
(function () {
    // Backend multi-tenant (controle-financeiro-lab) rodando na VPS.
    // Atenção: é HTTP puro (sem SSL). Se o frontend for servido via HTTPS (ex: Vercel),
    // o navegador vai bloquear a requisição por mixed content — troque para https:// quando
    // a VPS tiver certificado configurado.
   var API_BASE = 'https://controlefinanceirolab.duckdns.org';
     //var API_BASE = 'http://localhost:8080';


    function getToken() {
        return localStorage.getItem('fc_token');
    }

    async function request(path, options) {
        options = options || {};
        var token = getToken();
        var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        if (token) headers['Authorization'] = 'Bearer ' + token;

        var response;
        try {
            response = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
        } catch (networkErr) {
            throw { message: 'Sem conexão com o servidor. Verifique se o backend está rodando.' };
        }

        if (response.status === 401) {
            localStorage.removeItem('fc_token');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            var errorData = {};
            try { errorData = await response.json(); } catch (_) {}
            throw Object.assign({ status: response.status }, errorData);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    window.api = {
        get:    function (path) { return request(path); },
        post:   function (path, body) { return request(path, { method: 'POST',   body: JSON.stringify(body) }); },
        put:    function (path, body) { return request(path, { method: 'PUT',    body: JSON.stringify(body) }); },
        patch:  function (path, body) { return request(path, { method: 'PATCH',  body: body !== undefined ? JSON.stringify(body) : undefined }); },
        delete: function (path)       { return request(path, { method: 'DELETE' }); },
    };

    window.getToken = getToken;
    window.API_BASE = API_BASE;
})();

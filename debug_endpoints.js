// Script para debuggear qué endpoint está causando el error
// Ejecutar en la consola del navegador después de iniciar sesión

console.log('🔍 Iniciando debug de endpoints...');

// Interceptar todas las llamadas fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    console.log('🌐 Fetch interceptado:', url);
    
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('📡 Respuesta recibida:', url, response.status, response.statusText);
            
            if (!response.ok) {
                console.error('❌ Error en endpoint:', url, response.status, response.statusText);
                
                // Clonar la respuesta para leer el contenido sin consumirla
                response.clone().text().then(text => {
                    console.error('📄 Contenido del error:', text);
                });
            }
            
            return response;
        })
        .catch(error => {
            console.error('💥 Error de red:', url, error);
            throw error;
        });
};

// Interceptar XMLHttpRequest también
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    this._method = method;
    console.log('🌐 XHR interceptado:', method, url);
    return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;
    
    xhr.addEventListener('load', function() {
        console.log('📡 XHR respuesta:', xhr._method, xhr._url, xhr.status, xhr.statusText);
        
        if (!xhr.ok) {
            console.error('❌ Error en XHR:', xhr._method, xhr._url, xhr.status, xhr.statusText);
            console.error('📄 Contenido del error:', xhr.responseText);
        }
    });
    
    xhr.addEventListener('error', function() {
        console.error('💥 Error de red XHR:', xhr._method, xhr._url);
    });
    
    return originalXHRSend.apply(this, args);
};

console.log('✅ Interceptores configurados. Ahora recarga la página para ver qué endpoints fallan.');

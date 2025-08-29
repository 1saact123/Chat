#!/bin/bash

echo "🔍 === VERIFICACIÓN RÁPIDA DE NGINX ===\n"

# Verificar estado
echo "📊 Estado de nginx:"
systemctl is-active nginx && echo "✅ Activo" || echo "❌ Inactivo"

echo -e "\n🔍 Últimos 10 errores de nginx:"
if [ -f /var/log/nginx/error.log ]; then
    sudo tail -10 /var/log/nginx/error.log
else
    echo "❌ No se encontró error.log"
fi

echo -e "\n📋 Últimos 5 accesos:"
if [ -f /var/log/nginx/access.log ]; then
    sudo tail -5 /var/log/nginx/access.log
else
    echo "❌ No se encontró access.log"
fi

echo -e "\n🔍 Buscando errores de conexión:"
sudo grep -i "connection refused\|502\|500" /var/log/nginx/error.log | tail -3

echo -e "\n🌐 Verificando puertos:"
netstat -tlnp | grep -E ":80|:443|:3000"

#!/bin/bash

echo "🔍 === VERIFICACIÓN DE LOGS ===\n"

# Verificar si el proceso Node.js está ejecutándose
echo "1️⃣ Verificando proceso Node.js..."
if pgrep -f "node.*app.ts" > /dev/null; then
    echo "✅ Proceso Node.js está ejecutándose"
    ps aux | grep "node.*app.ts" | grep -v grep
else
    echo "❌ Proceso Node.js NO está ejecutándose"
fi

echo -e "\n2️⃣ Verificando puerto 3000..."
if netstat -tlnp | grep :3000 > /dev/null; then
    echo "✅ Puerto 3000 está en uso"
    netstat -tlnp | grep :3000
else
    echo "❌ Puerto 3000 NO está en uso"
fi

echo -e "\n3️⃣ Verificando logs de nginx..."
if [ -f "/var/log/nginx/chat.movonte.com.error.log" ]; then
    echo "📋 Últimas 10 líneas del error log de nginx:"
    tail -10 /var/log/nginx/chat.movonte.com.error.log
else
    echo "❌ Archivo de error log de nginx no encontrado"
fi

if [ -f "/var/log/nginx/chat.movonte.com.access.log" ]; then
    echo -e "\n📋 Últimas 10 líneas del access log de nginx:"
    tail -10 /var/log/nginx/chat.movonte.com.access.log
else
    echo "❌ Archivo de access log de nginx no encontrado"
fi

echo -e "\n4️⃣ Verificando logs de la aplicación..."
if [ -f "/var/log/app.log" ]; then
    echo "📋 Últimas 10 líneas del log de la aplicación:"
    tail -10 /var/log/app.log
else
    echo "ℹ️  Archivo de log de la aplicación no encontrado (puede estar en stdout)"
fi

echo -e "\n5️⃣ Verificando conectividad..."
echo "🔗 Probando conexión a https://chat.movonte.com/api/webhook/jira..."
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" https://chat.movonte.com/api/webhook/jira

echo -e "\n6️⃣ Verificando configuración de nginx..."
nginx -t

echo -e "\n✅ Verificación completada"

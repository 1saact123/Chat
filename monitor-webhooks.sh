#!/bin/bash

echo "🔍 === MONITOREO DE WEBHOOKS EN TIEMPO REAL ===\n"
echo "Presiona Ctrl+C para detener el monitoreo"
echo ""

# Función para limpiar al salir
cleanup() {
    echo -e "\n🛑 Monitoreo detenido"
    exit 0
}

trap cleanup SIGINT

# Monitorear logs del sistema en tiempo real
echo "📋 Monitoreando logs del sistema..."
echo "🔍 Buscando eventos relacionados con webhooks, chatbot y Node.js..."
echo ""

# Monitorear múltiples fuentes de logs
sudo tail -f /var/log/syslog /var/log/nginx/error.log /var/log/nginx/access.log 2>/dev/null | grep --line-buffered -i "webhook\|chatbot\|node\|jira\|openai\|error\|exception" | while read line; do
    timestamp=$(date '+%H:%M:%S')
    echo "[$timestamp] $line"
done

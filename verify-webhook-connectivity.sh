#!/bin/bash

echo "🔍 === VERIFICACIÓN DE CONECTIVIDAD DEL WEBHOOK ===\n"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Verificar DNS
echo "1️⃣ VERIFICANDO DNS"
print_info "Resolviendo chat.movonte.com..."
DNS_RESULT=$(nslookup chat.movonte.com 2>&1)
if echo "$DNS_RESULT" | grep -q "NXDOMAIN"; then
    print_status 1 "DNS no resuelve chat.movonte.com"
    echo "$DNS_RESULT"
else
    print_status 0 "DNS resuelve correctamente"
    echo "$DNS_RESULT" | grep "Address:"
fi

# 2. Verificar conectividad HTTPS
echo -e "\n2️⃣ VERIFICANDO CONECTIVIDAD HTTPS"
print_info "Probando conexión HTTPS a chat.movonte.com..."
HTTPS_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://chat.movonte.com/api/webhook/jira)
if [ "$HTTPS_TEST" = "200" ]; then
    print_status 0 "HTTPS funciona correctamente (Status: $HTTPS_TEST)"
else
    print_status 1 "HTTPS no funciona (Status: $HTTPS_TEST)"
fi

# 3. Verificar certificado SSL
echo -e "\n3️⃣ VERIFICANDO CERTIFICADO SSL"
print_info "Verificando certificado SSL..."
SSL_TEST=$(echo | openssl s_client -connect chat.movonte.com:443 -servername chat.movonte.com 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    print_status 0 "Certificado SSL válido"
    echo "$SSL_TEST"
else
    print_status 1 "Problema con certificado SSL"
fi

# 4. Verificar puertos locales
echo -e "\n4️⃣ VERIFICANDO PUERTOS LOCALES"
print_info "Verificando puerto 3000..."
if netstat -tlnp | grep :3000 > /dev/null; then
    print_status 0 "Puerto 3000 está abierto"
    netstat -tlnp | grep :3000
else
    print_status 1 "Puerto 3000 NO está abierto"
fi

print_info "Verificando puerto 443..."
if netstat -tlnp | grep :443 > /dev/null; then
    print_status 0 "Puerto 443 está abierto"
    netstat -tlnp | grep :443
else
    print_status 1 "Puerto 443 NO está abierto"
fi

# 5. Verificar firewall
echo -e "\n5️⃣ VERIFICANDO FIREWALL"
if command -v ufw > /dev/null; then
    UFW_STATUS=$(sudo ufw status | grep "Status")
    if [[ "$UFW_STATUS" == *"active"* ]]; then
        print_warning "UFW está activo"
        echo "Reglas actuales:"
        sudo ufw status numbered
    else
        print_status 0 "UFW está inactivo"
    fi
else
    print_info "UFW no está instalado"
fi

# 6. Verificar logs de nginx
echo -e "\n6️⃣ VERIFICANDO LOGS DE NGINX"
if [ -f "/var/log/nginx/chat_movonte_access.log" ]; then
    print_status 0 "Log de acceso encontrado"
    echo "Últimas 10 peticiones:"
    tail -10 /var/log/nginx/chat_movonte_access.log | grep -E "(POST|GET)" | tail -5
else
    print_status 1 "Log de acceso no encontrado"
fi

if [ -f "/var/log/nginx/chat_movonte_error.log" ]; then
    print_status 0 "Log de errores encontrado"
    echo "Últimos errores:"
    tail -5 /var/log/nginx/chat_movonte_error.log
else
    print_status 1 "Log de errores no encontrado"
fi

# 7. Verificar proceso de la aplicación
echo -e "\n7️⃣ VERIFICANDO PROCESO DE LA APLICACIÓN"
if pgrep -f "node.*app.ts" > /dev/null; then
    print_status 0 "Aplicación Node.js está ejecutándose"
    ps aux | grep "node.*app.ts" | grep -v grep
else
    print_status 1 "Aplicación Node.js NO está ejecutándose"
fi

# 8. Probar webhook localmente
echo -e "\n8️⃣ PROBANDO WEBHOOK LOCALMENTE"
print_info "Enviando petición POST al webhook local..."
TEST_PAYLOAD='{"webhookEvent":"comment_created","issue":{"key":"TEST-123"},"comment":{"body":"Test comment"}}'
LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$TEST_PAYLOAD" http://localhost:3000/api/webhook/jira)
if [ "$LOCAL_TEST" = "200" ]; then
    print_status 0 "Webhook local funciona (Status: $LOCAL_TEST)"
else
    print_status 1 "Webhook local no funciona (Status: $LOCAL_TEST)"
fi

# 9. Verificar configuración de nginx
echo -e "\n9️⃣ VERIFICANDO CONFIGURACIÓN DE NGINX"
if nginx -t > /dev/null 2>&1; then
    print_status 0 "Configuración de nginx válida"
else
    print_status 1 "Error en configuración de nginx"
    nginx -t
fi

# 10. Resumen y recomendaciones
echo -e "\n📋 RESUMEN Y RECOMENDACIONES"

# Contar problemas
PROBLEMS=0
if ! nslookup chat.movonte.com > /dev/null 2>&1; then PROBLEMS=$((PROBLEMS + 1)); fi
if [ "$HTTPS_TEST" != "200" ]; then PROBLEMS=$((PROBLEMS + 1)); fi
if ! netstat -tlnp | grep :3000 > /dev/null; then PROBLEMS=$((PROBLEMS + 1)); fi
if ! pgrep -f "node.*app.ts" > /dev/null; then PROBLEMS=$((PROBLEMS + 1)); fi

if [ $PROBLEMS -eq 0 ]; then
    echo -e "${GREEN}🎉 TODO FUNCIONA CORRECTAMENTE${NC}"
    echo "   El problema está en la configuración del webhook en Jira"
    echo -e "\n📋 PRÓXIMOS PASOS:"
    echo "   1. Verificar configuración del webhook en Jira"
    echo "   2. Crear un nuevo webhook de prueba"
    echo "   3. Verificar que el evento 'Comment created' esté habilitado"
    echo "   4. Probar con webhook.site para confirmar"
else
    echo -e "${RED}⚠️  SE DETECTARON $PROBLEMS PROBLEMAS${NC}"
    echo "   Revisa los puntos marcados con ❌ arriba"
    echo -e "\n📋 PRÓXIMOS PASOS:"
    echo "   1. Solucionar los problemas identificados"
    echo "   2. Reiniciar servicios si es necesario"
    echo "   3. Ejecutar este script nuevamente"
fi

echo -e "\n🔍 PARA DEBUGGING ADICIONAL:"
echo "   - Ver logs en tiempo real: sudo tail -f /var/log/nginx/chat_movonte_access.log"
echo "   - Ver logs de la aplicación: pm2 logs (si usas PM2)"
echo "   - Probar con webhook.site para confirmar que Jira envía webhooks"

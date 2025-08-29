#!/bin/bash

echo "🔍 === DIAGNÓSTICO DE LOGS DE NGINX ===\n"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Verificar estado de nginx
echo -e "${BLUE}1️⃣ Verificando estado de nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ nginx está ejecutándose${NC}"
    systemctl status nginx --no-pager -l
else
    echo -e "${RED}❌ nginx NO está ejecutándose${NC}"
    echo "Intentando iniciar nginx..."
    sudo systemctl start nginx
fi

echo -e "\n${BLUE}2️⃣ Verificando configuración de nginx...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuración de nginx es válida${NC}"
else
    echo -e "${RED}❌ Error en la configuración de nginx${NC}"
    exit 1
fi

# 3. Verificar puertos
echo -e "\n${BLUE}3️⃣ Verificando puertos...${NC}"
echo "Puerto 80 (HTTP):"
if netstat -tlnp | grep :80; then
    echo -e "${GREEN}✅ Puerto 80 está abierto${NC}"
else
    echo -e "${RED}❌ Puerto 80 NO está abierto${NC}"
fi

echo -e "\nPuerto 443 (HTTPS):"
if netstat -tlnp | grep :443; then
    echo -e "${GREEN}✅ Puerto 443 está abierto${NC}"
else
    echo -e "${RED}❌ Puerto 443 NO está abierto${NC}"
fi

echo -e "\nPuerto 3000 (Node.js):"
if netstat -tlnp | grep :3000; then
    echo -e "${GREEN}✅ Puerto 3000 está abierto${NC}"
else
    echo -e "${RED}❌ Puerto 3000 NO está abierto${NC}"
fi

# 4. Revisar logs de error de nginx
echo -e "\n${BLUE}4️⃣ Últimos errores de nginx (últimas 20 líneas)...${NC}"
if [ -f /var/log/nginx/error.log ]; then
    echo -e "${YELLOW}📋 /var/log/nginx/error.log:${NC}"
    sudo tail -20 /var/log/nginx/error.log
else
    echo -e "${RED}❌ Archivo /var/log/nginx/error.log no encontrado${NC}"
fi

# 5. Revisar logs de acceso de nginx
echo -e "\n${BLUE}5️⃣ Últimos accesos a nginx (últimas 10 líneas)...${NC}"
if [ -f /var/log/nginx/access.log ]; then
    echo -e "${YELLOW}📋 /var/log/nginx/access.log:${NC}"
    sudo tail -10 /var/log/nginx/access.log
else
    echo -e "${RED}❌ Archivo /var/log/nginx/access.log no encontrado${NC}"
fi

# 6. Revisar logs específicos de chat.movonte.com
echo -e "\n${BLUE}6️⃣ Logs específicos de chat.movonte.com...${NC}"
if [ -f /var/log/nginx/chat_movonte_error.log ]; then
    echo -e "${YELLOW}📋 /var/log/nginx/chat_movonte_error.log:${NC}"
    sudo tail -15 /var/log/nginx/chat_movonte_error.log
else
    echo -e "${YELLOW}ℹ️  No hay logs específicos de chat.movonte.com${NC}"
fi

if [ -f /var/log/nginx/chat_movonte_access.log ]; then
    echo -e "${YELLOW}📋 /var/log/nginx/chat_movonte_access.log:${NC}"
    sudo tail -10 /var/log/nginx/chat_movonte_access.log
fi

# 7. Buscar errores específicos de webhook
echo -e "\n${BLUE}7️⃣ Buscando errores específicos de webhook...${NC}"
echo -e "${YELLOW}🔍 Buscando 'webhook' en logs de error:${NC}"
sudo grep -i "webhook" /var/log/nginx/error.log | tail -5

echo -e "\n${YELLOW}🔍 Buscando '500' en logs de error:${NC}"
sudo grep -i "500" /var/log/nginx/error.log | tail -5

echo -e "\n${YELLOW}🔍 Buscando '502' en logs de error:${NC}"
sudo grep -i "502" /var/log/nginx/error.log | tail -5

echo -e "\n${YELLOW}🔍 Buscando 'connection refused' en logs de error:${NC}"
sudo grep -i "connection refused" /var/log/nginx/error.log | tail -5

# 8. Verificar configuración de proxy
echo -e "\n${BLUE}8️⃣ Verificando configuración de proxy...${NC}"
echo -e "${YELLOW}📋 Configuración actual de nginx:${NC}"
sudo nginx -T | grep -A 10 -B 5 "proxy_pass"

# 9. Probar conectividad interna
echo -e "\n${BLUE}9️⃣ Probando conectividad interna...${NC}"
echo "Probando conexión desde nginx a Node.js (localhost:3000):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health; then
    echo -e "${GREEN}✅ Node.js responde en localhost:3000${NC}"
else
    echo -e "${RED}❌ Node.js NO responde en localhost:3000${NC}"
fi

# 10. Verificar certificados SSL
echo -e "\n${BLUE}🔟 Verificando certificados SSL...${NC}"
if [ -f /etc/letsencrypt/live/chat.movonte.com/fullchain.pem ]; then
    echo -e "${GREEN}✅ Certificado SSL encontrado${NC}"
    echo "Fecha de expiración:"
    openssl x509 -in /etc/letsencrypt/live/chat.movonte.com/fullchain.pem -noout -dates
else
    echo -e "${RED}❌ Certificado SSL NO encontrado${NC}"
fi

echo -e "\n${BLUE}📊 RESUMEN DEL DIAGNÓSTICO:${NC}"
echo "Si ves errores de 'connection refused' o '502 Bad Gateway',"
echo "el problema está en la comunicación entre nginx y Node.js."
echo ""
echo "Si ves errores de '404 Not Found', el problema está en las rutas."
echo ""
echo "Si no ves errores, el problema podría estar en:"
echo "- Configuración de Jira webhook"
echo "- Firewall"
echo "- DNS"

echo -e "\n${YELLOW}💡 PRÓXIMOS PASOS:${NC}"
echo "1. Si hay errores de conexión, ejecuta: ./restart-server-fix.sh"
echo "2. Si hay errores de configuración, revisa: sudo nano /etc/nginx/sites-available/chat.movonte.com"
echo "3. Si no hay errores, el problema está en Jira"

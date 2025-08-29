#!/bin/bash

echo "🔍 === DIAGNÓSTICO DE WEBHOOKS DEL CHATBOT ===\n"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar que el servidor esté ejecutándose
echo -e "${BLUE}1️⃣ Verificando servidor Node.js...${NC}"
if pgrep -f "node.*app.js" > /dev/null; then
    echo -e "${GREEN}✅ Servidor Node.js ejecutándose${NC}"
    ps aux | grep "node.*app.js" | grep -v grep
else
    echo -e "${RED}❌ Servidor Node.js NO está ejecutándose${NC}"
    exit 1
fi

# 2. Verificar puerto 3000
echo -e "\n${BLUE}2️⃣ Verificando puerto 3000...${NC}"
if netstat -tlnp | grep :3000 > /dev/null; then
    echo -e "${GREEN}✅ Puerto 3000 está abierto${NC}"
    netstat -tlnp | grep :3000
else
    echo -e "${RED}❌ Puerto 3000 NO está abierto${NC}"
    exit 1
fi

# 3. Probar endpoint de webhook localmente
echo -e "\n${BLUE}3️⃣ Probando endpoint de webhook localmente...${NC}"
echo "🔗 Probando http://localhost:3000/api/chatbot/webhook/jira..."

LOCAL_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/webhook_test_response.json http://localhost:3000/api/chatbot/webhook/jira)

if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint local responde correctamente${NC}"
    echo "Respuesta:"
    cat /tmp/webhook_test_response.json | jq '.' 2>/dev/null || cat /tmp/webhook_test_response.json
else
    echo -e "${RED}❌ Endpoint local NO responde correctamente (Status: $LOCAL_RESPONSE)${NC}"
    cat /tmp/webhook_test_response.json
fi

# 4. Probar endpoint externo
echo -e "\n${BLUE}4️⃣ Probando endpoint externo...${NC}"
echo "🔗 Probando https://chat.movonte.com/api/chatbot/webhook/jira..."

EXTERNAL_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/webhook_external_response.json https://chat.movonte.com/api/chatbot/webhook/jira)

if [ "$EXTERNAL_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint externo responde correctamente${NC}"
else
    echo -e "${RED}❌ Endpoint externo NO responde correctamente (Status: $EXTERNAL_RESPONSE)${NC}"
    cat /tmp/webhook_external_response.json
fi

# 5. Verificar logs del servidor
echo -e "\n${BLUE}5️⃣ Verificando logs del servidor...${NC}"
echo "📋 Últimas 10 líneas de logs (si están disponibles):"
if [ -f /var/log/syslog ]; then
    sudo tail -10 /var/log/syslog | grep -i "node\|webhook\|chatbot" || echo "No hay logs relevantes en syslog"
fi

# 6. Probar con un payload de prueba
echo -e "\n${BLUE}6️⃣ Probando con payload de Jira...${NC}"

TEST_PAYLOAD='{
  "webhookEvent": "comment_created",
  "comment": {
    "id": "999",
    "author": {
      "displayName": "Test User",
      "emailAddress": "test@example.com",
      "accountId": "test-account-id"
    },
    "body": "Test comment for chatbot",
    "created": "2025-08-28T16:32:16.202Z"
  },
  "issue": {
    "key": "BDM-61",
    "fields": {
      "summary": "Test Issue",
      "status": {
        "name": "Open"
      }
    }
  }
}'

echo "📦 Enviando payload de prueba..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" \
  -w "%{http_code}" \
  -o /tmp/webhook_test_payload_response.json \
  http://localhost:3000/api/chatbot/webhook/jira

PAYLOAD_STATUS=$?
if [ $PAYLOAD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ Payload enviado correctamente${NC}"
    echo "Respuesta:"
    cat /tmp/webhook_test_payload_response.json | jq '.' 2>/dev/null || cat /tmp/webhook_test_payload_response.json
else
    echo -e "${RED}❌ Error enviando payload${NC}"
fi

# 7. Verificar variables de entorno
echo -e "\n${BLUE}7️⃣ Verificando variables de entorno críticas...${NC}"
echo "🔑 OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "🔑 JIRA_BASE_URL: $JIRA_BASE_URL"
echo "🔑 JIRA_EMAIL: $JIRA_EMAIL"
echo "🔑 JIRA_API_TOKEN: ${JIRA_API_TOKEN:0:10}..."

# 8. Verificar archivos compilados
echo -e "\n${BLUE}8️⃣ Verificando archivos compilados...${NC}"
if [ -f "dist/controllers/chatbot_controller.js" ]; then
    echo -e "${GREEN}✅ Controller compilado existe${NC}"
else
    echo -e "${RED}❌ Controller compilado NO existe${NC}"
fi

if [ -f "dist/services/openAI_service.js" ]; then
    echo -e "${GREEN}✅ OpenAI service compilado existe${NC}"
else
    echo -e "${RED}❌ OpenAI service compilado NO existe${NC}"
fi

# 9. Verificar dependencias
echo -e "\n${BLUE}9️⃣ Verificando dependencias...${NC}"
if [ -f "node_modules/openai/package.json" ]; then
    echo -e "${GREEN}✅ OpenAI package instalado${NC}"
else
    echo -e "${RED}❌ OpenAI package NO instalado${NC}"
fi

# 10. Limpiar archivos temporales
rm -f /tmp/webhook_test_response.json /tmp/webhook_external_response.json /tmp/webhook_test_payload_response.json

echo -e "\n${BLUE}📊 RESUMEN DEL DIAGNÓSTICO:${NC}"
echo "Si el endpoint local responde pero el externo no, el problema está en nginx."
echo "Si ambos responden pero no procesa webhooks, el problema está en el código."
echo "Si hay errores de OpenAI, verifica la API key."
echo "Si hay errores de Jira, verifica las credenciales."

echo -e "\n${YELLOW}💡 PRÓXIMOS PASOS:${NC}"
echo "1. Revisa los logs del servidor en tiempo real: tail -f /var/log/syslog"
echo "2. Si hay errores de OpenAI, actualiza la API key en .env"
echo "3. Si hay errores de Jira, verifica las credenciales"
echo "4. Si el problema persiste, ejecuta: npm run build && npm start"

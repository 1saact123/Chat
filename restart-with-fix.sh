#!/bin/bash

echo "🔧 === REINICIANDO SERVIDOR CON CORRECCIÓN DE WEBHOOK ===\n"

# 1. Detener procesos existentes
echo "1️⃣ Deteniendo procesos existentes..."
if pgrep -f "node.*app.js" > /dev/null; then
    echo "🔄 Proceso Node.js encontrado, deteniendo..."
    pkill -f "node.*app.js"
    sleep 2
    echo "✅ Proceso detenido"
else
    echo "ℹ️  No hay procesos Node.js ejecutándose"
fi

# 2. Verificar que el puerto 3000 esté libre
echo -e "\n2️⃣ Verificando puerto 3000..."
if netstat -tlnp | grep :3000 > /dev/null; then
    echo "⚠️  Puerto 3000 aún en uso, forzando liberación..."
    sudo fuser -k 3000/tcp
    sleep 2
fi

# 3. Compilar TypeScript
echo -e "\n3️⃣ Compilando TypeScript..."
npx tsc
if [ $? -eq 0 ]; then
    echo "✅ Compilación exitosa"
else
    echo "❌ Error en la compilación"
    exit 1
fi

# 4. Iniciar el servidor
echo -e "\n4️⃣ Iniciando servidor con corrección de webhook..."
echo "🚀 Cambio aplicado: /api/webhook/jira ahora redirige al chatbot"
npm start &

# 5. Esperar que el servidor se inicie
echo -e "\n5️⃣ Esperando que el servidor se inicie..."
sleep 5

# 6. Verificar que el servidor esté ejecutándose
echo -e "\n6️⃣ Verificando que el servidor esté ejecutándose..."
if pgrep -f "node.*app.js" > /dev/null; then
    echo "✅ Servidor ejecutándose correctamente"
    ps aux | grep "node.*app.js" | grep -v grep
else
    echo "❌ El servidor no se inició correctamente"
    exit 1
fi

# 7. Probar el endpoint corregido
echo -e "\n7️⃣ Probando endpoint corregido..."
echo "🔗 Probando http://localhost:3000/api/webhook/jira..."

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

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" \
  http://localhost:3000/api/webhook/jira

echo -e "\n\n🎉 SERVIDOR REINICIADO CON CORRECCIÓN"
echo "📋 Cambios aplicados:"
echo "   - /api/webhook/jira ahora redirige al chatbot controller"
echo "   - Los webhooks de Jira serán procesados correctamente"
echo -e "\n📋 Próximos pasos:"
echo "   1. Pídele a Hernán que haga un comentario en Jira"
echo "   2. Verifica los logs del servidor"
echo "   3. Confirma que aparece: 'WEBHOOK RECIBIDO EN ENDPOINT DE PRUEBA - REDIRIGIENDO AL CHATBOT'"
echo "   4. Confirma que el chatbot procesa y responde"

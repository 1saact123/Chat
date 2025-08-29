#!/bin/bash

echo "🔧 === REINICIANDO SERVIDOR CON NUEVA CONFIGURACIÓN ===\n"

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

# 4. Iniciar el servidor con nueva configuración
echo -e "\n4️⃣ Iniciando servidor con nueva configuración..."
echo "🚀 Configuración: Escuchando en 0.0.0.0:3000 (todas las interfaces)"
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

# 7. Verificar que el puerto 3000 esté abierto
echo -e "\n7️⃣ Verificando puerto 3000..."
if netstat -tlnp | grep :3000 > /dev/null; then
    echo "✅ Puerto 3000 está abierto"
    netstat -tlnp | grep :3000
else
    echo "❌ Puerto 3000 NO está abierto"
    exit 1
fi

# 8. Probar conectividad local
echo -e "\n8️⃣ Probando conectividad local..."
echo "🔗 Probando http://localhost:3000/api/webhook/jira..."
LOCAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/webhook/jira)
if [ "$LOCAL_STATUS" = "200" ]; then
    echo "✅ Localhost:3000 responde correctamente"
else
    echo "❌ Localhost:3000 NO responde correctamente (Status: $LOCAL_STATUS)"
fi

# 9. Probar conectividad externa
echo -e "\n9️⃣ Probando conectividad externa..."
echo "🔗 Probando https://chat.movonte.com/api/webhook/jira..."
EXTERNAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://chat.movonte.com/api/webhook/jira)
if [ "$EXTERNAL_STATUS" = "200" ]; then
    echo "✅ HTTPS externo responde correctamente"
else
    echo "❌ HTTPS externo NO responde correctamente (Status: $EXTERNAL_STATUS)"
fi

echo -e "\n🎉 SERVIDOR REINICIADO CON NUEVA CONFIGURACIÓN"
echo "📋 Cambios aplicados:"
echo "   - Servidor ahora escucha en 0.0.0.0:3000 (todas las interfaces)"
echo "   - nginx puede hacer proxy correctamente"
echo "   - Webhooks de Jira deberían llegar ahora"
echo -e "\n📋 Próximos pasos:"
echo "   1. Pídele a Hernán que haga un comentario en Jira"
echo "   2. Verifica los logs del servidor"
echo "   3. Confirma que el webhook llega correctamente"

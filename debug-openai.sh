#!/bin/bash

echo "🔍 Debugging OpenAI Access Issue"
echo "================================"

# Verificar variables de entorno
echo "📋 Checking environment variables..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ ERROR: OPENAI_API_KEY no está configurada"
    echo "💡 Configura la variable de entorno antes de continuar"
    exit 1
else
    echo "✅ OPENAI_API_KEY está configurada"
fi

echo ""
echo "🔧 Compilando el proyecto..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Compilación exitosa"
    echo ""
    echo "🧪 Ejecutando diagnóstico de OpenAI..."
    node dist/tests/debug-openai-issue.js
else
    echo "❌ Error en la compilación"
    exit 1
fi

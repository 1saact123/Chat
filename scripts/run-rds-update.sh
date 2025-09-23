#!/bin/bash

# Script para ejecutar la actualización de RDS desde el servidor
# Uso: ./scripts/run-rds-update.sh

echo "🚀 Iniciando actualización de base de datos RDS..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta desde el directorio raíz del proyecto."
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f ".env" ]; then
    echo "❌ Error: No se encontró archivo .env"
    exit 1
fi

# Verificar que MySQL client está instalado
if ! command -v mysql &> /dev/null; then
    echo "❌ Error: MySQL client no está instalado"
    echo "Instalando MySQL client..."
    sudo apt-get update
    sudo apt-get install -y mysql-client
fi

# Compilar TypeScript si es necesario
echo "🔨 Compilando TypeScript..."
npm run build

# Ejecutar el script de actualización
echo "📊 Ejecutando actualización de RDS..."
npm run update-rds

echo "✅ Script de actualización completado"

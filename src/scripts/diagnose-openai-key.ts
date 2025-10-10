#!/usr/bin/env ts-node

/**
 * Script para diagnosticar la API Key de OpenAI
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function diagnoseOpenAIKey() {
  console.log('🔍 Diagnosticando API Key de OpenAI...\n');

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY no está configurada');
    return;
  }

  console.log(`📋 API Key: ${apiKey.substring(0, 10)}...`);

  // 1. Verificar formato de la API Key
  console.log('\n🔧 1. Verificando formato de API Key...');
  
  if (!apiKey.startsWith('sk-')) {
    console.log('❌ ERROR: La API Key no tiene el formato correcto');
    console.log('   Debe empezar con "sk-"');
    console.log(`   Tu API Key actual: ${apiKey.substring(0, 10)}...`);
    return;
  }

  if (apiKey.length < 50) {
    console.log('❌ ERROR: La API Key parece muy corta');
    console.log('   Las API Keys válidas suelen tener más de 50 caracteres');
    console.log(`   Tu API Key actual: ${apiKey.length} caracteres`);
    return;
  }

  console.log('✅ Formato de API Key correcto');

  // 2. Verificar conectividad básica
  console.log('\n🌐 2. Verificando conectividad con OpenAI API...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const models = await response.json() as any;
      console.log('✅ Conectividad con OpenAI API: OK');
      console.log(`📊 Modelos disponibles: ${models.data?.length || 0}`);
      
      // Verificar si hay modelos de ChatKit
      const chatkitModels = models.data?.filter((model: any) => 
        model.id.includes('chatkit') || model.id.includes('gpt-4')
      );
      
      if (chatkitModels && chatkitModels.length > 0) {
        console.log('✅ Modelos de ChatKit disponibles');
      } else {
        console.log('⚠️ No se encontraron modelos específicos de ChatKit');
      }
      
    } else {
      const error = await response.text();
      console.log(`❌ Error de conectividad: ${response.status}`);
      console.log(`   Detalles: ${error}`);
      
      if (response.status === 401) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO: API Key inválida');
        console.log('   Soluciones:');
        console.log('   1. Verifica que la API Key sea correcta');
        console.log('   2. Asegúrate de que no haya espacios extra');
        console.log('   3. Genera una nueva API Key en https://platform.openai.com/api-keys');
        return;
      }
      
      if (response.status === 403) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO: API Key sin permisos');
        console.log('   Soluciones:');
        console.log('   1. Verifica que tu cuenta tenga acceso a ChatKit');
        console.log('   2. Asegúrate de tener créditos disponibles');
        console.log('   3. Verifica que tu plan incluya ChatKit');
        return;
      }
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error}`);
    return;
  }

  // 3. Verificar permisos específicos de ChatKit
  console.log('\n🔧 3. Verificando permisos de ChatKit...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow: {
          id: 'wf_test'
        },
        user: 'test_user'
      })
    });

    if (response.ok) {
      console.log('✅ Permisos de ChatKit: OK');
    } else {
      const error = await response.text();
      console.log(`❌ Error con ChatKit: ${response.status}`);
      console.log(`   Detalles: ${error}`);
      
      if (response.status === 401) {
        console.log('\n🚨 PROBLEMA: API Key no tiene permisos para ChatKit');
        console.log('   Soluciones:');
        console.log('   1. Verifica que tu cuenta tenga acceso a ChatKit');
        console.log('   2. Asegúrate de que tu plan incluya ChatKit');
        console.log('   3. Contacta soporte de OpenAI si es necesario');
      }
    }
  } catch (error) {
    console.log(`❌ Error verificando ChatKit: ${error}`);
  }

  // 4. Verificar créditos y límites
  console.log('\n💰 4. Verificando créditos y límites...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/usage', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const usage = await response.json();
      console.log('✅ Información de uso disponible');
      console.log(`📊 Uso actual: ${JSON.stringify(usage, null, 2)}`);
    } else {
      console.log('⚠️ No se pudo obtener información de uso');
    }
  } catch (error) {
    console.log('⚠️ No se pudo verificar el uso');
  }

  console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
  console.log('============================');
  console.log('Si el starter oficial de OpenAI tampoco funciona,');
  console.log('el problema está en tu API Key o en tu cuenta de OpenAI.');
  console.log('\n💡 SOLUCIONES POSIBLES:');
  console.log('1. Verifica que la API Key sea correcta');
  console.log('2. Asegúrate de tener créditos disponibles');
  console.log('3. Verifica que tu plan incluya ChatKit');
  console.log('4. Genera una nueva API Key si es necesario');
  console.log('5. Contacta soporte de OpenAI si el problema persiste');
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnoseOpenAIKey();
}

export { diagnoseOpenAIKey };

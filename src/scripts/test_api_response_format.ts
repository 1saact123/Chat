import { sequelize } from '../config/database';
import { User } from '../models';

async function testApiResponseFormat() {
  try {
    console.log('🧪 === PROBANDO FORMATO DE RESPUESTA DE API ===\n');

    // 1. Simular getUserServiceConfigurations con mapeo
    console.log('1️⃣ Probando getUserServiceConfigurations con mapeo...');
    const userId = 1;
    
    const [configurations] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY service_name
    `, {
      replacements: [userId]
    });
    
    console.log(`📋 Configuraciones encontradas: ${configurations.length}`);
    
    // Mapear a camelCase como lo hace el controlador
    const mappedConfigs = (configurations as any[]).map((config: any) => ({
      serviceId: config.service_id,
      serviceName: config.service_name,
      assistantId: config.assistant_id,
      assistantName: config.assistant_name,
      isActive: Boolean(config.is_active),
      lastUpdated: config.last_updated,
      configuration: typeof config.configuration === 'string' 
        ? JSON.parse(config.configuration) 
        : config.configuration,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }));
    
    console.log('\n📦 Datos mapeados para el frontend:');
    mappedConfigs.forEach((config: any) => {
      console.log(`\n✅ Servicio: ${config.serviceName}`);
      console.log(`   - serviceId: ${config.serviceId}`);
      console.log(`   - assistantId: ${config.assistantId}`);
      console.log(`   - assistantName: ${config.assistantName}`);
      console.log(`   - isActive: ${config.isActive}`);
      console.log(`   - lastUpdated: ${config.lastUpdated}`);
      console.log(`   - configuration:`, JSON.stringify(config.configuration, null, 2));
    });

    // 2. Verificar que todos los campos requeridos están presentes
    console.log('\n2️⃣ Verificando campos requeridos...');
    const requiredFields = ['serviceId', 'serviceName', 'assistantId', 'assistantName', 'isActive', 'lastUpdated'];
    
    let allFieldsPresent = true;
    mappedConfigs.forEach((config: any, index: number) => {
      console.log(`\n📋 Verificando configuración ${index + 1}:`);
      requiredFields.forEach(field => {
        const hasField = config[field] !== undefined && config[field] !== null;
        const status = hasField ? '✅' : '❌';
        console.log(`   ${status} ${field}: ${config[field]}`);
        if (!hasField) allFieldsPresent = false;
      });
    });
    
    if (allFieldsPresent) {
      console.log('\n✅ Todos los campos requeridos están presentes');
    } else {
      console.log('\n❌ Faltan algunos campos requeridos');
    }

    // 3. Verificar formato de respuesta completa del dashboard
    console.log('\n3️⃣ Simulando respuesta completa del dashboard...');
    const dashboardResponse = {
      success: true,
      data: {
        assistants: [],
        projects: [],
        serviceConfigurations: mappedConfigs,
        totalAssistants: 0,
        totalProjects: 0,
        totalServices: mappedConfigs.length
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📦 Respuesta del dashboard:');
    console.log(JSON.stringify(dashboardResponse, null, 2));

    console.log('\n✅ === FORMATO DE RESPUESTA VERIFICADO ===');

  } catch (error) {
    console.error('❌ Error en prueba de formato:', error);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testApiResponseFormat().then(() => {
    console.log('\n🎯 === PRUEBA DE FORMATO COMPLETADA ===');
  }).catch(console.error);
}

export { testApiResponseFormat };



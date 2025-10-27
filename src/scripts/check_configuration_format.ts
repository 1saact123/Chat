import { sequelize } from '../config/database';

async function checkConfigurationFormat() {
  try {
    console.log('🔍 === VERIFICANDO FORMATO DEL CAMPO CONFIGURATION ===\n');

    const [rows] = await sequelize.query(`
      SELECT service_id, service_name, configuration
      FROM unified_configurations 
      WHERE service_id = 'landing-page'
    `);

    if (rows.length === 0) {
      console.log('❌ No se encontró el servicio landing-page');
      return;
    }

    const row: any = rows[0];
    
    console.log('📋 Servicio encontrado:');
    console.log(`   - service_id: ${row.service_id}`);
    console.log(`   - service_name: ${row.service_name}`);
    console.log(`   - configuration (raw):`, row.configuration);
    console.log(`   - typeof configuration: ${typeof row.configuration}`);
    
    if (typeof row.configuration === 'string') {
      console.log('\n✅ Configuration es STRING - parseando...');
      try {
        const parsed = JSON.parse(row.configuration);
        console.log('   Parsed:', parsed);
        console.log(`   projectKey: ${parsed.projectKey}`);
      } catch (e) {
        console.log('❌ Error al parsear:', e);
      }
    } else if (typeof row.configuration === 'object') {
      console.log('\n✅ Configuration es OBJECT - accediendo directamente...');
      console.log('   Object:', row.configuration);
      console.log(`   projectKey: ${row.configuration.projectKey}`);
    } else {
      console.log('\n⚠️ Configuration es de tipo desconocido');
    }

    // Verificar todos los servicios activos
    console.log('\n\n🔍 Verificando TODOS los servicios activos:\n');
    const [allRows] = await sequelize.query(`
      SELECT service_id, service_name, configuration
      FROM unified_configurations 
      WHERE is_active = TRUE
    `);

    (allRows as any[]).forEach((service: any, index: number) => {
      console.log(`\n${index + 1}. ${service.service_name}:`);
      console.log(`   - typeof configuration: ${typeof service.configuration}`);
      
      if (typeof service.configuration === 'string') {
        try {
          const parsed = JSON.parse(service.configuration);
          console.log(`   - Parsed projectKey: ${parsed.projectKey || 'No tiene'}`);
        } catch (e) {
          console.log(`   - Error parseando: ${e}`);
        }
      } else if (typeof service.configuration === 'object' && service.configuration) {
        console.log(`   - Direct projectKey: ${service.configuration.projectKey || 'No tiene'}`);
      } else {
        console.log(`   - Configuration: ${service.configuration}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  checkConfigurationFormat().then(() => {
    console.log('\n✅ Verificación completada');
  }).catch(console.error);
}

export { checkConfigurationFormat };



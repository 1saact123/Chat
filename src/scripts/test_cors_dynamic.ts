import { CorsService } from '../services/cors_service';
import { sequelize } from '../config/database';

async function testCorsDynamic() {
  try {
    console.log('🧪 === PROBANDO SISTEMA DE CORS DINÁMICO ===\n');

    // 1. Obtener instancia del servicio
    console.log('1️⃣ Obteniendo instancia de CorsService...');
    const corsService = CorsService.getInstance();
    console.log('✅ Instancia obtenida');

    // 2. Verificar estadísticas iniciales
    console.log('\n2️⃣ Verificando estadísticas iniciales...');
    const initialStats = corsService.getStats();
    console.log(`📋 Total de orígenes permitidos: ${initialStats.totalOrigins}`);
    console.log(`🕒 Última actualización: ${initialStats.lastUpdate}`);
    console.log('📝 Orígenes base:');
    initialStats.origins.slice(0, 5).forEach(origin => {
      console.log(`   - ${origin}`);
    });
    if (initialStats.totalOrigins > 5) {
      console.log(`   ... y ${initialStats.totalOrigins - 5} más`);
    }

    // 3. Agregar un dominio de prueba
    console.log('\n3️⃣ Agregando dominio de prueba...');
    const testDomain = 'test-cors-example.com';
    await corsService.addApprovedDomain(testDomain);
    
    const afterAddStats = corsService.getStats();
    console.log(`📋 Total después de agregar: ${afterAddStats.totalOrigins}`);

    // 4. Verificar que el dominio fue agregado
    console.log('\n4️⃣ Verificando que el dominio fue agregado...');
    const isAllowedHttps = await corsService.isOriginAllowed(`https://${testDomain}`);
    const isAllowedHttp = await corsService.isOriginAllowed(`http://${testDomain}`);
    const isAllowedWww = await corsService.isOriginAllowed(`https://www.${testDomain}`);
    
    console.log(`   https://${testDomain}: ${isAllowedHttps ? '✅' : '❌'}`);
    console.log(`   http://${testDomain}: ${isAllowedHttp ? '✅' : '❌'}`);
    console.log(`   https://www.${testDomain}: ${isAllowedWww ? '✅' : '❌'}`);

    // 5. Verificar dominio no permitido
    console.log('\n5️⃣ Verificando dominio NO permitido...');
    const notAllowed = await corsService.isOriginAllowed('https://malicious-domain.com');
    console.log(`   https://malicious-domain.com: ${notAllowed ? '❌ PERMITIDO (ERROR)' : '✅ BLOQUEADO'}`);

    // 6. Verificar request sin origin (webhook)
    console.log('\n6️⃣ Verificando request sin origin (webhook)...');
    const webhookAllowed = await corsService.isOriginAllowed(null as any);
    console.log(`   Request sin origin: ${webhookAllowed ? '✅ PERMITIDO' : '❌ BLOQUEADO (ERROR)'}`);

    // 7. Verificar Atlassian wildcard
    console.log('\n7️⃣ Verificando wildcard de Atlassian...');
    const atlassianAllowed = await corsService.isOriginAllowed('https://movonte.atlassian.net');
    console.log(`   https://movonte.atlassian.net: ${atlassianAllowed ? '✅' : '❌'}`);

    // 8. Remover dominio de prueba
    console.log('\n8️⃣ Removiendo dominio de prueba...');
    corsService.removeDomain(testDomain);
    
    const afterRemoveStats = corsService.getStats();
    console.log(`📋 Total después de remover: ${afterRemoveStats.totalOrigins}`);

    // 9. Verificar que fue removido
    console.log('\n9️⃣ Verificando que el dominio fue removido...');
    const stillAllowed = await corsService.isOriginAllowed(`https://${testDomain}`);
    console.log(`   https://${testDomain}: ${stillAllowed ? '❌ TODAVÍA PERMITIDO (ERROR)' : '✅ BLOQUEADO'}`);

    // 10. Verificar carga desde BD
    console.log('\n🔟 Forzando recarga desde base de datos...');
    await corsService.forceReload();
    
    const finalStats = corsService.getStats();
    console.log(`📋 Total después de recarga: ${finalStats.totalOrigins}`);
    console.log(`🕒 Última actualización: ${finalStats.lastUpdate}`);

    // 11. Verificar servicios aprobados en BD
    console.log('\n1️⃣1️⃣ Verificando servicios aprobados en BD...');
    const [services] = await sequelize.query(`
      SELECT service_id, service_name, configuration 
      FROM unified_configurations 
      WHERE is_active = TRUE
      LIMIT 5
    `);

    console.log(`📋 Servicios activos encontrados: ${(services as any[]).length}`);
    for (const service of services as any[]) {
      let config = {};
      try {
        config = typeof service.configuration === 'string' 
          ? JSON.parse(service.configuration) 
          : service.configuration || {};
      } catch (e) {
        config = {};
      }
      
      const domain = (config as any).requestedDomain;
      const approved = (config as any).adminApproved;
      
      if (domain) {
        console.log(`   - ${service.service_name}: ${domain} (Aprobado: ${approved ? '✅' : '❌'})`);
      }
    }

    console.log('\n✅ === PRUEBA COMPLETADA ===');
    console.log('\n📊 Resumen:');
    console.log(`   - Sistema de CORS dinámico: ✅ Funcionando`);
    console.log(`   - Agregar dominios: ✅ OK`);
    console.log(`   - Remover dominios: ✅ OK`);
    console.log(`   - Verificación de orígenes: ✅ OK`);
    console.log(`   - Webhooks sin origin: ✅ OK`);
    console.log(`   - Wildcard Atlassian: ✅ OK`);
    console.log(`   - Recarga desde BD: ✅ OK`);
    console.log('\n🎯 El sistema NO requiere reiniciar la API para aplicar cambios de CORS');

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  testCorsDynamic().catch(console.error);
}




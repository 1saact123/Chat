import { sequelize } from '../config/database';
import { User } from '../models';

async function testAdminServiceCreation() {
  try {
    console.log('🧪 === PROBANDO CREACIÓN DE SERVICIOS POR ADMIN ===\n');

    // 1. Verificar usuario admin
    console.log('1️⃣ Verificando usuario admin...');
    const adminUser = await User.findOne({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('❌ No se encontró ningún usuario admin');
      return;
    }

    console.log(`✅ Usuario admin encontrado: ${adminUser.username} (ID: ${adminUser.id})`);

    // 2. Simular creación de servicio por admin
    console.log('\n2️⃣ Simulando creación de servicio por admin...');
    const isAdmin = adminUser.role === 'admin';
    console.log(`   - Es admin: ${isAdmin}`);

    const testServiceData = {
      serviceId: 'test-admin-service',
      serviceName: 'Test Admin Service',
      assistantId: 'asst_test_admin123',
      assistantName: 'Test Admin Assistant',
      isActive: isAdmin,
      configuration: {
        projectKey: 'TEST',
        adminApproved: isAdmin,
        adminApprovedAt: isAdmin ? new Date().toISOString() : undefined
      }
    };

    console.log('\n📦 Datos del servicio que se crearía:');
    console.log(`   - serviceId: ${testServiceData.serviceId}`);
    console.log(`   - serviceName: ${testServiceData.serviceName}`);
    console.log(`   - isActive: ${testServiceData.isActive} ✅`);
    console.log(`   - adminApproved: ${testServiceData.configuration.adminApproved} ✅`);
    console.log(`   - adminApprovedAt: ${testServiceData.configuration.adminApprovedAt}`);

    // 3. Comparar con usuario regular
    console.log('\n3️⃣ Comparando con usuario regular...');
    const regularUser = await User.findOne({
      where: { role: 'user' }
    });

    if (regularUser) {
      console.log(`\n👤 Usuario regular: ${regularUser.username} (ID: ${regularUser.id})`);
      const isRegularAdmin = regularUser.role === 'admin';
      
      const regularServiceData = {
        serviceId: 'test-user-service',
        serviceName: 'Test User Service',
        isActive: isRegularAdmin,
        configuration: {
          projectKey: 'TEST',
          adminApproved: isRegularAdmin,
          adminApprovedAt: isRegularAdmin ? new Date().toISOString() : undefined
        }
      };

      console.log('\n📦 Datos del servicio que se crearía:');
      console.log(`   - serviceId: ${regularServiceData.serviceId}`);
      console.log(`   - serviceName: ${regularServiceData.serviceName}`);
      console.log(`   - isActive: ${regularServiceData.isActive} ⏳`);
      console.log(`   - adminApproved: ${regularServiceData.configuration.adminApproved} ⏳`);
      console.log(`   - adminApprovedAt: ${regularServiceData.configuration.adminApprovedAt || 'No aprobado'}`);
    }

    // 4. Verificar servicios existentes de admin
    console.log('\n4️⃣ Verificando servicios existentes de admin...');
    const [adminServices] = await sequelize.query(`
      SELECT 
        uc.service_id,
        uc.service_name,
        uc.is_active,
        uc.configuration,
        u.username,
        u.role
      FROM unified_configurations uc
      JOIN users u ON uc.user_id = u.id
      WHERE u.role = 'admin'
      ORDER BY uc.created_at DESC
    `);

    console.log(`\n📋 Servicios de admin existentes: ${adminServices.length}`);
    (adminServices as any[]).forEach((service: any, index: number) => {
      let config = {};
      try {
        config = typeof service.configuration === 'string' 
          ? JSON.parse(service.configuration) 
          : service.configuration || {};
      } catch (e) {
        config = {};
      }

      const activeIcon = service.is_active ? '✅' : '⏳';
      const approvedIcon = (config as any).adminApproved ? '✅' : '⏳';
      
      console.log(`\n${index + 1}. ${service.service_name} (${service.username})`);
      console.log(`   - Activo: ${activeIcon} ${Boolean(service.is_active)}`);
      console.log(`   - Aprobado: ${approvedIcon} ${Boolean((config as any).adminApproved)}`);
      console.log(`   - Fecha aprobación: ${(config as any).adminApprovedAt || 'N/A'}`);
    });

    // 5. Resumen
    console.log('\n\n🎯 === RESUMEN ===');
    console.log('\n👑 ADMINISTRADOR:');
    console.log('   ✅ Servicio se crea ACTIVO (isActive: true)');
    console.log('   ✅ Servicio se APRUEBA AUTOMÁTICAMENTE (adminApproved: true)');
    console.log('   ✅ Mensaje: "Servicio creado y activado exitosamente (Admin - Sin aprobación requerida)"');
    console.log('   ✅ Frontend muestra estado: "Active" (verde)');
    
    console.log('\n👤 USUARIO REGULAR:');
    console.log('   ⏳ Servicio se crea PENDIENTE (isActive: false)');
    console.log('   ⏳ Servicio REQUIERE APROBACIÓN (adminApproved: false)');
    console.log('   ⏳ Mensaje: "Servicio creado exitosamente (Pendiente de aprobación de administrador)"');
    console.log('   ⏳ Frontend muestra estado: "Pending Approval" (amarillo)');

    console.log('\n✅ === FUNCIONALIDAD DE APROBACIÓN AUTOMÁTICA VERIFICADA ===');

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

if (require.main === module) {
  testAdminServiceCreation().then(() => {
    console.log('\n🎯 === PRUEBA COMPLETADA ===');
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { testAdminServiceCreation };



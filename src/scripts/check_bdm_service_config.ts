import { DatabaseService } from '../services/database_service';
import { UserConfiguration } from '../models';
import { Op } from 'sequelize';

async function checkBDMServiceConfig() {
  try {
    console.log('🔍 === VERIFICANDO CONFIGURACIÓN DEL SERVICIO BDM ===\n');

    const dbService = DatabaseService.getInstance();
    
    // Buscar el servicio BDM en la base de datos
    console.log('1️⃣ Buscando servicio BDM en UserConfiguration...');
    
    const bdmService = await UserConfiguration.findOne({
      where: {
        serviceId: 'bdm-service'
      }
    });

    if (!bdmService) {
      console.log('❌ No se encontró el servicio BDM en UserConfiguration');
      
      // Buscar servicios similares
      console.log('\n🔍 Buscando servicios similares...');
      const similarServices = await UserConfiguration.findAll({
        where: {
          serviceId: {
            [Op.like]: '%bdm%'
          }
        }
      });
      
      if (similarServices.length > 0) {
        console.log('📋 Servicios similares encontrados:');
        similarServices.forEach(service => {
          console.log(`   - ${service.serviceId} (${service.isActive ? 'Activo' : 'Inactivo'})`);
        });
      } else {
        console.log('❌ No se encontraron servicios similares');
      }
      
      return;
    }

    console.log('✅ Servicio BDM encontrado:');
    console.log(`   Service ID: ${bdmService.serviceId}`);
    console.log(`   Service Name: ${bdmService.serviceName}`);
    console.log(`   User ID: ${bdmService.userId}`);
    console.log(`   Is Active: ${bdmService.isActive}`);
    console.log(`   Created At: ${bdmService.createdAt}`);
    console.log(`   Updated At: ${bdmService.updatedAt}`);
    
    // Verificar configuración
    console.log('\n2️⃣ Verificando configuración del servicio...');
    if (bdmService.configuration) {
      console.log('📋 Configuración actual:');
      console.log(JSON.stringify(bdmService.configuration, null, 2));
      
      const config = bdmService.configuration as any;
      
      if (config.assistantId) {
        console.log(`✅ Assistant ID configurado: ${config.assistantId}`);
      } else {
        console.log('❌ No hay Assistant ID configurado');
      }
      
      if (config.assistantName) {
        console.log(`✅ Assistant Name: ${config.assistantName}`);
      } else {
        console.log('❌ No hay Assistant Name configurado');
      }
      
      if (config.projectKey) {
        console.log(`✅ Project Key: ${config.projectKey}`);
      } else {
        console.log('❌ No hay Project Key configurado');
      }
      
    } else {
      console.log('❌ No hay configuración almacenada');
    }

    // Verificar si el usuario tiene tokens configurados
    console.log('\n3️⃣ Verificando usuario...');
    const { User } = await import('../models');
    const user = await User.findByPk(bdmService.userId);
    
    if (user) {
      console.log(`✅ Usuario encontrado: ${user.email}`);
      console.log(`   OpenAI Token: ${user.openaiToken ? 'Configurado' : 'No configurado'}`);
      console.log(`   Jira Token: ${user.jiraToken ? 'Configurado' : 'No configurado'}`);
      console.log(`   Jira URL: ${(user as any).jiraUrl || 'No configurado'}`);
    } else {
      console.log('❌ Usuario no encontrado');
    }

    // Verificar todos los servicios del usuario
    console.log('\n4️⃣ Verificando todos los servicios del usuario...');
    const userServices = await UserConfiguration.findAll({
      where: {
        userId: bdmService.userId
      }
    });
    
    console.log(`📋 Total de servicios del usuario: ${userServices.length}`);
    userServices.forEach(service => {
      const config = service.configuration as any;
      console.log(`   - ${service.serviceId}: ${service.isActive ? 'Activo' : 'Inactivo'} | Assistant: ${config?.assistantId || 'No configurado'}`);
    });

  } catch (error) {
    console.error('❌ Error verificando configuración:', error);
  }
}

// Ejecutar verificación
checkBDMServiceConfig().then(() => {
  console.log('\n✅ === VERIFICACIÓN COMPLETADA ===');
}).catch(console.error);

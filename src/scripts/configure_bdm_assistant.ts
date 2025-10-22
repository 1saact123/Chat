import { UserConfiguration } from '../models';
import { UserOpenAIService } from '../services/user_openai_service';

async function configureBDMAssistant() {
  try {
    console.log('🔧 === CONFIGURANDO ASISTENTE PARA SERVICIO BDM ===\n');

    // Buscar el servicio BDM
    const bdmService = await UserConfiguration.findOne({
      where: {
        serviceId: 'bdm-service'
      }
    });

    if (!bdmService) {
      console.log('❌ No se encontró el servicio BDM');
      return;
    }

    console.log('✅ Servicio BDM encontrado:');
    console.log(`   User ID: ${bdmService.userId}`);
    console.log(`   Service ID: ${bdmService.serviceId}`);

    // Obtener el usuario
    const { User } = await import('../models');
    const user = await User.findByPk(bdmService.userId);
    
    if (!user || !user.openaiToken) {
      console.log('❌ Usuario no tiene token de OpenAI configurado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.email}`);

    // Crear servicio OpenAI del usuario
    const openaiService = new UserOpenAIService(user.id, user.openaiToken);
    
    // Listar asistentes disponibles
    console.log('\n📋 Obteniendo asistentes disponibles...');
    const assistants = await openaiService.listAssistants();
    
    console.log(`✅ Se encontraron ${assistants.length} asistentes:`);
    assistants.forEach((assistant, index) => {
      console.log(`   ${index + 1}. ${assistant.name} (${assistant.id})`);
    });

    // Buscar el asistente "chatbot test V4"
    const targetAssistant = assistants.find(a => a.name === 'chatbot test V4');
    
    if (!targetAssistant) {
      console.log('❌ No se encontró el asistente "chatbot test V4"');
      console.log('📋 Asistentes disponibles:');
      assistants.forEach(assistant => {
        console.log(`   - ${assistant.name} (${assistant.id})`);
      });
      return;
    }

    console.log(`✅ Asistente encontrado: ${targetAssistant.name} (${targetAssistant.id})`);

    // Actualizar la configuración del servicio
    console.log('\n🔧 Actualizando configuración del servicio...');
    
    const currentConfig = bdmService.configuration as any || {};
    const newConfig = {
      ...currentConfig,
      assistantId: targetAssistant.id,
      assistantName: targetAssistant.name
    };

    await bdmService.update({
      configuration: newConfig,
      assistantId: targetAssistant.id,
      assistantName: targetAssistant.name
    });

    console.log('✅ Configuración actualizada exitosamente:');
    console.log(`   Assistant ID: ${targetAssistant.id}`);
    console.log(`   Assistant Name: ${targetAssistant.name}`);
    console.log(`   Project Key: ${currentConfig.projectKey}`);
    console.log(`   Admin Approved: ${currentConfig.adminApproved}`);

    // Verificar la configuración actualizada
    console.log('\n🔍 Verificando configuración actualizada...');
    const updatedService = await UserConfiguration.findOne({
      where: {
        serviceId: 'bdm-service'
      }
    });

    if (updatedService) {
      const config = updatedService.configuration as any;
      console.log('📋 Configuración final:');
      console.log(JSON.stringify(config, null, 2));
    }

  } catch (error) {
    console.error('❌ Error configurando asistente:', error);
  }
}

// Ejecutar configuración
configureBDMAssistant().then(() => {
  console.log('\n✅ === CONFIGURACIÓN COMPLETADA ===');
  console.log('\n💡 PRÓXIMO PASO:');
  console.log('Ahora puedes probar el servicio BDM con el endpoint:');
  console.log('POST https://chat.movonte.com/api/services/bdm-service/chat');
}).catch(console.error);






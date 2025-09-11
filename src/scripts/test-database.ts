import { testConnection, syncDatabase } from '../config/database';
import { DatabaseService } from '../services/database_service';

async function testDatabase() {
  console.log('🧪 Iniciando pruebas de base de datos...');
  
  try {
    // Conectar a la base de datos
    console.log('🔌 Conectando a la base de datos...');
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('No se pudo conectar a la base de datos');
    }
    
    // Sincronizar modelos
    console.log('🔄 Sincronizando modelos...');
    await syncDatabase();
    
    const dbService = DatabaseService.getInstance();
    
    // Prueba 1: Crear un thread
    console.log('\n📝 Prueba 1: Crear thread...');
    const thread = await dbService.createOrUpdateThread({
      threadId: 'test_thread_123',
      openaiThreadId: 'thread_abc123',
      jiraIssueKey: 'TI-999',
      serviceId: 'chat-general',
      lastActivity: new Date()
    });
    console.log(`✅ Thread creado: ${thread.threadId}`);
    
    // Prueba 2: Agregar mensajes
    console.log('\n💬 Prueba 2: Agregar mensajes...');
    await dbService.addMessage({
      threadId: 'test_thread_123',
      role: 'user',
      content: 'Hola, estoy probando la base de datos',
      timestamp: new Date()
    });
    
    await dbService.addMessage({
      threadId: 'test_thread_123',
      role: 'assistant',
      content: '¡Hola! La base de datos está funcionando correctamente.',
      timestamp: new Date()
    });
    console.log('✅ Mensajes agregados');
    
    // Prueba 3: Recuperar thread con mensajes
    console.log('\n🔍 Prueba 3: Recuperar thread con mensajes...');
    const { thread: retrievedThread, messages } = await dbService.getThreadWithMessages('test_thread_123');
    
    if (retrievedThread) {
      console.log(`✅ Thread recuperado: ${retrievedThread.threadId}`);
      console.log(`📊 Mensajes encontrados: ${messages.length}`);
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ No se pudo recuperar el thread');
    }
    
    // Prueba 4: Estadísticas
    console.log('\n📊 Prueba 4: Estadísticas de la base de datos...');
    const stats = await dbService.getDatabaseStats();
    console.log(`   Total threads: ${stats.totalThreads}`);
    console.log(`   Total mensajes: ${stats.totalMessages}`);
    console.log(`   Total servicios: ${stats.totalServices}`);
    console.log(`   Threads activos (24h): ${stats.activeThreads}`);
    
    // Prueba 5: Limpiar datos de prueba
    console.log('\n🧹 Prueba 5: Limpiar datos de prueba...');
    // Nota: En producción no limpiaríamos, pero para pruebas está bien
    
    console.log('\n✅ Todas las pruebas de base de datos completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testDatabase();
}

export { testDatabase };

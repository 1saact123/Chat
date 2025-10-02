import { User } from '../models';
import { DatabaseService } from '../services/database_service';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    const dbService = DatabaseService.getInstance();

    // Crear usuario de prueba con permisos limitados
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testUser = await User.create({
      username: 'testuser',
      email: 'testuser@movonte.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      permissions: {
        serviceManagement: true,
        automaticAIDisableRules: false,
        webhookConfiguration: true,
        ticketControl: false,
        aiEnabledProjects: true,
        remoteServerIntegration: false
      }
    });

    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log('📧 Email:', testUser.email);
    console.log('👤 Username:', testUser.username);
    console.log('🔐 Password: test123');
    console.log('👑 Role:', testUser.role);
    console.log('🔒 Permissions:', testUser.permissions);

    console.log('\n🧪 INFORMACIÓN PARA TESTING:');
    console.log('1. Inicia sesión con:');
    console.log('   - Email: testuser@movonte.com');
    console.log('   - Password: test123');
    console.log('2. El usuario debería ver solo:');
    console.log('   ✅ Service Management (AI Configuration)');
    console.log('   ✅ Webhook Configuration');
    console.log('   ✅ AI Enabled Projects (en Overview)');
    console.log('   ❌ Automatic AI Disable Rules');
    console.log('   ❌ Ticket Control');
    console.log('   ❌ Remote Server Integration');
    console.log('   ❌ Gestión de Usuarios');

  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('⚠️ El usuario de prueba ya existe');
      
      // Actualizar permisos del usuario existente
      const existingUser = await User.findOne({ where: { email: 'testuser@movonte.com' } });
      if (existingUser) {
        await existingUser.update({
          permissions: {
            serviceManagement: true,
            automaticAIDisableRules: false,
            webhookConfiguration: true,
            ticketControl: false,
            aiEnabledProjects: true,
            remoteServerIntegration: false
          }
        });
        console.log('✅ Permisos actualizados para el usuario existente');
      }
    } else {
      console.error('❌ Error creando usuario de prueba:', error);
    }
  }

  process.exit(0);
}

createTestUser();

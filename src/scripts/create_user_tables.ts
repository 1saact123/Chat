import { sequelize } from '../models';
import { User, UserConfiguration, UserWebhook, UserInstance } from '../models';

async function createUserTables() {
  try {
    console.log('🔄 Creating user-related tables...');
    
    // Sincronizar todos los modelos (crear tablas si no existen)
    await sequelize.sync({ force: false });
    
    console.log('✅ User tables created successfully!');
    console.log('📋 Created tables:');
    console.log('   - users (already existed)');
    console.log('   - user_configurations');
    console.log('   - user_webhooks');
    console.log('   - user_instances');
    
    // Crear usuario admin por defecto si no existe
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      await User.create({
        username: 'admin',
        email: 'admin@movonte.com',
        password: 'admin123', // En producción esto debería estar hasheado
        role: 'admin',
        isActive: true,
        permissions: {
          serviceManagement: true,
          automaticAIDisableRules: true,
          webhookConfiguration: true,
          ticketControl: true,
          aiEnabledProjects: true,
          remoteServerIntegration: true
        }
      });
      console.log('✅ Default admin user created');
    }
    
    // Crear usuario demo
    const demoUser = await User.findOne({ where: { username: 'demo' } });
    if (!demoUser) {
      await User.create({
        username: 'demo',
        email: 'demo@movonte.com',
        password: 'demo123', // En producción esto debería estar hasheado
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
      console.log('✅ Demo user created');
    }
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating user tables:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createUserTables()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { createUserTables };

import { sequelize } from '../models';
import { User } from '../models';
import bcrypt from 'bcrypt';

async function createTestAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Verificar si ya existe un admin de prueba
    const existingAdmin = await User.findOne({
      where: { username: 'testadmin' }
    });
    
    if (existingAdmin) {
      console.log('⚠️  Usuario testadmin ya existe, eliminándolo...');
      await existingAdmin.destroy();
    }
    
    // Crear nuevo admin de prueba
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const newAdmin = await User.create({
      username: 'testadmin',
      email: 'testadmin@movonte.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isInitialSetupComplete: true
    });
    
    console.log('✅ Usuario admin de prueba creado exitosamente:');
    console.log(`   Username: ${newAdmin.username}`);
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Password: test123`);
    console.log(`   Role: ${newAdmin.role}`);
    console.log(`   ID: ${newAdmin.id}`);
    
    console.log('\n🔑 Credenciales para login:');
    console.log('   Username: testadmin');
    console.log('   Password: test123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

createTestAdmin();

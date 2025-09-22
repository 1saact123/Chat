import bcrypt from 'bcryptjs';
import { User } from '../models';
import { sequelize } from '../config/database';

async function createAdminUser() {
  try {
    console.log('🔧 Iniciando creación de usuario administrador...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Sincronizar modelos
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados');
    
    // Verificar si ya existe un usuario admin
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });
    
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario administrador:', existingAdmin.username);
      console.log('   Email:', existingAdmin.email);
      console.log('   Último login:', existingAdmin.lastLogin || 'Nunca');
      return;
    }
    
    // Datos del usuario administrador
    const adminData = {
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@movonte.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin' as const,
      isActive: true
    };
    
    console.log('📝 Creando usuario administrador...');
    console.log('   Username:', adminData.username);
    console.log('   Email:', adminData.email);
    console.log('   Password:', adminData.password);
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // Crear usuario
    const adminUser = await User.create({
      username: adminData.username,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role,
      isActive: adminData.isActive
    });
    
    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('   ID:', adminUser.id);
    console.log('   Username:', adminUser.username);
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Activo:', adminUser.isActive);
    
    console.log('\n🔑 Credenciales de acceso:');
    console.log('   Usuario:', adminData.username);
    console.log('   Contraseña:', adminData.password);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login!');
    
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAdminUser();
}

export { createAdminUser };

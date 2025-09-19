import { User } from '../models';
import { sequelize } from '../config/database';

async function createAdminUser() {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sincronizar modelos
    await sequelize.sync();
    console.log('✅ Database synchronized');

    // Verificar si ya existe un usuario admin
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.username);
      return;
    }

    // Crear usuario administrador
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@movonte.com',
      password: 'admin123', // Se hasheará automáticamente
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin user created successfully:');
    console.log('   Username: admin');
    console.log('   Email: admin@movonte.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAdminUser();
}

export { createAdminUser };

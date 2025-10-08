import { sequelize } from '../models';
import { User } from '../models';

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');
    
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'isActive']
    });
    
    console.log('\n📋 Usuarios en la base de datos:');
    console.log('================================');
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('   ---');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkUsers();

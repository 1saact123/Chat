import { sequelize } from '../config/database';
import { User } from '../models';

async function checkUserRole() {
  try {
    console.log('🔍 Checking user roles...');
    
    // Verificar todos los usuarios y sus roles
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role']
    });
    
    console.log('👥 All users:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role || 'null'}`);
    });
    
    // Verificar específicamente el usuario ID 9
    const user9 = await User.findByPk(9);
    if (user9) {
      console.log(`\n🎯 User ID 9 details:`);
      console.log(`  - Username: ${user9.username}`);
      console.log(`  - Email: ${user9.email}`);
      console.log(`  - Role: ${user9.role || 'null'}`);
      
      if (user9.role !== 'admin') {
        console.log(`\n⚠️  User ID 9 is not an admin. Current role: ${user9.role || 'null'}`);
        console.log('💡 Updating user ID 9 to admin role...');
        
        await user9.update({ role: 'admin' });
        console.log('✅ User ID 9 updated to admin role');
      } else {
        console.log('✅ User ID 9 is already an admin');
      }
    } else {
      console.log('❌ User ID 9 not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  } finally {
    await sequelize.close();
  }
}

checkUserRole();



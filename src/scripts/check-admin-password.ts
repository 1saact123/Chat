import { sequelize } from '../models';
import { User } from '../models';
import bcrypt from 'bcrypt';

async function checkAdminPassword() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');
    
    const admin = await User.findOne({
      where: { username: 'admin' },
      attributes: ['id', 'username', 'email', 'password']
    });
    
    if (!admin) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('\n👤 Usuario admin encontrado:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password Hash: ${admin.password}`);
    
    // Probar contraseñas comunes
    const commonPasswords = ['admin', 'admin123', 'password', '123456', 'movonte', 'admin@movonte'];
    
    console.log('\n🔍 Probando contraseñas comunes:');
    for (const password of commonPasswords) {
      const isValid = await bcrypt.compare(password, admin.password);
      console.log(`   "${password}": ${isValid ? '✅ VÁLIDA' : '❌ inválida'}`);
      if (isValid) {
        console.log(`\n🎉 ¡Contraseña encontrada! Usa: "${password}"`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkAdminPassword();

import { sequelize } from '../config/database';

async function addOrganizationLogoToUsers() {
  try {
    console.log('🔄 === AGREGAR CAMPO organizationLogo A USUARIOS ===\n');

    // Verificar si la columna ya existe
    const [results]: any[] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'organizationLogo'
    `);

    if (results.length > 0) {
      console.log('⚠️ La columna organizationLogo ya existe en la tabla users');
      return;
    }

    // Agregar la columna organizationLogo
    console.log('➕ Agregando columna organizationLogo...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN organizationLogo TEXT NULL
    `);

    console.log('✅ Columna organizationLogo agregada exitosamente\n');

  } catch (error) {
    console.error('❌ Error agregando organizationLogo:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addOrganizationLogoToUsers()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la migración:', error);
      process.exit(1);
    });
}

export default addOrganizationLogoToUsers;


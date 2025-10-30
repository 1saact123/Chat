import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'chatbot_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql' as const,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
};

// Crear instancia de Sequelize
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define
  }
);

// Función para probar la conexión
export async function testConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    return false;
  }
}

// Función para sincronizar modelos
export async function syncDatabase(): Promise<void> {
  try {
    // Usar force: false para evitar recrear tablas existentes
    // y alter: false para evitar conflictos con índices
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Base de datos sincronizada correctamente');

    // Asegurar columnas críticas (logo organización) y tipo adecuado
    try {
      const dbName = process.env.DB_NAME || 'chatbot_db';
      const [colRows] = await sequelize.query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' 
         AND COLUMN_NAME = 'organization_logo'`,
        { replacements: [dbName] }
      );

      const col = (colRows as any[])[0];
      if (!col) {
        console.log('🛠️ Adding missing column users.organization_logo...');
        await sequelize.query('ALTER TABLE users ADD COLUMN organization_logo TEXT NULL');
        console.log('✅ Column users.organization_logo added');
      } else {
        const type = String(col.DATA_TYPE || '').toLowerCase();
        if (type === 'text' || type === 'tinytext') {
          console.log('🛠️ Upgrading users.organization_logo to MEDIUMTEXT...');
          await sequelize.query('ALTER TABLE users MODIFY COLUMN organization_logo MEDIUMTEXT NULL');
          console.log('✅ Column users.organization_logo is now MEDIUMTEXT');
        }
      }
    } catch (schemaErr) {
      console.warn('⚠️ Schema check for organization_logo failed (continuing):', schemaErr);
    }
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    // Si hay error con alter, intentar solo con force: false
    try {
      console.log('🔄 Intentando sincronización sin alter...');
      await sequelize.sync({ force: false });
      console.log('✅ Base de datos sincronizada sin alter');
    } catch (secondError) {
      console.error('❌ Error en segunda sincronización:', secondError);
      throw secondError;
    }
  }
}

import { sequelize } from '../config/database';
import { DataTypes } from 'sequelize';

async function createWebhookConfigTable() {
  try {
    console.log('🔄 Creating webhook_config table...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Definir el modelo de webhook_config
    const WebhookConfig = sequelize.define('WebhookConfig', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      webhookUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      lastUpdated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'webhook_config',
      timestamps: false
    });
    
    // Sincronizar la tabla
    await WebhookConfig.sync({ force: false });
    console.log('✅ Webhook config table created/verified successfully');
    
    // Verificar si ya existe una configuración
    const existingConfig = await WebhookConfig.findOne();
    if (!existingConfig) {
      // Crear configuración por defecto
      await WebhookConfig.create({
        webhookUrl: null,
        isEnabled: false,
        lastUpdated: new Date()
      });
      console.log('✅ Default webhook configuration created');
    } else {
      console.log('✅ Existing webhook configuration found');
    }
    
  } catch (error) {
    console.error('❌ Error creating webhook config table:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createWebhookConfigTable();
}

export { createWebhookConfigTable };

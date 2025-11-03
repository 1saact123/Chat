import { sequelize } from '../config/database';

async function addApprovalStatusColumn() {
  try {
    console.log('🔄 === Agregando columna approval_status a unified_configurations ===\n');

    // 1. Verificar si la columna ya existe
    console.log('1️⃣ Verificando si la columna approval_status existe...');
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'unified_configurations' 
      AND COLUMN_NAME = 'approval_status'
    `);
    
    if ((columns as any[]).length === 0) {
      console.log('   Columna no existe, agregándola...');
      await sequelize.query(`
        ALTER TABLE unified_configurations 
        ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') 
        DEFAULT 'pending' 
        AFTER configuration
      `);
      console.log('✅ Columna approval_status agregada');
    } else {
      console.log('✅ Columna approval_status ya existe, omitiendo...');
    }

    // 2. Migrar datos existentes: si adminApproved está en configuration, actualizar approval_status
    console.log('\n2️⃣ Migrando datos existentes...');
    const [services] = await sequelize.query(`
      SELECT id, configuration 
      FROM unified_configurations 
      WHERE configuration IS NOT NULL
    `);

    let migrated = 0;
    for (const service of services as any[]) {
      let config = service.configuration;
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch (e) {
          console.warn(`⚠️ Error parsing config for service ${service.id}:`, e);
          continue;
        }
      }

      let newStatus = 'pending';
      if (config?.adminApproved === true) {
        newStatus = 'approved';
      } else if (config?.adminApproved === false && config?.adminApprovedAt) {
        // Si está marcado como false pero tiene fecha, podría ser rechazado
        // Por ahora, dejarlo como pending para que el admin lo revise
        newStatus = 'pending';
      }

      await sequelize.query(`
        UPDATE unified_configurations 
        SET approval_status = ?
        WHERE id = ?
      `, {
        replacements: [newStatus, service.id]
      });

      migrated++;
    }

    console.log(`✅ Migrados ${migrated} servicios`);

    // 3. Agregar índice para búsquedas rápidas
    console.log('\n3️⃣ Verificando si el índice idx_approval_status existe...');
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'unified_configurations' 
      AND INDEX_NAME = 'idx_approval_status'
    `);
    
    if ((indexes as any[]).length === 0) {
      console.log('   Índice no existe, creándolo...');
      await sequelize.query(`
        CREATE INDEX idx_approval_status 
        ON unified_configurations(approval_status)
      `);
      console.log('✅ Índice agregado');
    } else {
      console.log('✅ Índice ya existe, omitiendo...');
    }

    // 4. Verificar migración
    console.log('\n4️⃣ Verificando migración...');
    const [stats] = await sequelize.query(`
      SELECT 
        approval_status,
        COUNT(*) as count
      FROM unified_configurations
      GROUP BY approval_status
    `);

    console.log('📊 Distribución de estados:');
    (stats as any[]).forEach((stat: any) => {
      console.log(`   - ${stat.approval_status}: ${stat.count} servicios`);
    });

    console.log('\n✅ === MIGRACIÓN COMPLETADA ===');
    console.log('💡 La columna approval_status ha sido agregada y los datos migrados.');
    console.log('💡 Ahora puedes usar approval_status directamente en unified_configurations.');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addApprovalStatusColumn()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

export { addApprovalStatusColumn };


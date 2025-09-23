#!/usr/bin/env ts-node

/**
 * Script para actualizar la base de datos RDS
 * Lee credenciales del .env y ejecuta la actualización
 */

import * as fs from 'fs';
import * as path from 'path';
import { Sequelize, QueryTypes } from 'sequelize';

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

class RDSDatabaseUpdater {
  private config: DatabaseConfig;
  private sequelize: Sequelize;

  constructor() {
    this.config = this.loadConfigFromEnv();
    this.sequelize = this.createSequelizeConnection();
  }

  /**
   * Crea la conexión Sequelize
   */
  private createSequelizeConnection(): Sequelize {
    return new Sequelize(this.config.database, this.config.username, this.config.password, {
      host: this.config.host,
      port: parseInt(this.config.port),
      dialect: 'mysql',
      logging: false, // Deshabilitar logs de SQL
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }

  /**
   * Carga la configuración desde el archivo .env
   */
  private loadConfigFromEnv(): DatabaseConfig {
    try {
      const envPath = path.join(process.cwd(), '.env');
      
      if (!fs.existsSync(envPath)) {
        throw new Error('❌ Archivo .env no encontrado');
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars: Record<string, string> = {};

      // Parsear variables de entorno
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      });

      // Validar variables requeridas
      const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
      const missingVars = requiredVars.filter(varName => !envVars[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`❌ Variables de entorno faltantes: ${missingVars.join(', ')}`);
      }

      return {
        host: envVars.DB_HOST,
        port: envVars.DB_PORT,
        database: envVars.DB_NAME,
        username: envVars.DB_USER,
        password: envVars.DB_PASSWORD
      };

    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
      process.exit(1);
    }
  }

  /**
   * Ejecuta query SQL usando Sequelize
   */
  private async executeQuery(sqlCommand: string, replacements?: any[]): Promise<any> {
    try {
      console.log(`🔧 Ejecutando: ${sqlCommand}`);
      
      const result = await this.sequelize.query(sqlCommand, {
        replacements: replacements || [],
        type: QueryTypes.SELECT
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error ejecutando query:', error);
      throw error;
    }
  }

  /**
   * Verifica la conexión a la base de datos
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 Probando conexión a RDS...');
      await this.sequelize.authenticate();
      console.log('✅ Conexión a RDS establecida correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a RDS:', error);
      return false;
    }
  }

  /**
   * Obtiene información de la tabla actual
   */
  async getTableInfo(): Promise<any> {
    try {
      console.log('📊 Obteniendo información de la tabla...');
      
      // Verificar si la tabla existe
      const tableExists = await this.executeQuery(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = ? 
        AND table_name = 'chat_threads'
      `, [this.config.database]);
      
      const exists = (tableExists[0] as any).count > 0;
      
      if (exists) {
        // Obtener información de la tabla
        const tableInfo = await this.executeQuery('DESCRIBE chat_threads');
        const indexInfo = await this.executeQuery('SHOW INDEX FROM chat_threads');
        
        return {
          exists: true,
          tableInfo,
          indexInfo
        };
      } else {
        return { exists: false };
      }
    } catch (error) {
      console.error('❌ Error obteniendo información de tabla:', error);
      return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Elimina la tabla problemática
   */
  async dropTable(): Promise<void> {
    try {
      console.log('🗑️ Eliminando tabla chat_threads...');
      
      // Primero eliminar foreign key constraints
      console.log('🔗 Eliminando foreign key constraints...');
      try {
        await this.sequelize.query('ALTER TABLE chat_messages DROP FOREIGN KEY chat_messages_ibfk_1', {
          type: QueryTypes.RAW
        });
        console.log('✅ Foreign key constraint eliminada');
      } catch (fkError) {
        console.log('⚠️ No se encontró foreign key constraint o ya fue eliminada');
      }
      
      // Ahora eliminar la tabla
      await this.sequelize.query('DROP TABLE IF EXISTS chat_threads', {
        type: QueryTypes.RAW
      });
      console.log('✅ Tabla eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando tabla:', error);
      throw error;
    }
  }

  /**
   * Crea la tabla optimizada
   */
  async createOptimizedTable(): Promise<void> {
    try {
      console.log('🏗️ Creando tabla optimizada...');
      
      const createTableSQL = `
        CREATE TABLE chat_threads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          thread_id VARCHAR(255) NOT NULL,
          service_id VARCHAR(50) NOT NULL,
          issue_key VARCHAR(50),
          context_data JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_thread_id (thread_id),
          INDEX idx_service_id (service_id),
          INDEX idx_created_at (created_at)
        )
      `;
      
      await this.sequelize.query(createTableSQL, {
        type: QueryTypes.RAW
      });
      console.log('✅ Tabla optimizada creada exitosamente');
    } catch (error) {
      console.error('❌ Error creando tabla optimizada:', error);
      throw error;
    }
  }

  /**
   * Verifica que la tabla se creó correctamente
   */
  async verifyTable(): Promise<void> {
    try {
      console.log('🔍 Verificando tabla creada...');
      
      // Describir la tabla
      const tableDescription = await this.executeQuery('DESCRIBE chat_threads');
      console.log('📋 Estructura de la tabla:');
      console.log(JSON.stringify(tableDescription, null, 2));
      
      // Mostrar índices
      const indexes = await this.executeQuery('SHOW INDEX FROM chat_threads');
      console.log('🔗 Índices creados:');
      console.log(JSON.stringify(indexes, null, 2));
      
      // Contar índices
      const indexCount = await this.executeQuery(`
        SELECT COUNT(*) as total_indexes 
        FROM information_schema.statistics 
        WHERE table_name = 'chat_threads' 
        AND table_schema = ?
      `, [this.config.database]);
      
      const totalIndexes = (indexCount[0] as any).total_indexes;
      console.log('📊 Total de índices:', totalIndexes);
      
      if (totalIndexes <= 4) {
        console.log('✅ Tabla optimizada correctamente (máximo 4 índices)');
      } else {
        console.log('⚠️ Advertencia: Más de 4 índices detectados');
      }
      
    } catch (error) {
      console.error('❌ Error verificando tabla:', error);
      throw error;
    }
  }

  /**
   * Ejecuta la actualización completa
   */
  async updateDatabase(): Promise<void> {
    try {
      console.log('🚀 Iniciando actualización de base de datos RDS...');
      console.log(`📍 Conectando a: ${this.config.host}:${this.config.port}`);
      console.log(`🗄️ Base de datos: ${this.config.database}`);
      console.log(`👤 Usuario: ${this.config.username}`);
      
      // 1. Probar conexión
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('No se pudo conectar a la base de datos');
      }
      
      // 2. Obtener información actual
      const tableInfo = await this.getTableInfo();
      console.log('📊 Estado actual de la tabla:', tableInfo.exists ? 'EXISTE' : 'NO EXISTE');
      
      // 3. Eliminar tabla si existe
      if (tableInfo.exists) {
        await this.dropTable();
      }
      
      // 4. Crear tabla optimizada
      await this.createOptimizedTable();
      
      // 5. Verificar creación
      await this.verifyTable();
      
      console.log('🎉 ¡Actualización de base de datos completada exitosamente!');
      console.log('✅ La tabla chat_threads está optimizada y lista para producción');
      
    } catch (error) {
      console.error('❌ Error en actualización de base de datos:', error);
      throw error;
    } finally {
      // Cerrar conexión
      await this.sequelize.close();
    }
  }
}

// Función principal
async function main() {
  try {
    const updater = new RDSDatabaseUpdater();
    await updater.updateDatabase();
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export { RDSDatabaseUpdater };

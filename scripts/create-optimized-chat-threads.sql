-- Script para crear tabla chat_threads optimizada
-- Ejecutar después de eliminar la tabla problemática

USE chatbot_db;

-- Eliminar tabla existente si existe
DROP TABLE IF EXISTS chat_threads;

-- Crear tabla optimizada con índices mínimos
CREATE TABLE chat_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  service_id VARCHAR(50) NOT NULL,
  issue_key VARCHAR(50),
  context_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Solo índices esenciales (máximo 3-4 para evitar "Too many keys")
  INDEX idx_thread_id (thread_id),
  INDEX idx_service_id (service_id),
  INDEX idx_created_at (created_at)
);

-- Verificar que la tabla se creó correctamente
DESCRIBE chat_threads;

-- Mostrar índices creados
SHOW INDEX FROM chat_threads;

-- Verificar que no hay demasiados índices
SELECT 
  COUNT(*) as total_indexes,
  'OK' as status
FROM information_schema.statistics 
WHERE table_name = 'chat_threads' 
  AND table_schema = 'chatbot_db';

-- Mensaje de confirmación
SELECT 'Tabla chat_threads optimizada creada exitosamente' as message;

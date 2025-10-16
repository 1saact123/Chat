import { sequelize } from '../config/database';
import { ServiceValidation, User } from '../models';

async function createTestValidationRequest() {
  try {
    console.log('🔍 Creating test validation request...');
    
    // Buscar un usuario existente
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`👤 Using user: ${user.username} (ID: ${user.id})`);
    
    // Crear una solicitud de validación de prueba
    const validation = await ServiceValidation.create({
      userId: user.id,
      serviceName: 'Test Service',
      serviceDescription: 'This is a test service for validation',
      websiteUrl: 'https://example.com',
      requestedDomain: 'example.com',
      status: 'pending'
    });
    
    console.log('✅ Test validation request created:');
    console.log(`  - ID: ${validation.id}`);
    console.log(`  - Service: ${validation.serviceName}`);
    console.log(`  - Domain: ${validation.requestedDomain}`);
    console.log(`  - Status: ${validation.status}`);
    console.log(`  - User: ${user.username}`);
    
  } catch (error) {
    console.error('❌ Error creating test validation request:', error);
  } finally {
    await sequelize.close();
  }
}

createTestValidationRequest();


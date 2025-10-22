import { ServiceValidationService } from '../services/service_validation_service';

async function testAdminEndpointDirect() {
  try {
    console.log('🔍 Probando servicio de validación directamente...');

    const validationService = ServiceValidationService.getInstance();
    
    // Probar el método que usa el endpoint del admin
    const pendingValidations = await validationService.getPendingValidationsForAdmin(1);
    
    console.log('📊 Solicitudes pendientes para admin ID 1:');
    console.log('Cantidad:', pendingValidations.length);
    console.log('Datos:', JSON.stringify(pendingValidations, null, 2));

    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAdminEndpointDirect();

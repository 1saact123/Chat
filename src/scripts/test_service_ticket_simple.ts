import { ServiceTicketController } from '../controllers/service_ticket_controller';

async function testServiceTicketSimple() {
  console.log('🧪 === TESTING SERVICE TICKET ENDPOINT (SIMPLE) ===\n');

  try {
    const controller = new ServiceTicketController();

    // Mock request para crear ticket
    const mockReq = {
      body: {
        customerInfo: {
          name: 'Usuario Test',
          email: 'test@example.com',
          company: 'Test Company',
          message: 'Mensaje de prueba desde script simple'
        },
        serviceId: 'hpla',
        userId: 12
      }
    } as any;

    // Mock response
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log(`📊 Status ${code}:`, JSON.stringify(data, null, 2));
          return data;
        }
      })
    } as any;

    console.log('🎫 Probando createTicketForService...');
    console.log('📋 Datos de prueba:', mockReq.body);

    await controller.createTicketForService(mockReq, mockRes);

    console.log('\n🎉 === TEST COMPLETED ===');

  } catch (error) {
    console.error('❌ Error en el test:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testServiceTicketSimple();
}

export { testServiceTicketSimple };


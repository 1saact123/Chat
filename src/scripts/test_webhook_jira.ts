import axios from 'axios';

async function testWebhookJira() {
  try {
    console.log('🧪 === PRUEBA DEL WEBHOOK DE JIRA ===\n');

    const webhookUrl = 'http://localhost:3000/api/chatbot/webhook/jira';
    
    // Simular payload de comentario de Jira
    const testPayloads = [
      {
        name: 'Ticket TI-123 (debería funcionar)',
        payload: {
          webhookEvent: 'comment_created',
          issue: {
            key: 'TI-123',
            fields: {
              summary: 'Test ticket for TI project',
              status: { name: 'Open' }
            }
          },
          comment: {
            id: '12345',
            body: 'Este es un comentario de prueba para el proyecto TI',
            author: {
              displayName: 'Test User',
              emailAddress: 'test@example.com',
              accountId: 'test-account-123'
            },
            created: new Date().toISOString()
          }
        }
      },
      {
        name: 'Ticket DEV-456 (debería funcionar)',
        payload: {
          webhookEvent: 'comment_created',
          issue: {
            key: 'DEV-456',
            fields: {
              summary: 'Test ticket for DEV project',
              status: { name: 'In Progress' }
            }
          },
          comment: {
            id: '12346',
            body: 'Este es un comentario de prueba para el proyecto DEV',
            author: {
              displayName: 'Dev User',
              emailAddress: 'dev@example.com',
              accountId: 'dev-account-456'
            },
            created: new Date().toISOString()
          }
        }
      },
      {
        name: 'Ticket TEST-789 (no debería funcionar)',
        payload: {
          webhookEvent: 'comment_created',
          issue: {
            key: 'TEST-789',
            fields: {
              summary: 'Test ticket for TEST project',
              status: { name: 'Open' }
            }
          },
          comment: {
            id: '12347',
            body: 'Este comentario no debería ser procesado',
            author: {
              displayName: 'Test User 2',
              emailAddress: 'test2@example.com',
              accountId: 'test-account-789'
            },
            created: new Date().toISOString()
          }
        }
      }
    ];

    for (const test of testPayloads) {
      console.log(`\n🧪 Probando: ${test.name}`);
      console.log(`   IssueKey: ${test.payload.issue.key}`);
      console.log(`   ProjectKey: ${test.payload.issue.key.split('-')[0]}`);
      console.log(`   Comentario: ${test.payload.comment.body}`);
      
      try {
        const response = await axios.post(webhookUrl, test.payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        console.log(`   ✅ Respuesta: ${response.status} ${response.statusText}`);
        console.log(`   📋 Datos:`, JSON.stringify(response.data, null, 2));
        
        if (response.data.ignored) {
          console.log(`   ⚠️  TICKET IGNORADO: ${response.data.reason}`);
        } else {
          console.log(`   🎯 TICKET PROCESADO: ${response.data.message}`);
        }

      } catch (error: any) {
        if (error.response) {
          console.log(`   ❌ Error HTTP: ${error.response.status} ${error.response.statusText}`);
          console.log(`   📋 Datos:`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
          console.log(`   ❌ Error de conexión: No se pudo conectar al servidor`);
          console.log(`   💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:3000`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      
      // Esperar un poco entre pruebas
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ === PRUEBA COMPLETADA ===');
    console.log('\n💡 RESULTADOS ESPERADOS:');
    console.log('1. TI-123: Debería ser procesado (servicio "service--test" configurado para TI)');
    console.log('2. DEV-456: Debería ser procesado (servicio "remoto-n2" configurado para DEV)');
    console.log('3. TEST-789: Debería ser ignorado (ningún servicio configurado para TEST)');

  } catch (error) {
    console.error('❌ Error en la prueba del webhook:', error);
  }
}

// Ejecutar prueba
testWebhookJira().catch(console.error);

import { sequelize } from '../models';
import { User } from '../models';

async function setupTestUserTokens() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Obtener usuario de prueba
    const user = await User.findOne({
      where: { username: 'testadmin' }
    });
    
    if (!user) {
      console.log('❌ Usuario testadmin no encontrado');
      return;
    }
    
    console.log(`👤 Configurando tokens para usuario: ${user.username} (ID: ${user.id})`);
    
    // Configurar tokens de prueba
    await user.update({
      jiraToken: 'ATATT3xFfGF0test123...',
      jiraUrl: 'https://testcompany.atlassian.net',
      openaiToken: 'sk-test1234567890abcdef...',
      isInitialSetupComplete: true
    });
    
    console.log('✅ Tokens configurados exitosamente:');
    console.log(`   Jira Token: ${user.jiraToken}`);
    console.log(`   Jira URL: ${(user as any).jiraUrl}`);
    console.log(`   OpenAI Token: ${user.openaiToken}`);
    console.log(`   Setup Complete: ${user.isInitialSetupComplete}`);
    
    console.log('\n🎉 Usuario listo para probar servicios personalizados!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

setupTestUserTokens();

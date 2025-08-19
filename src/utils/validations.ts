export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  export function validateEnvironmentVariables(): void {
    const required = [
      'OPENAI_API_KEY', 
      'OPENAI_ASSISTANT_ID',
      'JIRA_EMAIL', 
      'JIRA_API_TOKEN', 
      'JIRA_BASE_URL',
      'JIRA_PROJECT_KEY',
      'SMTP_USER', 
      'SMTP_PASS'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Faltan variables de entorno requeridas:', missing.join(', '));
      console.log('\n📝 Configura tu archivo .env con:');
      console.log('# OpenAI');
      console.log('OPENAI_API_KEY=tu_openai_api_key');
      console.log('OPENAI_ASSISTANT_ID=tu_assistant_id');
      console.log('');
      console.log('# Jira');
      console.log('JIRA_EMAIL=tu-email@movonte.com');
      console.log('JIRA_API_TOKEN=tu_jira_token');
      console.log('JIRA_BASE_URL=https://movonte.atlassian.net');
      console.log('JIRA_PROJECT_KEY=CONTACT');
      console.log('');
      console.log('# Email');
      console.log('SMTP_HOST=smtp.gmail.com');
      console.log('SMTP_PORT=587');
      console.log('SMTP_SECURE=false');
      console.log('SMTP_USER=tu-email@gmail.com');
      console.log('SMTP_PASS=tu_app_password');
      console.log('SMTP_FROM=tu-email@gmail.com');
      console.log('');
      console.log('# Configuración adicional');
      console.log('PORT=3000');
      console.log('ALLOWED_ORIGINS=https://movonte.com,http://localhost:3000');
      console.log('FALLBACK_EMAIL=contact@movonte.atlassian.net');
      process.exit(1);
    }
  
    console.log('✅ Todas las variables de entorno están configuradas');
  }
  
  export function sanitizeInput(input: string): string {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  export function validateContactForm(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
  
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Nombre es requerido');
    }
  
    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email es requerido');
    } else if (!isValidEmail(data.email)) {
      errors.push('Email no tiene formato válido');
    }
  
    if (!data.message || typeof data.message !== 'string') {
      errors.push('Mensaje es requerido');
    }
  
    if (data.phone && typeof data.phone !== 'string') {
      errors.push('Teléfono debe ser texto');
    }
  
    if (data.company && typeof data.company !== 'string') {
      errors.push('Empresa debe ser texto');
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  }
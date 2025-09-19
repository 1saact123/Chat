# Variables de Entorno Requeridas

## Variables Nuevas para Autenticación

Para que el sistema de autenticación funcione correctamente, necesitas agregar estas variables a tu archivo `.env`:

### 🔐 JWT Authentication
```bash
# Clave secreta para firmar los tokens JWT (debe ser muy larga y aleatoria)
JWT_SECRET=tu-clave-secreta-muy-larga-y-aleatoria-aqui

# Tiempo de expiración de los tokens (opcional, por defecto es 1h)
JWT_EXPIRES_IN=1h
```

### 👤 Admin User Creation
```bash
# Credenciales para el usuario administrador por defecto
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@movonte.com
ADMIN_PASSWORD=admin123
```

## Variables Existentes que Debes Verificar

### 🗄️ Database Configuration
```bash
DB_HOST=tu-endpoint-rds.amazonaws.com
DB_PORT=3306
DB_NAME=movonte_chatbot
DB_USER=tu-usuario-db
DB_PASSWORD=tu-contraseña-db
```

### 🤖 OpenAI Configuration
```bash
OPENAI_API_KEY=tu-api-key-de-openai
OPENAI_ASSISTANT_ID=tu-assistant-id
```

### 📧 Jira Configuration
```bash
JIRA_BASE_URL=https://movonte.atlassian.net
JIRA_EMAIL=tu-email-jira@movonte.com
JIRA_API_TOKEN=tu-token-jira
```

### 📨 Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
FROM_EMAIL=tu-email@gmail.com
FROM_NAME=Movonte AI Assistant
```

### 🌐 Server Configuration
```bash
PORT=3000
NODE_ENV=production
```

### 🔒 CORS Configuration
```bash
ALLOWED_ORIGINS=https://movonte.com,https://chat.movonte.com,https://movonte-consulting.github.io,https://form.movonte.com
```

## Pasos para Configurar

### 1. Crear/Actualizar tu archivo .env
Copia todas las variables de arriba a tu archivo `.env` y reemplaza los valores con tus datos reales.

### 2. Generar JWT_SECRET
Para generar una clave JWT segura, puedes usar:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Configurar Base de Datos
Asegúrate de que tu base de datos RDS esté configurada y accesible.

### 4. Crear Usuario Administrador
Después de configurar las variables, ejecuta:
```bash
npm run create-admin
```

## Variables Críticas para Autenticación

Las variables más importantes para el sistema de autenticación son:

1. **JWT_SECRET** - Debe ser única y muy segura
2. **DB_HOST, DB_USER, DB_PASSWORD** - Para conectar a la base de datos
3. **ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD** - Para crear el usuario admin

## Verificación

Después de configurar las variables, puedes verificar que todo funciona:

1. **Compilar el proyecto:**
   ```bash
   npm run build
   ```

2. **Crear usuario admin:**
   ```bash
   npm run create-admin
   ```

3. **Iniciar el servidor:**
   ```bash
   npm start
   ```

4. **Probar login:**
   - Ir a `https://chat.movonte.com/login`
   - Usar las credenciales del admin creado

# Configuración de Autenticación - Movonte API

## Resumen de Cambios

Se ha implementado un sistema completo de autenticación para proteger el acceso al dashboard administrativo. El sistema incluye:

- ✅ Modelo de usuario en la base de datos
- ✅ Middleware de autenticación con JWT
- ✅ Página de login protegida
- ✅ Protección de todas las rutas administrativas
- ✅ Script para crear usuario administrador

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# === CONFIGURACIÓN DE AUTENTICACIÓN ===
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@movonte.com
ADMIN_PASSWORD=admin123
```

### Descripción de Variables

- **JWT_SECRET**: Clave secreta para firmar los tokens JWT. Debe ser una cadena larga y segura.
- **ADMIN_USERNAME**: Nombre de usuario del administrador inicial.
- **ADMIN_EMAIL**: Email del administrador inicial.
- **ADMIN_PASSWORD**: Contraseña del administrador inicial (cambiar después del primer login).

## Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
```

### 2. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env` con las variables mencionadas arriba.

### 3. Crear Usuario Administrador

```bash
npm run create-admin
```

Este comando:
- Conecta a la base de datos
- Sincroniza los modelos (crea la tabla `users`)
- Crea el usuario administrador con las credenciales del `.env`

### 4. Reiniciar la Aplicación

```bash
npm run build
npm start
```

## Uso del Sistema

### Acceso al Dashboard

1. **Página de Login**: `http://tu-servidor/login`
2. **Dashboard Protegido**: `http://tu-servidor/ceo-dashboard`

### Credenciales por Defecto

- **Usuario**: `admin` (o el valor de `ADMIN_USERNAME`)
- **Contraseña**: `admin123` (o el valor de `ADMIN_PASSWORD`)

### Cambiar Contraseña

Después del primer login, puedes cambiar la contraseña usando:
- **Endpoint**: `PUT /api/auth/change-password`
- **Body**: `{ "currentPassword": "admin123", "newPassword": "nueva_contraseña" }`

## Rutas Protegidas

Las siguientes rutas ahora requieren autenticación de administrador:

- `GET /ceo-dashboard` - Dashboard principal
- `GET /api/admin/dashboard` - Datos del dashboard
- `GET /api/admin/projects` - Lista de proyectos
- `POST /api/admin/projects/set-active` - Cambiar proyecto activo
- `GET /api/admin/services/:serviceId` - Configuración de servicios
- `PUT /api/admin/services/:serviceId` - Actualizar servicio
- `PATCH /api/admin/services/:serviceId/toggle` - Activar/desactivar servicio
- `GET /api/admin/tickets/disabled` - Tickets deshabilitados
- `POST /api/admin/tickets/:issueKey/disable` - Deshabilitar ticket
- `POST /api/admin/tickets/:issueKey/enable` - Habilitar ticket

## Endpoints de Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token
- `GET /api/auth/profile` - Obtener perfil del usuario
- `PUT /api/auth/change-password` - Cambiar contraseña

## Seguridad

### Recomendaciones

1. **Cambiar credenciales por defecto** inmediatamente después del primer login
2. **Usar JWT_SECRET fuerte** (mínimo 32 caracteres aleatorios)
3. **Configurar HTTPS** en producción
4. **Rotar JWT_SECRET** periódicamente
5. **Monitorear logs de autenticación**

### Ejemplo de JWT_SECRET Seguro

```bash
# Generar un JWT_SECRET seguro
openssl rand -base64 32
```

## Estructura de la Base de Datos

### Tabla `users`

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  lastLogin DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

## Solución de Problemas

### Error: "Token de acceso requerido"
- Verificar que el token esté incluido en el header `Authorization: Bearer <token>`
- Verificar que el token no haya expirado (24 horas por defecto)

### Error: "Usuario no válido o inactivo"
- Verificar que el usuario existe en la base de datos
- Verificar que `isActive = true`

### Error: "Acceso denegado. Se requieren permisos de administrador"
- Verificar que el usuario tiene `role = 'admin'`

### Error de conexión a la base de datos
- Verificar las variables de entorno de la base de datos
- Ejecutar `npm run test:database` para probar la conexión

## Logs y Monitoreo

El sistema registra:
- Intentos de login exitosos y fallidos
- Accesos a rutas protegidas
- Errores de autenticación
- Cambios de contraseña

Revisa los logs del servidor para monitorear la actividad de autenticación.

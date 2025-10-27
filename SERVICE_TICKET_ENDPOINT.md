# 🎫 Endpoint de Creación de Tickets por Servicio

## 📋 Resumen

Se ha creado un nuevo endpoint que permite crear tickets de Jira según el servicio del cliente, en lugar de solo para la landing page.

## 🔧 Nuevo Endpoint

### **Crear Ticket por Servicio**
```http
POST /api/service/create-ticket
Authorization: Bearer [TOKEN]
Content-Type: application/json

{
  "customerInfo": {
    "name": "Usuario Test",
    "email": "test@example.com",
    "phone": "+1234567890",
    "company": "Test Company",
    "message": "Mensaje opcional"
  },
  "serviceId": "hpla",
  "userId": 12  // Opcional
}
```

### **Respuesta**
```json
{
  "success": true,
  "issueKey": "SCRUM-123",
  "jiraIssue": {
    "id": "12345",
    "key": "SCRUM-123",
    "url": "https://movonte.atlassian.net/browse/SCRUM-123"
  },
  "service": {
    "serviceId": "hpla",
    "serviceName": "Servicio HPLA",
    "projectKey": "SCRUM"
  },
  "message": "Ticket created successfully for service hpla"
}
```

## 🏗️ Implementación

### **1. ServiceTicketController**
- **Archivo**: `src/controllers/service_ticket_controller.ts`
- **Funciones**:
  - `createTicketForService()`: Crear ticket para servicio específico
  - `getServiceInfo()`: Obtener información del servicio

### **2. JiraService Actualizado**
- **Método**: `createContactIssueForProject()`
- **Funcionalidad**: Crear tickets en proyectos específicos
- **Formato**: Descripción ADF con información del servicio

### **3. Rutas Agregadas**
```typescript
// Crear ticket por servicio
router.post('/api/service/create-ticket', serviceTicketController.createTicketForService);

// Obtener información del servicio
router.get('/api/service/:serviceId/info', serviceTicketController.getServiceInfo);
```

## 🔍 Flujo de Trabajo

### **1. Validación del Servicio**
```typescript
// Buscar configuración del servicio
const serviceConfig = await this.getServiceConfiguration(serviceId, userId);

// Verificar que esté activo
if (!serviceConfig.isActive) {
  return error('Service not active');
}

// Obtener projectKey
const projectKey = this.getProjectKeyFromConfig(serviceConfig);
```

### **2. Creación del Ticket**
```typescript
// Preparar datos con información del servicio
const formData = {
  name: customerInfo.name,
  email: customerInfo.email,
  serviceId: serviceId,
  serviceName: serviceConfig.serviceName,
  projectKey: projectKey,
  source: `service-${serviceId}`
};

// Crear ticket en Jira
const jiraResponse = await this.jiraService.createContactIssueForProject(formData, projectKey);
```

### **3. Formato del Ticket**
- **Título**: `Service Contact: [Name] - [Company] ([ServiceName])`
- **Proyecto**: Según `projectKey` del servicio
- **Labels**: `service-contact`, `widget-chat`, `service-[serviceId]`
- **Descripción**: Información del cliente + detalles del servicio

## 📊 Configuración del Servicio

### **Tabla `unified_configurations`**
```sql
SELECT * FROM unified_configurations 
WHERE service_id = ? AND user_id = ? AND is_active = TRUE
```

### **Estructura de Configuración**
```json
{
  "serviceId": "hpla",
  "serviceName": "Servicio HPLA",
  "assistantId": "asst_xxx",
  "assistantName": "Asistente HPLA",
  "isActive": true,
  "configuration": {
    "projectKey": "SCRUM",
    "adminApproved": true,
    "adminApprovedAt": "2025-10-23T17:10:32.780Z"
  }
}
```

## 🎯 Diferencias con Landing Page

### **Landing Page (Antes)**
- **Endpoint**: `/api/landing/create-ticket`
- **Proyecto**: Fijo (`CONTACT`)
- **Configuración**: Global
- **Uso**: Solo para formularios de contacto

### **Servicio (Nuevo)**
- **Endpoint**: `/api/service/create-ticket`
- **Proyecto**: Según `projectKey` del servicio
- **Configuración**: Por usuario y servicio
- **Uso**: Para widgets de servicios específicos

## 🔧 Configuración Requerida

### **1. Servicio Activo**
```sql
UPDATE unified_configurations 
SET is_active = TRUE 
WHERE service_id = 'hpla' AND user_id = 12;
```

### **2. ProjectKey Configurado**
```sql
UPDATE unified_configurations 
SET configuration = JSON_SET(configuration, '$.projectKey', 'SCRUM')
WHERE service_id = 'hpla' AND user_id = 12;
```

### **3. Asistente Configurado**
```sql
UPDATE unified_configurations 
SET assistant_id = 'asst_xxx', assistant_name = 'Asistente HPLA'
WHERE service_id = 'hpla' AND user_id = 12;
```

## 🚀 Uso en el Frontend

### **React Component**
```typescript
const createTicket = async (customerInfo, serviceId) => {
  const response = await fetch('/api/service/create-ticket', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerInfo,
      serviceId
    })
  });
  
  return response.json();
};
```

### **HTML Simple**
```javascript
const response = await fetch('https://chat.movonte.com/api/service/create-ticket', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CONFIG.token}`
  },
  body: JSON.stringify({
    customerInfo: {
      name: 'Usuario Test',
      email: 'test@example.com',
      company: 'Test Company'
    },
    serviceId: CONFIG.serviceId
  })
});
```

## ✅ Beneficios

### **1. Flexibilidad**
- Cada servicio puede tener su propio proyecto de Jira
- Configuración independiente por usuario
- Asistentes específicos por servicio

### **2. Trazabilidad**
- Tickets etiquetados por servicio
- Información del servicio en el ticket
- Seguimiento por proyecto específico

### **3. Escalabilidad**
- Múltiples servicios simultáneos
- Configuración dinámica
- Gestión independiente

## 🔍 Validaciones

### **Validaciones del Cliente**
- ✅ `customerInfo.name` requerido
- ✅ `customerInfo.email` requerido y válido
- ✅ `serviceId` requerido

### **Validaciones del Servidor**
- ✅ Servicio existe en `unified_configurations`
- ✅ Servicio está activo (`is_active = TRUE`)
- ✅ Servicio tiene `projectKey` configurado
- ✅ Usuario tiene permisos para el servicio

## 🚨 Manejo de Errores

### **Errores Comunes**
- **400**: Campos requeridos faltantes
- **404**: Servicio no encontrado
- **400**: Servicio no activo
- **400**: Sin projectKey configurado
- **500**: Error de Jira

### **Respuestas de Error**
```json
{
  "success": false,
  "error": "Service 'hpla' not found or not configured"
}
```

## 🎉 ¡Listo para Usar!

El nuevo endpoint está implementado y listo para crear tickets según el servicio del cliente. Los tickets se crearán en el proyecto correcto con toda la información del servicio.

### **Próximos Pasos**
1. Configurar servicios en `unified_configurations`
2. Asignar `projectKey` a cada servicio
3. Probar creación de tickets
4. Verificar tickets en Jira

¡El sistema está listo para manejar tickets por servicio! 🚀


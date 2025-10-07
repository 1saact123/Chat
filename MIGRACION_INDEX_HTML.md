# 📋 **DOCUMENTACIÓN COMPLETA DE ENDPOINTS PARA `Dashboard`**

## 🔐 **AUTENTICACIÓN**

### **GET /api/auth/profile**
**Funcionalidad:** Obtener información del perfil del usuario autenticado
**Servicios utilizados:** `User` (modelo de base de datos)
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "permissions": {
        "serviceManagement": true,
        "automaticAIDisableRules": true,
        "webhookConfiguration": true,
        "ticketControl": true,
        "aiEnabledProjects": true,
        "remoteServerIntegration": true
      },
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Respuestas de error:**
```json
// 401 - No autenticado
{
  "success": false,
  "error": "Usuario no autenticado"
}

// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **POST /api/auth/logout**
**Funcionalidad:** Cerrar sesión del usuario y limpiar cookies
**Servicios utilizados:** `res.clearCookie()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **PUT /api/auth/change-password**
**Funcionalidad:** Cambiar contraseña del usuario autenticado
**Servicios utilizados:** `User` (modelo), `bcrypt`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

**Respuestas de error:**
```json
// 400 - Datos inválidos
{
  "success": false,
  "error": "Current password y new password son requeridos"
}

// 400 - Contraseña muy corta
{
  "success": false,
  "error": "La nueva contraseña debe tener al menos 6 caracteres"
}

// 401 - Contraseña actual incorrecta
{
  "success": false,
  "error": "Contraseña actual incorrecta"
}

// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}
```

---

## 📊 **DASHBOARD**

### **GET /api/admin/dashboard**
**Funcionalidad:** Obtener datos completos del dashboard principal
**Servicios utilizados:** `OpenAIService`, `JiraService`, `ConfigurationService`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "assistants": [
      {
        "id": "asst_123",
        "name": "Assistant Name",
        "isActive": true,
        "isGlobal": false
      }
    ],
    "projects": [
      {
        "key": "PROJ",
        "name": "Project Name",
        "isActive": true
      }
    ],
    "serviceConfigurations": [
      {
        "serviceId": "service1",
        "serviceName": "Service Name",
        "assistantId": "asst_123",
        "assistantName": "Assistant Name",
        "isActive": true
      }
    ],
    "activeProject": "PROJ",
    "activeAssistant": "asst_123",
    "totalAssistants": 5,
    "totalProjects": 3,
    "totalServices": 8
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error desconocido"
}
```

---

## 🏗️ **PROYECTOS**

### **GET /api/admin/projects**
**Funcionalidad:** Listar todos los proyectos disponibles de Jira
**Servicios utilizados:** `JiraService.listProjects()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "key": "PROJ",
        "name": "Project Name",
        "description": "Project Description",
        "isActive": true
      }
    ]
  }
}
```

**Respuestas de error:**
```json
// 500 - Error de conexión con Jira
{
  "success": false,
  "error": "Error conectando con Jira"
}
```

---

### **POST /api/admin/projects/set-active**
**Funcionalidad:** Establecer proyecto activo para el sistema
**Servicios utilizados:** `JiraService.setActiveProject()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "projectKey": "PROJ"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Proyecto activo actualizado",
  "data": {
    "activeProject": "PROJ"
  }
}
```

**Respuestas de error:**
```json
// 400 - Proyecto no especificado
{
  "success": false,
  "error": "Se requiere el projectKey"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error actualizando proyecto activo"
}
```

---

## ⚙️ **SERVICIOS**

### **PUT /api/admin/services/{serviceId}**
**Funcionalidad:** Actualizar configuración de un servicio específico
**Servicios utilizados:** `ConfigurationService.updateServiceConfiguration()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "assistantId": "asst_123",
  "assistantName": "Assistant Name",
  "isActive": true
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración de servicio actualizada",
  "data": {
    "serviceId": "service1",
    "assistantId": "asst_123",
    "assistantName": "Assistant Name",
    "isActive": true
  }
}
```

**Respuestas de error:**
```json
// 400 - Datos inválidos
{
  "success": false,
  "error": "assistantId y assistantName son requeridos"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error actualizando configuración"
}
```

---

### **PATCH /api/admin/services/{serviceId}/toggle**
**Funcionalidad:** Activar o desactivar un servicio
**Servicios utilizados:** `ConfigurationService.toggleService()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Servicio activado/desactivado",
  "data": {
    "serviceId": "service1",
    "isActive": true
  }
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error cambiando estado del servicio"
}
```

---

## 🎫 **TICKETS**

### **GET /api/admin/tickets/disabled**
**Funcionalidad:** Obtener lista de tickets con asistente deshabilitado
**Servicios utilizados:** `ConfigurationService.getDisabledTickets()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "disabledTickets": [
      {
        "issueKey": "PROJ-123",
        "reason": "Manual disable",
        "disabledAt": "2024-01-01T00:00:00.000Z",
        "disabledBy": "admin"
      }
    ]
  }
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error obteniendo tickets deshabilitados"
}
```

---

### **POST /api/admin/tickets/{issueKey}/disable**
**Funcionalidad:** Deshabilitar asistente para un ticket específico
**Servicios utilizados:** `ConfigurationService.disableTicket()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "reason": "Manual disable"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Asistente desactivado para el ticket",
  "data": {
    "issueKey": "PROJ-123",
    "reason": "Manual disable",
    "disabledAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Respuestas de error:**
```json
// 400 - IssueKey no especificado
{
  "success": false,
  "error": "Se requiere el issueKey del ticket"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error deshabilitando asistente"
}
```

---

### **POST /api/admin/tickets/{issueKey}/enable**
**Funcionalidad:** Habilitar asistente para un ticket específico
**Servicios utilizados:** `ConfigurationService.enableTicket()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Asistente reactivado para el ticket",
  "data": {
    "issueKey": "PROJ-123",
    "enabledAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Respuestas de error:**
```json
// 400 - IssueKey no especificado
{
  "success": false,
  "error": "Se requiere el issueKey del ticket"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error habilitando asistente"
}
```

---

### **GET /api/admin/tickets/{issueKey}/status**
**Funcionalidad:** Verificar estado del asistente en un ticket
**Servicios utilizados:** `ConfigurationService.isTicketDisabled()`, `ConfigurationService.getDisabledTicketInfo()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "issueKey": "PROJ-123",
    "isDisabled": true,
    "ticketInfo": {
      "reason": "Manual disable",
      "disabledAt": "2024-01-01T00:00:00.000Z",
      "disabledBy": "admin"
    }
  }
}
```

**Respuestas de error:**
```json
// 400 - IssueKey no especificado
{
  "success": false,
  "error": "Se requiere el issueKey del ticket"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error verificando estado del ticket"
}
```

---

## 🔗 **WEBHOOKS**

### **POST /api/admin/webhook/configure**
**Funcionalidad:** Configurar webhook y asociar asistente
**Servicios utilizados:** `ConfigurationService.setWebhookUrl()`, `ConfigurationService.setWebhookEnabled()`, `OpenAIService.listAssistants()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "webhookUrl": "https://api-private.atlassian.com/automation/webhooks/jira/a/...",
  "assistantId": "asst_123"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Webhook configurado exitosamente",
  "data": {
    "webhookUrl": "https://api-private.atlassian.com/automation/webhooks/jira/a/...",
    "assistantId": "asst_123",
    "isEnabled": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Respuestas de error:**
```json
// 400 - URL no especificada
{
  "success": false,
  "error": "Se requiere la URL del webhook"
}

// 400 - Asistente no existe
{
  "success": false,
  "error": "El asistente especificado no existe"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error configurando webhook"
}
```

---

### **POST /api/admin/webhook/test**
**Funcionalidad:** Probar conexión con webhook configurado
**Servicios utilizados:** `WebhookService.testWebhook()`, `ConfigurationService.getWebhookUrl()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Webhook probado exitosamente",
  "data": {
    "status": "success",
    "responseTime": 150,
    "webhookUrl": "https://api-private.atlassian.com/automation/webhooks/jira/a/..."
  }
}
```

**Respuestas de error:**
```json
// 400 - Webhook no configurado
{
  "success": false,
  "error": "No hay webhook configurado"
}

// 500 - Error de conexión
{
  "success": false,
  "error": "Error probando webhook"
}
```

---

### **POST /api/admin/webhook/disable**
**Funcionalidad:** Deshabilitar webhook
**Servicios utilizados:** `ConfigurationService.setWebhookEnabled()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Webhook deshabilitado",
  "data": {
    "isEnabled": false
  }
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error deshabilitando webhook"
}
```

---

### **GET /api/admin/webhook/status**
**Funcionalidad:** Obtener estado actual del webhook
**Servicios utilizados:** `ConfigurationService.getWebhookUrl()`, `ConfigurationService.getWebhookEnabled()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "isEnabled": true,
    "webhookUrl": "https://api-private.atlassian.com/automation/webhooks/jira/a/...",
    "lastTest": "2024-01-01T00:00:00.000Z",
    "filterEnabled": false,
    "filterCondition": null,
    "filterValue": null
  }
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error obteniendo estado del webhook"
}
```

---

### **POST /api/admin/webhook/filter**
**Funcionalidad:** Configurar filtros del webhook
**Servicios utilizados:** `ConfigurationService.setWebhookFilter()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "filterEnabled": true,
  "filterCondition": "status",
  "filterValue": "Done"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Filtro configurado exitosamente",
  "data": {
    "filterEnabled": true,
    "filterCondition": "status",
    "filterValue": "Done"
  }
}
```

**Respuestas de error:**
```json
// 400 - Datos inválidos
{
  "success": false,
  "error": "filterCondition y filterValue son requeridos cuando filterEnabled es true"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error configurando filtro"
}
```

---

### **GET /api/admin/webhooks/saved**
**Funcionalidad:** Obtener webhooks guardados
**Servicios utilizados:** `DatabaseService.getSavedWebhooks()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": 1,
        "name": "Webhook Name",
        "url": "https://example.com/webhook",
        "description": "Webhook description",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error obteniendo webhooks guardados"
}
```

---

### **POST /api/admin/webhooks/save**
**Funcionalidad:** Guardar nuevo webhook
**Servicios utilizados:** `DatabaseService.saveWebhook()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "name": "Webhook Name",
  "url": "https://example.com/webhook",
  "description": "Webhook description"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Webhook guardado exitosamente",
  "data": {
    "id": 1,
    "name": "Webhook Name",
    "url": "https://example.com/webhook"
  }
}
```

**Respuestas de error:**
```json
// 400 - Datos inválidos
{
  "success": false,
  "error": "name y url son requeridos"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error guardando webhook"
}
```

---

### **DELETE /api/admin/webhooks/{id}**
**Funcionalidad:** Eliminar webhook guardado
**Servicios utilizados:** `DatabaseService.deleteSavedWebhook()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Webhook eliminado exitosamente"
}
```

**Respuestas de error:**
```json
// 404 - Webhook no encontrado
{
  "success": false,
  "error": "Webhook no encontrado"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error eliminando webhook"
}
```

---

## 👥 **USUARIOS (Solo Admin)**

### **GET /api/admin/users**
**Funcionalidad:** Listar todos los usuarios del sistema
**Servicios utilizados:** `User.findAll()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin",
        "isActive": true,
        "lastLogin": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Respuestas de error:**
```json
// 403 - Sin permisos de admin
{
  "success": false,
  "error": "Acceso denegado. Se requieren permisos de administrador"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **POST /api/admin/users**
**Funcionalidad:** Crear nuevo usuario
**Servicios utilizados:** `User.create()`, `bcrypt.hash()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "email": "user@example.com",
      "role": "user",
      "isActive": true
    }
  }
}
```

**Respuestas de error:**
```json
// 400 - Datos inválidos
{
  "success": false,
  "error": "Username, email y password son requeridos"
}

// 409 - Usuario ya existe
{
  "success": false,
  "error": "El username o email ya existe"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **PUT /api/admin/users/{id}**
**Funcionalidad:** Actualizar usuario existente
**Servicios utilizados:** `User.findByPk()`, `User.update()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "role": "user",
  "isActive": true
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "user": {
      "id": 2,
      "username": "updateduser",
      "email": "updated@example.com",
      "role": "user",
      "isActive": true
    }
  }
}
```

**Respuestas de error:**
```json
// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}

// 409 - Usuario ya existe
{
  "success": false,
  "error": "El username o email ya existe"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **DELETE /api/admin/users/{id}**
**Funcionalidad:** Eliminar usuario
**Servicios utilizados:** `User.findByPk()`, `User.destroy()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

**Respuestas de error:**
```json
// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **PUT /api/admin/users/{id}/password**
**Funcionalidad:** Cambiar contraseña de usuario
**Servicios utilizados:** `User.findByPk()`, `bcrypt.hash()`, `User.update()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "newPassword": "newpassword123"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

**Respuestas de error:**
```json
// 400 - Contraseña no especificada
{
  "success": false,
  "error": "newPassword es requerido"
}

// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **GET /api/admin/users/{id}/permissions**
**Funcionalidad:** Obtener permisos de un usuario específico
**Servicios utilizados:** `User.findByPk()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "permissions": {
      "serviceManagement": false,
      "automaticAIDisableRules": false,
      "webhookConfiguration": false,
      "ticketControl": false,
      "aiEnabledProjects": false,
      "remoteServerIntegration": false
    }
  }
}
```

**Respuestas de error:**
```json
// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

### **PUT /api/admin/users/{id}/permissions**
**Funcionalidad:** Actualizar permisos de un usuario
**Servicios utilizados:** `User.findByPk()`, `User.update()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "permissions": {
    "serviceManagement": true,
    "automaticAIDisableRules": false,
    "webhookConfiguration": true,
    "ticketControl": false,
    "aiEnabledProjects": true,
    "remoteServerIntegration": false
  }
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Permisos actualizados exitosamente",
  "data": {
    "permissions": {
      "serviceManagement": true,
      "automaticAIDisableRules": false,
      "webhookConfiguration": true,
      "ticketControl": false,
      "aiEnabledProjects": true,
      "remoteServerIntegration": false
    }
  }
}
```

**Respuestas de error:**
```json
// 400 - Permisos inválidos
{
  "success": false,
  "error": "Formato de permisos inválido"
}

// 404 - Usuario no encontrado
{
  "success": false,
  "error": "Usuario no encontrado"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error interno del servidor"
}
```

---

## ⚙️ **CONFIGURACIÓN DE ESTADOS**

### **GET /api/admin/status-disable/config**
**Funcionalidad:** Obtener configuración de deshabilitación por estado
**Servicios utilizados:** `ConfigurationService.getStatusBasedDisableConfig()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "isEnabled": true,
    "disabledStatuses": ["Done", "Closed", "Resolved"],
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

**Respuestas de error:**
```json
// 500 - Error interno
{
  "success": false,
  "error": "Error obteniendo configuración"
}
```

---

### **GET /api/admin/statuses/available**
**Funcionalidad:** Obtener estados disponibles de Jira
**Servicios utilizados:** `JiraService.getAvailableStatuses()`
**Headers:** `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "statuses": [
      {
        "id": "1",
        "name": "To Do",
        "description": "Task to be done"
      },
      {
        "id": "2", 
        "name": "Done",
        "description": "Task completed"
      }
    ]
  }
}
```

**Respuestas de error:**
```json
// 500 - Error de conexión con Jira
{
  "success": false,
  "error": "Error obteniendo estados de Jira"
}
```

---

### **POST /api/admin/status-disable/configure**
**Funcionalidad:** Configurar deshabilitación automática por estado
**Servicios utilizados:** `ConfigurationService.setStatusBasedDisableConfig()`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "isEnabled": true,
  "disabledStatuses": ["Done", "Closed"]
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración de estados actualizada",
  "data": {
    "isEnabled": true,
    "disabledStatuses": ["Done", "Closed"],
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

**Respuestas de error:**
```json
// 400 - Datos inválidos
{
  "success": false,
  "error": "isEnabled es requerido"
}

// 500 - Error interno
{
  "success": false,
  "error": "Error configurando estados"
}
```

---

## 🌐 **SERVIDOR REMOTO (Opcional)**

### **GET {remoteServerUrl}/api/projects/available**
**Funcionalidad:** Obtener proyectos disponibles del servidor remoto
**Servicios utilizados:** `fetch()` directo
**Headers:** Ninguno (público)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "key": "PROJ",
        "name": "Project Name"
      }
    ]
  }
}
```

**Respuestas de error:**
```json
// 500 - Error de conexión
{
  "success": false,
  "error": "Error conectando con servidor remoto"
}
```

---

### **GET {remoteServerUrl}/api/projects/current**
**Funcionalidad:** Obtener proyecto actual del servidor remoto
**Servicios utilizados:** `fetch()` directo
**Headers:** Ninguno (público)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "activeProject": "PROJ"
  }
}
```

**Respuestas de error:**
```json
// 500 - Error de conexión
{
  "success": false,
  "error": "Error conectando con servidor remoto"
}
```

---

### **POST {remoteServerUrl}/api/projects/set-active**
**Funcionalidad:** Establecer proyecto activo en servidor remoto
**Servicios utilizados:** `fetch()` directo
**Headers:** `Content-Type: application/json`
**Body:**
```json
{
  "projectKey": "PROJ"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Proyecto activo actualizado"
}
```

**Respuestas de error:**
```json
// 500 - Error de conexión
{
  "success": false,
  "error": "Error conectando con servidor remoto"
}
```

---

## 🚨 **Códigos de Estado HTTP Comunes**

- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Datos de entrada inválidos
- **401**: No autenticado o token inválido
- **403**: Sin permisos suficientes
- **404**: Recurso no encontrado
- **409**: Conflicto (recurso ya existe)
- **500**: Error interno del servidor

## 🔐 **Autenticación Requerida**

Todos los endpoints (excepto los del servidor remoto) requieren:
- **Header:** `Authorization: Bearer {token}`
- **Token JWT** válido obtenido del endpoint `/api/auth/login`
- **Permisos específicos** para endpoints de administración

## 📝 **Formato de Respuesta Estándar**

**Todas las respuestas siguen este formato:**
```json
{
  "success": boolean,
  "message": "string", // Solo en respuestas exitosas
  "data": {}, // Solo en respuestas exitosas
  "error": "string" // Solo en respuestas de error
}
```

---

## 📋 **RESUMEN DE RECURSOS NECESARIOS PARA MIGRACIÓN**

### **Archivos HTML:**
- ✅ `index.html` - Dashboard principal
- ✅ `login.html` - Página de login
- ✅ `ceo-dashboard.css` - Estilos del dashboard (CRÍTICO)

### **Recursos externos:**
- ✅ Font Awesome CDN
- ✅ Google Fonts (Inter)
- ✅ Favicons en `/favicons/`

### **Servicios backend requeridos:**
- ✅ `OpenAIService` - Gestión de asistentes IA
- ✅ `ConfigurationService` - Configuraciones del sistema
- ✅ `JiraService` - Integración con Jira
- ✅ `DatabaseService` - Persistencia de datos
- ✅ `WebhookService` - Envío a webhooks
- ✅ `UserConfigurationService` - Configuraciones por usuario
- ✅ `EmailService` - Envío de emails

### **Base de datos:**
- ✅ Tabla `users` con permisos granulares
- ✅ Tabla `service_configurations`
- ✅ Tabla `saved_webhooks`
- ✅ Tabla `webhook_stats`
- ✅ Otras tablas de soporte

### **Variables de entorno:**
```env
JWT_SECRET=tu_secreto_jwt
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...
JIRA_BASE_URL=https://movonte.atlassian.net
JIRA_EMAIL=user@example.com
JIRA_API_TOKEN=token_here
JIRA_PROJECT_KEY=CONTACT
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### **Dependencias NPM:**
```json
{
  "openai": "^4.0.0",
  "axios": "^1.6.0",
  "sequelize": "^6.0.0",
  "nodemailer": "^6.9.0",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "express": "^4.18.0"
}
```

**Esta documentación contiene TODO lo necesario para migrar el frontend `index.html` con funcionalidad completa.**

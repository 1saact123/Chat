# 🚀 Implementación: Servicios Personalizados por Usuario

## 📋 **Resumen**

Se ha implementado un sistema completo donde cada usuario puede configurar sus propios tokens de OpenAI y Jira, y crear servicios personalizados usando sus propios asistentes y proyectos.

## 🎯 **Características Implementadas**

### ✅ **Servicios Personalizados por Usuario**
- Cada usuario puede crear servicios usando sus propios asistentes de OpenAI
- Aislamiento completo entre usuarios
- Gestión independiente de servicios por usuario

### ✅ **Tokens por Usuario**
- Configuración de tokens de OpenAI por usuario
- Configuración de tokens y URL de Jira por usuario
- Validación de tokens en configuración inicial

### ✅ **Exclusión de Remote Server Integration**
- El servicio "Remote Server Integration" se mantiene como servicio dedicado del sistema
- No es personalizable por usuarios individuales

## 🏗️ **Arquitectura Implementada**

### **1. Servicios Especializados**
- `UserOpenAIService`: Maneja OpenAI con tokens del usuario
- `UserJiraService`: Maneja Jira con tokens del usuario
- `UserServiceController`: Controla servicios personalizados

### **2. Modelos de Base de Datos**
- `User`: Extendido con `jiraUrl`
- `UserConfiguration`: Configuraciones de servicios por usuario

### **3. Endpoints Implementados**

#### **Dashboard del Usuario**
```
GET /api/user/dashboard
```

#### **Gestión de Servicios**
```
POST   /api/user/services/create
GET    /api/user/services/list
PUT    /api/user/services/:serviceId
DELETE /api/user/services/:serviceId
```

#### **Chat con Servicios**
```
POST /api/user/services/:serviceId/chat
```

#### **Recursos del Usuario**
```
GET /api/user/assistants
GET /api/user/projects
```

#### **Endpoint Público**
```
GET /api/user/services/:serviceId/assistant
```

## 🔄 **Flujo de Usuario**

### **1. Configuración Inicial**
1. Admin crea usuario
2. Usuario hace primer login
3. Usuario configura tokens:
   - OpenAI API Key
   - Jira Token
   - Jira URL
4. Sistema valida tokens

### **2. Uso del Sistema**
1. Usuario accede a dashboard personalizado
2. Ve sus propios asistentes de OpenAI
3. Ve sus propios proyectos de Jira
4. Crea servicios personalizados
5. Usa servicios con sus propios tokens

### **3. Aislamiento**
- Cada usuario solo ve sus propios recursos
- Servicios completamente aislados
- Tokens seguros por usuario

## 📁 **Archivos Creados/Modificados**

### **Nuevos Archivos**
- `src/services/user_openai_service.ts`
- `src/services/user_jira_service.ts`
- `src/controllers/user_service_controller.ts`
- `src/scripts/add_jira_url_to_users.ts`

### **Archivos Modificados**
- `src/routes/index.ts` - Nuevas rutas
- `src/models/index.ts` - Campo jiraUrl agregado
- `src/controllers/user_controller.ts` - Configuración inicial actualizada

## 🚀 **Cómo Usar**

### **1. Ejecutar Migración**
```bash
npm run ts-node src/scripts/add_jira_url_to_users.ts
```

### **2. Configurar Usuario**
```javascript
// Configuración inicial
POST /api/user/setup/complete
{
  "jiraToken": "ATATT3xFfGF0...",
  "jiraUrl": "https://miempresa.atlassian.net",
  "openaiToken": "sk-..."
}
```

### **3. Crear Servicio**
```javascript
// Crear servicio personalizado
POST /api/user/services/create
{
  "serviceId": "mi-servicio",
  "serviceName": "Mi Servicio Personalizado",
  "assistantId": "asst_abc123...",
  "assistantName": "Mi Asistente"
}
```

### **4. Usar Servicio**
```javascript
// Chat con servicio personalizado
POST /api/user/services/mi-servicio/chat
{
  "message": "Hola, necesito ayuda",
  "threadId": "conversacion_123"
}
```

## 🔒 **Seguridad**

- Tokens encriptados en base de datos
- Aislamiento completo entre usuarios
- Validación de tokens en configuración
- Autenticación requerida para todos los endpoints

## 🎯 **Servicios Excluidos**

- **Remote Server Integration**: Servicio dedicado del sistema, no personalizable

## 📊 **Beneficios**

✅ **Aislamiento Completo**: Cada usuario tiene su propio entorno
✅ **Flexibilidad**: Usuarios pueden usar sus propios recursos
✅ **Escalabilidad**: Sistema soporta múltiples usuarios independientes
✅ **Seguridad**: Tokens separados y seguros por usuario
✅ **Simplicidad**: Configuración una sola vez por usuario

## 🌐 **Implementación Frontend**

### **Estructura de Endpoints y Respuestas**

#### **1. Dashboard del Usuario**
```http
GET /api/user/dashboard
Authorization: Bearer {token}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "data": {
    "assistants": [
      {
        "id": "asst_abc123...",
        "name": "Mi Asistente de Soporte",
        "instructions": "Eres un asistente especializado en soporte técnico...",
        "model": "gpt-4",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "projects": [
      {
        "id": "10001",
        "key": "SUPPORT",
        "name": "Soporte Técnico",
        "description": "Proyecto de soporte al cliente"
      }
    ],
    "serviceConfigurations": [
      {
        "serviceId": "soporte-tecnico",
        "serviceName": "Soporte Técnico",
        "assistantId": "asst_abc123...",
        "assistantName": "Mi Asistente de Soporte",
        "isActive": true,
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "totalAssistants": 3,
    "totalProjects": 5,
    "totalServices": 2
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### **2. Crear Servicio**
```http
POST /api/user/services/create
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "serviceId": "ventas-online",
  "serviceName": "Asistente de Ventas Online",
  "assistantId": "asst_xyz789...",
  "assistantName": "Vendedor Virtual"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Servicio 'Asistente de Ventas Online' creado exitosamente",
  "data": {
    "serviceId": "ventas-online",
    "serviceName": "Asistente de Ventas Online",
    "assistantId": "asst_xyz789...",
    "assistantName": "Vendedor Virtual",
    "isActive": true,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "error": "El asistente especificado no existe en tu cuenta"
}
```

#### **3. Listar Servicios del Usuario**
```http
GET /api/user/services/list
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "soporte-tecnico",
      "serviceName": "Soporte Técnico",
      "assistantId": "asst_abc123...",
      "assistantName": "Mi Asistente de Soporte",
      "isActive": true,
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    {
      "serviceId": "ventas-online",
      "serviceName": "Asistente de Ventas Online",
      "assistantId": "asst_xyz789...",
      "assistantName": "Vendedor Virtual",
      "isActive": false,
      "lastUpdated": "2024-01-15T09:15:00Z"
    }
  ]
}
```

#### **4. Actualizar Servicio**
```http
PUT /api/user/services/{serviceId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "assistantId": "asst_new123...",
  "assistantName": "Nuevo Asistente",
  "isActive": true
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Servicio 'soporte-tecnico' actualizado exitosamente",
  "data": {
    "serviceId": "soporte-tecnico",
    "serviceName": "Soporte Técnico",
    "assistantId": "asst_new123...",
    "assistantName": "Nuevo Asistente",
    "isActive": true,
    "lastUpdated": "2024-01-15T11:00:00Z"
  }
}
```

#### **5. Eliminar Servicio**
```http
DELETE /api/user/services/{serviceId}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Servicio 'ventas-online' eliminado exitosamente"
}
```

#### **6. Chat con Servicio**
```http
POST /api/user/services/{serviceId}/chat
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Necesito ayuda con un problema técnico",
  "threadId": "thread_123" // opcional
}
```

**Respuesta:**
```json
{
  "success": true,
  "response": "Hola, estoy aquí para ayudarte con tu problema técnico. ¿Podrías describir qué está pasando?",
  "threadId": "thread_123",
  "assistantId": "asst_abc123...",
  "assistantName": "Mi Asistente de Soporte"
}
```

#### **7. Listar Asistentes del Usuario**
```http
GET /api/user/assistants
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "asst_abc123...",
      "name": "Mi Asistente de Soporte",
      "instructions": "Eres un asistente especializado en soporte técnico...",
      "model": "gpt-4",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "asst_xyz789...",
      "name": "Vendedor Virtual",
      "instructions": "Eres un asistente de ventas especializado...",
      "model": "gpt-4",
      "createdAt": "2024-01-14T15:20:00Z"
    }
  ]
}
```

#### **8. Listar Proyectos Jira del Usuario**
```http
GET /api/user/projects
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "10001",
      "key": "SUPPORT",
      "name": "Soporte Técnico",
      "description": "Proyecto de soporte al cliente"
    },
    {
      "id": "10002",
      "key": "SALES",
      "name": "Ventas",
      "description": "Proyecto de gestión de ventas"
    }
  ]
}
```

#### **9. Obtener Asistente Activo (Endpoint Público)**
```http
GET /api/user/services/{serviceId}/assistant
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "assistantId": "asst_abc123...",
    "assistantName": "Mi Asistente de Soporte",
    "serviceName": "Soporte Técnico"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### **Código Frontend de Ejemplo**

#### **1. Clase Principal para Gestión de Servicios**
```javascript
class UserServiceManager {
  constructor() {
    this.authToken = localStorage.getItem('authToken');
    this.baseUrl = window.location.origin;
  }

  // Método helper para requests autenticados
  async authenticatedFetch(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token expirado, redirigir al login
      window.location.href = '/login';
      return null;
    }

    return response;
  }

  // Cargar dashboard del usuario
  async loadUserDashboard() {
    try {
      const response = await this.authenticatedFetch('/api/user/dashboard');
      if (!response) return null;
      
      const data = await response.json();
      
      if (data.success) {
        return {
          assistants: data.data.assistants,
          projects: data.data.projects,
          services: data.data.serviceConfigurations,
          stats: {
            totalAssistants: data.data.totalAssistants,
            totalProjects: data.data.totalProjects,
            totalServices: data.data.totalServices
          }
        };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading user dashboard:', error);
      throw error;
    }
  }

  // Crear nuevo servicio
  async createService(serviceData) {
    try {
      const response = await this.authenticatedFetch('/api/user/services/create', {
        method: 'POST',
        body: JSON.stringify(serviceData)
      });
      
      if (!response) return null;
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  // Listar servicios del usuario
  async getUserServices() {
    try {
      const response = await this.authenticatedFetch('/api/user/services/list');
      if (!response) return null;
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting user services:', error);
      return [];
    }
  }

  // Actualizar servicio
  async updateService(serviceId, updateData) {
    try {
      const response = await this.authenticatedFetch(`/api/user/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (!response) return null;
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  // Eliminar servicio
  async deleteService(serviceId) {
    try {
      const response = await this.authenticatedFetch(`/api/user/services/${serviceId}`, {
        method: 'DELETE'
      });
      
      if (!response) return false;
      const data = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('Error deleting service:', error);
      return false;
    }
  }

  // Chat con servicio
  async chatWithService(serviceId, message, threadId = null) {
    try {
      const response = await this.authenticatedFetch(`/api/user/services/${serviceId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, threadId })
      });
      
      if (!response) return null;
      const data = await response.json();
      
      if (data.success) {
        return {
          response: data.response,
          threadId: data.threadId,
          assistantId: data.assistantId,
          assistantName: data.assistantName
        };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error chatting with service:', error);
      throw error;
    }
  }

  // Listar asistentes del usuario
  async getUserAssistants() {
    try {
      const response = await this.authenticatedFetch('/api/user/assistants');
      if (!response) return [];
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting user assistants:', error);
      return [];
    }
  }

  // Listar proyectos Jira del usuario
  async getUserProjects() {
    try {
      const response = await this.authenticatedFetch('/api/user/projects');
      if (!response) return [];
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting user projects:', error);
      return [];
    }
  }
}
```

#### **2. Componente de Dashboard del Usuario**
```javascript
class UserDashboard {
  constructor() {
    this.serviceManager = new UserServiceManager();
    this.assistants = [];
    this.projects = [];
    this.services = [];
    this.init();
  }

  async init() {
    try {
      await this.loadDashboard();
      this.renderDashboard();
      this.setupEventListeners();
    } catch (error) {
      this.showError('Error cargando dashboard: ' + error.message);
    }
  }

  async loadDashboard() {
    const dashboardData = await this.serviceManager.loadUserDashboard();
    
    if (dashboardData) {
      this.assistants = dashboardData.assistants;
      this.projects = dashboardData.projects;
      this.services = dashboardData.services;
      this.stats = dashboardData.stats;
    }
  }

  renderDashboard() {
    this.renderStats();
    this.renderAssistants();
    this.renderProjects();
    this.renderServices();
  }

  renderStats() {
    const statsContainer = document.getElementById('user-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-number">${this.stats.totalAssistants}</div>
          <div class="stat-label">Mis Asistentes</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${this.stats.totalProjects}</div>
          <div class="stat-label">Mis Proyectos Jira</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${this.stats.totalServices}</div>
          <div class="stat-label">Mis Servicios</div>
        </div>
      `;
    }
  }

  renderAssistants() {
    const assistantsContainer = document.getElementById('user-assistants');
    if (assistantsContainer) {
      assistantsContainer.innerHTML = this.assistants.map(assistant => `
        <div class="assistant-card">
          <h4>${assistant.name}</h4>
          <p><strong>ID:</strong> ${assistant.id}</p>
          <p><strong>Modelo:</strong> ${assistant.model}</p>
          <p><strong>Creado:</strong> ${new Date(assistant.createdAt).toLocaleDateString()}</p>
        </div>
      `).join('');
    }
  }

  renderProjects() {
    const projectsContainer = document.getElementById('user-projects');
    if (projectsContainer) {
      projectsContainer.innerHTML = this.projects.map(project => `
        <div class="project-card">
          <h4>${project.name}</h4>
          <p><strong>Key:</strong> ${project.key}</p>
          <p><strong>ID:</strong> ${project.id}</p>
          ${project.description ? `<p>${project.description}</p>` : ''}
        </div>
      `).join('');
    }
  }

  renderServices() {
    const servicesContainer = document.getElementById('user-services');
    if (servicesContainer) {
      servicesContainer.innerHTML = this.services.map(service => `
        <div class="service-card">
          <div class="service-header">
            <h4>${service.serviceName}</h4>
            <span class="service-status ${service.isActive ? 'active' : 'inactive'}">
              ${service.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div class="service-details">
            <p><strong>ID:</strong> ${service.serviceId}</p>
            <p><strong>Asistente:</strong> ${service.assistantName}</p>
            <p><strong>Última actualización:</strong> ${new Date(service.lastUpdated).toLocaleString()}</p>
          </div>
          <div class="service-actions">
            <button onclick="userDashboard.testService('${service.serviceId}')" class="btn btn-primary">
              Probar Chat
            </button>
            <button onclick="userDashboard.editService('${service.serviceId}')" class="btn btn-secondary">
              Editar
            </button>
            <button onclick="userDashboard.deleteService('${service.serviceId}')" class="btn btn-danger">
              Eliminar
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  setupEventListeners() {
    // Botón para crear nuevo servicio
    const createServiceBtn = document.getElementById('create-service-btn');
    if (createServiceBtn) {
      createServiceBtn.addEventListener('click', () => this.showCreateServiceModal());
    }
  }

  async showCreateServiceModal() {
    // Cargar asistentes para el dropdown
    const assistants = await this.serviceManager.getUserAssistants();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Crear Nuevo Servicio</h3>
          <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="create-service-form">
            <div class="form-group">
              <label for="service-id">ID del Servicio:</label>
              <input type="text" id="service-id" required placeholder="mi-servicio">
            </div>
            <div class="form-group">
              <label for="service-name">Nombre del Servicio:</label>
              <input type="text" id="service-name" required placeholder="Mi Servicio Personalizado">
            </div>
            <div class="form-group">
              <label for="assistant-select">Asistente:</label>
              <select id="assistant-select" required>
                <option value="">Seleccionar asistente...</option>
                ${assistants.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Crear Servicio</button>
              <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Manejar envío del formulario
    document.getElementById('create-service-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const serviceId = document.getElementById('service-id').value;
      const serviceName = document.getElementById('service-name').value;
      const assistantId = document.getElementById('assistant-select').value;
      const assistantName = assistants.find(a => a.id === assistantId)?.name || '';

      try {
        await this.serviceManager.createService({
          serviceId,
          serviceName,
          assistantId,
          assistantName
        });

        this.showSuccess('Servicio creado exitosamente');
        modal.remove();
        await this.loadDashboard();
        this.renderServices();
      } catch (error) {
        this.showError('Error creando servicio: ' + error.message);
      }
    });
  }

  async testService(serviceId) {
    const message = prompt('Escribe tu mensaje para probar el servicio:');
    if (!message) return;

    try {
      const result = await this.serviceManager.chatWithService(serviceId, message);
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Prueba de Servicio: ${serviceId}</h3>
            <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
          </div>
          <div class="modal-body">
            <div class="chat-test">
              <div class="message user-message">
                <strong>Tú:</strong> ${message}
              </div>
              <div class="message assistant-message">
                <strong>${result.assistantName}:</strong> ${result.response}
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
    } catch (error) {
      this.showError('Error probando servicio: ' + error.message);
    }
  }

  async deleteService(serviceId) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el servicio '${serviceId}'?`)) {
      return;
    }

    try {
      const success = await this.serviceManager.deleteService(serviceId);
      
      if (success) {
        this.showSuccess('Servicio eliminado exitosamente');
        await this.loadDashboard();
        this.renderServices();
      } else {
        this.showError('Error eliminando servicio');
      }
    } catch (error) {
      this.showError('Error eliminando servicio: ' + error.message);
    }
  }

  showSuccess(message) {
    // Implementar notificación de éxito
    console.log('Success:', message);
  }

  showError(message) {
    // Implementar notificación de error
    console.error('Error:', message);
  }
}

// Inicializar dashboard cuando se carga la página
let userDashboard;
document.addEventListener('DOMContentLoaded', () => {
  userDashboard = new UserDashboard();
});
```

#### **3. HTML de Ejemplo para el Dashboard**
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Dashboard - Servicios Personalizados</title>
    <style>
        .dashboard-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        
        .stat-label {
            color: #6c757d;
            margin-top: 5px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h3 {
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        
        .assistants-grid, .projects-grid, .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .assistant-card, .project-card, .service-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .service-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .service-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .service-status.active {
            background: #d4edda;
            color: #155724;
        }
        
        .service-status.inactive {
            background: #f8d7da;
            color: #721c24;
        }
        
        .service-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: #007bff;
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: white;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        
        .chat-test {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
        }
        
        .user-message {
            background: #e3f2fd;
            margin-left: 20px;
        }
        
        .assistant-message {
            background: #f3e5f5;
            margin-right: 20px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <h1>Mi Dashboard - Servicios Personalizados</h1>
        
        <!-- Estadísticas -->
        <div class="section">
            <h3>Estadísticas</h3>
            <div class="stats-grid" id="user-stats">
                <!-- Se llena dinámicamente -->
            </div>
        </div>
        
        <!-- Botón para crear servicio -->
        <div class="section">
            <button id="create-service-btn" class="btn btn-primary">Crear Nuevo Servicio</button>
        </div>
        
        <!-- Mis Asistentes -->
        <div class="section">
            <h3>Mis Asistentes de OpenAI</h3>
            <div class="assistants-grid" id="user-assistants">
                <!-- Se llena dinámicamente -->
            </div>
        </div>
        
        <!-- Mis Proyectos Jira -->
        <div class="section">
            <h3>Mis Proyectos Jira</h3>
            <div class="projects-grid" id="user-projects">
                <!-- Se llena dinámicamente -->
            </div>
        </div>
        
        <!-- Mis Servicios -->
        <div class="section">
            <h3>Mis Servicios Personalizados</h3>
            <div class="services-grid" id="user-services">
                <!-- Se llena dinámicamente -->
            </div>
        </div>
    </div>
    
    <script src="user-dashboard.js"></script>
</body>
</html>
```

### **Ejemplos de Uso Completos**

#### **1. Configuración Inicial del Usuario**
```javascript
// Después del primer login, configurar tokens
async function completeInitialSetup() {
  const setupData = {
    jiraToken: 'ATATT3xFfGF0...',
    jiraUrl: 'https://miempresa.atlassian.net',
    openaiToken: 'sk-...'
  };

  try {
    const response = await fetch('/api/user/setup/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(setupData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Configuración completada exitosamente');
      // Redirigir al dashboard
      window.location.href = '/user-dashboard.html';
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Error en configuración:', error);
  }
}
```

#### **2. Flujo Completo de Creación y Uso de Servicio**
```javascript
async function createAndUseService() {
  const serviceManager = new UserServiceManager();
  
  try {
    // 1. Crear servicio
    const newService = await serviceManager.createService({
      serviceId: 'soporte-cliente',
      serviceName: 'Soporte al Cliente',
      assistantId: 'asst_abc123...',
      assistantName: 'Asistente de Soporte'
    });
    
    console.log('Servicio creado:', newService);
    
    // 2. Probar el servicio
    const chatResult = await serviceManager.chatWithService(
      'soporte-cliente',
      'Hola, necesito ayuda con mi pedido',
      'thread_123'
    );
    
    console.log('Respuesta del asistente:', chatResult.response);
    
    // 3. Continuar la conversación
    const followUp = await serviceManager.chatWithService(
      'soporte-cliente',
      'Mi número de pedido es 12345',
      chatResult.threadId // Usar el mismo thread
    );
    
    console.log('Seguimiento:', followUp.response);
    
  } catch (error) {
    console.error('Error en el flujo:', error);
  }
}
```

#### **3. Gestión Completa de Servicios**
```javascript
async function manageUserServices() {
  const serviceManager = new UserServiceManager();
  
  try {
    // Listar servicios existentes
    const services = await serviceManager.getUserServices();
    console.log('Servicios actuales:', services);
    
    // Actualizar un servicio
    if (services.length > 0) {
      const updatedService = await serviceManager.updateService(
        services[0].serviceId,
        {
          isActive: false,
          assistantName: 'Nuevo Nombre del Asistente'
        }
      );
      console.log('Servicio actualizado:', updatedService);
    }
    
    // Eliminar un servicio
    if (services.length > 1) {
      const deleted = await serviceManager.deleteService(services[1].serviceId);
      console.log('Servicio eliminado:', deleted);
    }
    
  } catch (error) {
    console.error('Error gestionando servicios:', error);
  }
}
```

## 🔧 **Próximos Pasos**

1. Ejecutar migración de base de datos
2. Probar configuración inicial de usuarios
3. Verificar aislamiento entre usuarios
4. Implementar frontend usando los ejemplos proporcionados
5. Agregar validaciones adicionales de tokens
6. Crear tests para los nuevos endpoints

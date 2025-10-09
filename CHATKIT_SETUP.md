# Configuración de ChatKit de OpenAI

## Variables de entorno requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# Configuración de OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Configuración de ChatKit de OpenAI
OPENAI_CHATKIT_WORKFLOW_ID=wf_your_workflow_id_here
```

## Pasos para configurar ChatKit

### 1. Obtener API Key de OpenAI
1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys" en el menú
4. Crea una nueva API key
5. Copia la key y agrégala a tu archivo `.env`

### 2. Crear un Workflow en Agent Builder
1. Ve a [Agent Builder](https://platform.openai.com/agent-builder)
2. Crea un nuevo workflow
3. Configura las herramientas y prompts que necesites
4. Guarda el workflow y copia el ID (formato: `wf_xxxxxxxxx`)
5. Agrégala a tu archivo `.env` como `OPENAI_CHATKIT_WORKFLOW_ID`

### 3. Configuración del Workflow

Para el sistema Movonte, recomendamos configurar el workflow con:

- **System Message**: "Eres un asistente de IA especializado en ayudar con tareas administrativas y de gestión del sistema Movonte Dashboard. Puedes ayudar con consultas sobre proyectos, usuarios, servicios, tickets y configuraciones del sistema."

- **Herramientas disponibles**:
  - `search`: Para buscar información
  - `file_upload`: Para manejar archivos
  - `code_interpreter`: Para análisis de código

- **Límites**:
  - Max messages: 100
  - Timeout: 30 segundos

## Endpoints disponibles

Una vez configurado, tendrás acceso a estos endpoints:

- `POST /api/chatkit/session` - Crear nueva sesión
- `POST /api/chatkit/refresh` - Refrescar sesión existente
- `GET /api/chatkit/session/:sessionId` - Obtener información de sesión
- `DELETE /api/chatkit/session/:sessionId` - Eliminar sesión
- `GET /api/chatkit/stats` - Obtener estadísticas de uso

## Uso en el Frontend

El componente `ChatKitWidget` ya está integrado en el Dashboard y se conectará automáticamente con el backend una vez configurado.

## Troubleshooting

### Error: "No workflow ID configured"
- Verifica que `OPENAI_CHATKIT_WORKFLOW_ID` esté configurado en tu `.env`
- Asegúrate de que el workflow ID tenga el formato correcto (`wf_xxxxxxxxx`)

### Error: "Invalid API key"
- Verifica que `OPENAI_API_KEY` esté configurado correctamente
- Asegúrate de que la API key tenga permisos para ChatKit

### Error: "Workflow not found"
- Verifica que el workflow ID sea correcto
- Asegúrate de que el workflow esté publicado y activo en Agent Builder

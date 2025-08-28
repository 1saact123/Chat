# 🔍 Guía de Solución de Problemas - Webhooks de Jira

## ✅ Estado Actual
- ✅ Servidor responde correctamente (Status 200)
- ✅ Endpoint GET funciona: `https://chat.movonte.com/api/webhook/jira`
- ✅ Endpoint POST funciona: `https://chat.movonte.com/api/webhook/jira`
- ✅ Endpoint del chatbot funciona: `https://chat.movonte.com/api/chatbot/webhook/jira`

## 🎯 Problema Identificado
El servidor está funcionando correctamente, pero **Jira no está enviando los webhooks**. Esto indica un problema en la configuración del webhook en Jira.

## 🔧 Pasos para Solucionar

### 1. Verificar Configuración del Webhook en Jira

#### A. Ir a la Configuración del Webhook
1. Ve a **Administración de Jira** → **Sistema** → **Webhooks**
2. Busca el webhook configurado para `https://chat.movonte.com/api/webhook/jira`

#### B. Verificar Configuración
- **URL**: `https://chat.movonte.com/api/webhook/jira`
- **Eventos**: Debe incluir `Comment created`
- **Estado**: Debe estar **Habilitado**
- **Filtros**: Verificar que no haya filtros que bloqueen los eventos

### 2. Crear un Nuevo Webhook de Prueba

#### A. Crear Webhook en Jira
1. **Administración de Jira** → **Sistema** → **Webhooks**
2. Click en **Crear webhook**
3. Configurar:
   - **Nombre**: `Movonte Chat Test`
   - **URL**: `https://chat.movonte.com/api/webhook/jira`
   - **Eventos**: Seleccionar solo `Comment created`
   - **Filtros**: Sin filtros (para pruebas)

#### B. Probar el Webhook
1. Ir a cualquier issue en Jira
2. Agregar un comentario
3. Verificar en los logs del servidor si llega el webhook

### 3. Verificar Logs del Servidor

#### A. En tu servidor EC2, ejecutar:
```bash
# Ver logs de nginx
sudo tail -f /var/log/nginx/chat_movonte_access.log

# Ver logs de la aplicación (si usas PM2)
pm2 logs

# O si ejecutas directamente
# Los logs aparecerán en la terminal donde ejecutes npm start
```

#### B. Buscar en los logs:
- Peticiones POST a `/api/webhook/jira`
- Errores 4xx o 5xx
- Headers de Jira

### 4. Probar con Herramientas Externas

#### A. Usar webhook.site para pruebas
1. Ir a https://webhook.site
2. Copiar la URL generada
3. Crear un webhook temporal en Jira con esa URL
4. Hacer un comentario en Jira
5. Verificar si llega a webhook.site

#### B. Si llega a webhook.site pero no a tu servidor:
- Problema de conectividad o configuración de red
- Verificar firewall, DNS, etc.

### 5. Verificar Configuración de Red

#### A. Verificar DNS
```bash
nslookup chat.movonte.com
dig chat.movonte.com
```

#### B. Verificar Puertos
```bash
# En tu servidor EC2
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80
```

#### C. Verificar Firewall
```bash
# Verificar UFW
sudo ufw status

# Verificar reglas de AWS Security Groups
# Ir a AWS Console → EC2 → Security Groups
```

### 6. Configuración Alternativa del Webhook

#### A. Probar con URL HTTP (temporalmente)
1. Crear webhook con URL: `http://chat.movonte.com/api/webhook/jira`
2. Verificar si llega (solo para diagnóstico)

#### B. Probar con subdominio diferente
1. Crear webhook con URL: `https://api.movonte.com/api/webhook/jira`
2. Configurar DNS y nginx para el subdominio

### 7. Verificar Headers de Jira

#### A. Headers que debe enviar Jira:
- `Content-Type: application/json`
- `User-Agent: Atlassian Webhook HTTP Client`
- `X-Atlassian-Webhook-Identifier` (opcional)

#### B. Verificar en los logs si llegan estos headers

### 8. Configuración de Jira Específica

#### A. Verificar Permisos
- El usuario que creó el webhook debe tener permisos de administración
- Verificar que el proyecto tenga webhooks habilitados

#### B. Verificar Configuración del Proyecto
- Ir al proyecto específico
- Verificar configuración de webhooks
- Asegurar que los eventos estén habilitados

## 🚨 Problemas Comunes

### 1. Webhook Deshabilitado
- **Síntoma**: No llegan webhooks
- **Solución**: Habilitar el webhook en Jira

### 2. Filtros Muy Restrictivos
- **Síntoma**: Algunos eventos llegan, otros no
- **Solución**: Revisar filtros del webhook

### 3. Problema de DNS
- **Síntoma**: Jira no puede resolver el dominio
- **Solución**: Verificar configuración DNS

### 4. Firewall Bloqueando
- **Síntoma**: Conexiones rechazadas
- **Solución**: Verificar reglas de firewall

### 5. Certificado SSL Inválido
- **Síntoma**: Errores SSL
- **Solución**: Verificar certificado SSL

## 📋 Checklist de Verificación

- [ ] Webhook está habilitado en Jira
- [ ] URL del webhook es correcta
- [ ] Eventos están configurados correctamente
- [ ] No hay filtros restrictivos
- [ ] DNS resuelve correctamente
- [ ] Puerto 443 está abierto
- [ ] Firewall permite conexiones
- [ ] Certificado SSL es válido
- [ ] Servidor responde correctamente
- [ ] Logs muestran actividad

## 🔄 Próximos Pasos

1. **Verificar configuración del webhook en Jira**
2. **Crear un webhook de prueba**
3. **Revisar logs del servidor**
4. **Probar con webhook.site**
5. **Verificar configuración de red**

## 📞 Si el problema persiste

1. Revisar logs completos del servidor
2. Verificar configuración de AWS Security Groups
3. Probar con un dominio diferente
4. Contactar soporte de Atlassian si es necesario

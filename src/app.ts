import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

import routes from './routes';
import { validateEnvironmentVariables } from './utils/validations';

class MovonteAPI {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  // ✅ Función helper para detectar conexión HTTPS
  private isSecureConnection(req: Request): boolean {
    return req.secure || req.get('X-Forwarded-Proto') === 'https';
  }

  private setupMiddleware(): void {
    // Seguridad - configuración más permisiva para desarrollo
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    // CORS - MEJORADO para webhooks de Jira
    this.app.use(cors({
      origin: (origin, callback) => {
        console.log('🔍 CORS check for origin:', origin);
        
        // ✅ CRÍTICO: Permitir requests sin origin (webhooks de Jira)
        if (!origin) {
          console.log('✅ Request without origin allowed (webhook/server-to-server)');
          return callback(null, true);
        }
        
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'https://chat.movonte.com', 
          'https://movonte.com',
          'https://www.movonte.com',
          'https://*.atlassian.net',  // Permitir todos los subdominios de Atlassian
          'https://atlassian.net'
        ];
        
        console.log('📋 Allowed origins:', allowedOrigins);
        
        // Verificar si el origin coincide con algún patrón permitido
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed.includes('*')) {
            const pattern = allowed.replace('*', '.*');
            return new RegExp(pattern).test(origin);
          }
          return allowed === origin;
        });
        
        if (isAllowed) {
          console.log('✅ Origin allowed:', origin);
          callback(null, true);
        } else {
          console.log('❌ Origin blocked:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Atlassian-Webhook-Identifier']
    }));
    
    // ✅ Middleware corregido para detectar HTTPS desde proxy
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // Agregar métodos helper al request para detectar HTTPS
      (req as any).isSecure = () => this.isSecureConnection(req);
      (req as any).detectedProtocol = this.isSecureConnection(req) ? 'https' : 'http';
      
      next();
    });
    
    // Logging
    this.app.use(morgan('combined'));
    
    // Parsing del body
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Servir archivos estáticos
    this.app.use(express.static('public'));

    // Headers adicionales
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('X-Powered-By', 'Movonte API');
      next();
    });
  }

  private setupRoutes(): void {
    // Usar todas las rutas
    this.app.use('/', routes);

    // Ruta por defecto
    this.app.get('/', (req: Request, res: Response) => {
      // ✅ Usar la función helper corregida
      const protocol = (req as any).detectedProtocol;
      const host = req.get('X-Forwarded-Host') || req.get('host') || `localhost:${this.port}`;
      const baseUrl = `${protocol}://${host}`;

      res.json({
        message: 'Movonte API - Chatbot & Contact Service',
        version: '1.0.0',
        status: 'running',
        protocol: protocol.toUpperCase(),
        proxy_detected: !!req.get('X-Forwarded-Proto'),
        secure_connection: (req as any).isSecure(),
        endpoints: {
          health: `${baseUrl}/health`,
          contact: `${baseUrl}/api/contact`,
          chatbot: `${baseUrl}/api/chatbot/*`,
          jiraTest: `${baseUrl}/api/contact/test-jira`,
          webhook: `${baseUrl}/api/chatbot/webhook/jira`
        },
        documentation: 'https://github.com/movonte/api-docs',
        timestamp: new Date().toISOString()
      });
    });

    // Ruta 404
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: {
          health: 'GET /health',
          contact: 'POST /api/contact',
          jiraTest: 'GET /api/contact/test-jira',
          chatbotWebhook: 'POST /api/chatbot/webhook/jira',
          directChat: 'POST /api/chatbot/chat',
          threadHistory: 'GET /api/chatbot/thread/:threadId',
          activeThreads: 'GET /api/chatbot/threads'
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // Manejo global de errores
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Global error handler:', error.message);
      
      // Error específico de CORS
      if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
          success: false,
          error: 'CORS: Origin not allowed',
          origin: req.get('origin') || 'undefined',
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.message,
          stack: error.stack 
        })
      });
    });

    // Manejo de promesas rechazadas
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Promesa rechazada no manejada:', reason);
    });

    // Manejo de excepciones no capturadas
    process.on('uncaughtException', (error) => {
      console.error('Excepción no capturada:', error);
      process.exit(1);
    });
  }

  public start(): void {
    // Solo servidor HTTP - nginx maneja HTTPS
    this.app.listen(this.port, '127.0.0.1', () => {
      console.log('\nMovonte API iniciada exitosamente!');
      console.log('📦 Running behind nginx reverse proxy');
      console.log(`🚀 Servidor ejecutándose en puerto ${this.port}`);
      console.log(`📡 URL: http://localhost:${this.port}`);
      console.log('\nEndpoints disponibles:');
      console.log(`   Health Check: http://localhost:${this.port}/health`);
      console.log(`   Contact Form: POST http://localhost:${this.port}/api/contact`);
      console.log(`   Jira Test: http://localhost:${this.port}/api/contact/test-jira`);
      console.log(`   Chatbot Webhook: POST http://localhost:${this.port}/api/chatbot/webhook/jira`);
      console.log(`   Direct Chat: POST http://localhost:${this.port}/api/chatbot/chat`);
      console.log('\n✅ API lista para recibir solicitudes (incluye webhooks de Jira)');
      console.log('🔗 Public URL: https://chat.movonte.com\n');
    });
  }
}

// Iniciar la aplicación
if (require.main === module) {
  console.log('🔍 Validando configuración...');
  validateEnvironmentVariables();
  
  console.log('🚀 Iniciando Movonte API...');
  const api = new MovonteAPI();
  api.start();
}

export default MovonteAPI;
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
    
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000', 
        'https://movonte.com',
        'https://www.movonte.com'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
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
      res.json({
        message: 'Movonte API - Chatbot & Contact Service',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          contact: '/api/contact',
          chatbot: '/api/chatbot/*'
        },
        documentation: 'https://github.com/movonte/api-docs'
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
      console.error('Error no manejado:', error);
      
      res.status(500).json({
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
    this.app.listen(this.port, () => {
      console.log('\nMovonte API iniciada exitosamente!');
      console.log(`Servidor ejecutándose en puerto ${this.port}`);
      console.log(`URL: http://localhost:${this.port}`);
      console.log('\nEndpoints disponibles:');
      console.log(`   Health Check: http://localhost:${this.port}/health`);
      console.log(`   Contact Form: POST http://localhost:${this.port}/api/contact`);
      console.log(`   Jira Test: http://localhost:${this.port}/api/contact/test-jira`);
      console.log(`   Chatbot Webhook: POST http://localhost:${this.port}/api/chatbot/webhook/jira`);
      console.log(`   Direct Chat: POST http://localhost:${this.port}/api/chatbot/chat`);
      console.log('\nAPI lista para recibir solicitudes\n');
    });
  }
}

// Iniciar la aplicación
if (require.main === module) {
  console.log('Validando configuración...');
  validateEnvironmentVariables();
  
  console.log('Iniciando Movonte API...');
  const api = new MovonteAPI();
  api.start();
}

export default MovonteAPI;
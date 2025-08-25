import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

import routes from './routes';
import { validateEnvironmentVariables } from './utils/validations';

interface SSLOptions {
  key: Buffer;
  cert: Buffer;
  ca?: Buffer;
}

class MovonteAPI {
  private app: express.Application;
  private port: number;
  private httpsPort: number;
  private enableHttps: boolean;
  private sslOptions: SSLOptions | null = null;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.httpsPort = parseInt(process.env.HTTPS_PORT || '3443');
    this.enableHttps = process.env.ENABLE_HTTPS === 'true';
    
    this.loadSSLCertificates();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private loadSSLCertificates(): void {
    if (!this.enableHttps) {
      console.log('HTTPS deshabilitado - ejecutando solo en HTTP');
      return;
    }

    try {
      const keyPath = process.env.SSL_KEY_PATH || './ssl/private.key';
      const certPath = process.env.SSL_CERT_PATH || './ssl/certificate.crt';
      const caPath = process.env.SSL_CA_PATH; // Opcional para certificados intermedios

      // Verificar que los archivos existan
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Archivo de clave SSL no encontrado: ${keyPath}`);
      }
      if (!fs.existsSync(certPath)) {
        throw new Error(`Archivo de certificado SSL no encontrado: ${certPath}`);
      }

      this.sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      // Cargar certificado intermedio si está disponible
      if (caPath && fs.existsSync(caPath)) {
        this.sslOptions.ca = fs.readFileSync(caPath);
      }

      console.log('✅ Certificados SSL cargados correctamente');
    } catch (error) {
      console.error('❌ Error cargando certificados SSL:', error);
      console.log('Continuando sin HTTPS...');
      this.enableHttps = false;
    }
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
      // Configuración adicional para HTTPS
      hsts: this.enableHttps ? {
        maxAge: 31536000, // 1 año
        includeSubDomains: true,
        preload: true
      } : false
    }));

    // Middleware para redireccionar HTTP a HTTPS en producción
    if (this.enableHttps && process.env.NODE_ENV === 'production') {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
          return res.redirect(301, `https://${req.get('host')}${req.url}`);
        }
        next();
      });
    }
    
    // CORS - actualizado para HTTPS
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000', 
      'https://localhost:3443',
      'https://movonte.com',
      'https://www.movonte.com'
    ];

    this.app.use(cors({
      origin: allowedOrigins,
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
      // Header de seguridad para HTTPS
      if (this.enableHttps) {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
      next();
    });
  }

  private setupRoutes(): void {
    // Usar todas las rutas
    this.app.use('/', routes);

    // Ruta por defecto
    this.app.get('/', (req: Request, res: Response) => {
      const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${req.get('host')}`;
      
      res.json({
        message: 'Movonte API - Chatbot & Contact Service',
        version: '1.0.0',
        status: 'running',
        protocol: protocol.toUpperCase(),
        ssl_enabled: this.enableHttps,
        endpoints: {
          health: `${baseUrl}/health`,
          contact: `${baseUrl}/api/contact`,
          chatbot: `${baseUrl}/api/chatbot/*`
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
    console.log('\nMovonte API iniciando...');
    
    // Servidor HTTP
    const httpServer = http.createServer(this.app);
    httpServer.listen(this.port, () => {
      console.log(`✅ Servidor HTTP ejecutándose en puerto ${this.port}`);
      console.log(`   URL: http://localhost:${this.port}`);
    });

    // Servidor HTTPS (si está habilitado)
    if (this.enableHttps && this.sslOptions) {
      const httpsServer = https.createServer(this.sslOptions, this.app);
      httpsServer.listen(this.httpsPort, () => {
        console.log(`🔒 Servidor HTTPS ejecutándose en puerto ${this.httpsPort}`);
        console.log(`   URL: https://localhost:${this.httpsPort}`);
      });
    }

    console.log('\nEndpoints disponibles:');
    console.log(`   Health Check: http://localhost:${this.port}/health`);
    if (this.enableHttps) {
      console.log(`   Health Check (HTTPS): https://localhost:${this.httpsPort}/health`);
    }
    console.log(`   Contact Form: POST http://localhost:${this.port}/api/contact`);
    console.log(`   Jira Test: http://localhost:${this.port}/api/contact/test-jira`);
    console.log(`   Chatbot Webhook: POST http://localhost:${this.port}/api/chatbot/webhook/jira`);
    console.log(`   Direct Chat: POST http://localhost:${this.port}/api/chatbot/chat`);
    console.log('\nAPI lista para recibir solicitudes\n');
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
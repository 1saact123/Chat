import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import routes, { setWebSocketServer } from './routes';
import { validateEnvironmentVariables } from './utils/validations';
import { testConnection, syncDatabase } from './config/database';
import { redirectToLoginIfNotAuth, requireAdmin } from './middleware/auth';
import { OpenAIService } from './services/openAI_service';
import { CorsService } from './services/cors_service';

class MovonteAPI {
  private app: express.Application;
  private httpServer: any;
  private io!: Server;
  private port: number;
  private openaiService: OpenAIService;
  private corsService: CorsService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.openaiService = new OpenAIService();
    this.corsService = CorsService.getInstance();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSockets();
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
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://form.movonte.com", "https://api.openai.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        },
      },
    }));
    
    // CORS - DINÁMICO desde base de datos (sin necesidad de reiniciar)
    this.app.use(cors({
      origin: async (origin, callback) => {
        console.log('🔍 CORS check for origin:', origin);
        
        try {
          // Verificar si el origin está permitido usando el servicio de CORS dinámico
          const isAllowed = await this.corsService.isOriginAllowed(origin || '');
          
          if (isAllowed) {
            console.log(`✅ Origin permitido: ${origin || 'sin origin (webhook)'}`);
            return callback(null, true);
          }
          
          console.log(`❌ Origin NO permitido: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        } catch (error) {
          console.error('❌ Error verificando CORS:', error);
          callback(new Error('CORS verification error'));
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
    
    // Logging (después del middleware de Jira para no interferir)
    // Cookie parser
    this.app.use(cookieParser());
    
    // Middleware para capturar body crudo del webhook de Jira ANTES del parseo JSON
    // IMPORTANTE: Este middleware debe ir ANTES de morgan y otros middlewares que puedan consumir el body
    // Capturar el body crudo primero para asegurar que siempre tengamos acceso a él
    this.app.use('/api/chatbot/webhook/jira', 
      express.raw({ type: '*/*', limit: '10mb' }), // Capturar body crudo sin importar Content-Type
      (req: any, res: Response, next: NextFunction) => {
      console.log('\n🔍 === MIDDLEWARE WEBHOOK EJECUTADO (RAW) ===');
      console.log('📋 Content-Type recibido:', req.get('content-type'));
      console.log('📋 Content-Length header:', req.get('content-length'));
      console.log('📋 Tipo de req.body:', typeof req.body);
      console.log('📋 req.body es Buffer:', Buffer.isBuffer(req.body));
      console.log('📋 req.body length:', Buffer.isBuffer(req.body) ? req.body.length : 'N/A');
      
      // Guardar el body crudo
      if (Buffer.isBuffer(req.body)) {
        req.rawBodyBuffer = req.body;
        console.log('📦 Buffer capturado:', req.body.length, 'bytes');
        
        // Intentar parsear como JSON
        try {
          const rawBodyString = req.body.toString('utf8');
          console.log('📦 RAW BODY string (primeros 500 chars):', rawBodyString.substring(0, 500));
          console.log('📏 Longitud total:', rawBodyString.length);
          
          if (rawBodyString.trim().length > 0) {
            req.body = JSON.parse(rawBodyString);
            console.log('✅ Body parseado exitosamente como JSON');
            console.log('📋 req.body keys después del parseo:', Object.keys(req.body));
          } else {
            console.log('⚠️ String vacío después de trim - body puede estar realmente vacío');
            req.body = {};
          }
        } catch (parseError: any) {
          console.error('❌ Error parseando body como JSON:', parseError.message);
          console.error('📋 Stack:', parseError.stack);
          // Si falla el parseo, mantener el buffer pero intentar continuar
          req.body = {};
          req.parseError = parseError;
        }
      } else if (req.body && typeof req.body === 'object') {
        // Si ya está parseado (por algún middleware anterior), mantenerlo
        console.log('✅ Body ya está parseado:', Object.keys(req.body));
      } else {
        console.log('⚠️ Body no es Buffer ni objeto - puede estar vacío');
        req.body = req.body || {};
      }
      
      // Log final del body
      console.log('📦 Body final (tipo):', typeof req.body);
      console.log('📦 Body final (keys):', req.body ? Object.keys(req.body) : 'null/undefined');
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log('📦 Body final (primeros 1000 chars):', JSON.stringify(req.body, null, 2).substring(0, 1000));
      }
      
      next();
    });
    
    // Logging (después del middleware de Jira para no interferir con el body)
    this.app.use(morgan('combined'));
    
    // Parsing del body para todas las demás rutas
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Headers adicionales
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('X-Powered-By', 'Movonte API');
      next();
    });
  }

  private setupRoutes(): void {
    // Middleware personalizado para interceptar la ruta raíz ANTES de los archivos estáticos
    // Permitir acceso a usuarios autenticados (admin o usuarios con permisos)
    this.app.get('/', redirectToLoginIfNotAuth, (req: Request, res: Response) => {
      res.sendFile('index.html', { root: 'public' });
    });

    // Usar todas las rutas
    this.app.use('/', routes);

    // Servir archivos estáticos DESPUÉS de las rutas
    this.app.use(express.static('public'));

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

  private setupWebSockets(): void {
    console.log('🔌 Configurando WebSockets...');
    
    // Crear servidor HTTP
    this.httpServer = createServer(this.app);
    console.log('🌐 Servidor HTTP creado para WebSockets');
    
    // Configurar Socket.IO
    this.io = new Server(this.httpServer, {
      cors: {
        origin: [
          "https://chat.movonte.com",
          "https://movonte.com",
          "https://www.movonte.com",
          "https://movonte-consulting.github.io",
          "http://localhost:3000",
          "http://localhost:5173",
          "http://127.0.0.1:5500",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5173"
        ],
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    // Manejar conexiones WebSocket
    this.io.on('connection', (socket) => {
      console.log('🔌 Cliente WebSocket conectado:', socket.id);
      console.log('👤 Usuario conectado al chat en tiempo real');
      console.log('📡 Total de conexiones activas:', this.io.engine.clientsCount);
      console.log('🌐 Cliente conectado desde:', socket.handshake.address);
      console.log('🔗 Headers de conexión:', socket.handshake.headers);
      console.log('🌍 Origin del cliente:', socket.handshake.headers.origin);
      console.log('🔧 Transporte utilizado:', socket.conn.transport.name);
      console.log('📊 Información del engine:', {
        transport: socket.conn.transport.name,
        readyState: socket.conn.readyState,
        protocol: socket.conn.protocol
      });
      
      // 🎯 MANEJAR SALAS POR TICKET
      socket.on('join-ticket', (ticketId) => {
        console.log(`🎫 Cliente ${socket.id} se une al ticket: ${ticketId}`);
        socket.join(`ticket_${ticketId}`);
        console.log(`✅ Cliente unido a la sala: ticket_${ticketId}`);
      });
      
      socket.on('leave-ticket', (ticketId) => {
        console.log(`🎫 Cliente ${socket.id} sale del ticket: ${ticketId}`);
        socket.leave(`ticket_${ticketId}`);
        console.log(`✅ Cliente salió de la sala: ticket_${ticketId}`);
      });
      
      // Manejar desconexión
      socket.on('disconnect', (reason) => {
        console.log('🔌 Cliente WebSocket desconectado:', socket.id);
        console.log('👤 Usuario desconectado del chat');
        console.log('📡 Razón de desconexión:', reason);
        console.log('📡 Total de conexiones activas:', this.io.engine.clientsCount);
      });
      
      // Manejar errores de conexión
      socket.on('error', (error) => {
        console.error('❌ Error en WebSocket:', error);
        console.error('🔍 Detalles del error:', {
          message: error.message,
          stack: error.stack,
          socketId: socket.id
        });
      });
    });

    // 🔌 Pasar referencia del WebSocket a los controladores que la necesiten
    this.setupWebSocketReferences();
    
    // 🔌 Pasar referencia del WebSocket al controlador de chatbot
    setWebSocketServer(this.io);
    
    console.log('✅ WebSockets configurados correctamente');
    console.log('🔗 CORS configurado para:', [
      "https://chat.movonte.com",
      "https://movonte.com",
      "https://movonte-consulting.github.io",
      "http://localhost:3000",
      "http://127.0.0.1:5500"
    ]);
  }

  private setupWebSocketReferences(): void {
    // Hacer el WebSocket disponible globalmente para los controladores
    (global as any).webSocketServer = this.io;
    console.log('🔌 WebSocket server configurado globalmente');
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

  public async start(): Promise<void> {
    try {
      // Inicializar base de datos
      console.log('🔌 Conectando a la base de datos...');
      const dbConnected = await testConnection();
      
      if (!dbConnected) {
        console.error('❌ No se pudo conectar a la base de datos. Verifica la configuración.');
        process.exit(1);
      }
      
      // Sincronizar modelos
      console.log('🔄 Sincronizando modelos de base de datos...');
      await syncDatabase();
      
      // Servidor HTTP con WebSockets - nginx maneja HTTPS
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log('\nMovonte API iniciada exitosamente!');
        console.log('📦 Running behind nginx reverse proxy');
        console.log('🗄️ Base de datos MySQL conectada');
        console.log('🔌 WebSockets habilitados');
        console.log(`🚀 Servidor ejecutándose en puerto ${this.port}`);
        console.log(`📡 URL: http://localhost:${this.port}`);
        console.log('\nEndpoints disponibles:');
        console.log(`   Health Check: http://localhost:${this.port}/health`);
        console.log(`   Contact Form: POST http://localhost:${this.port}/api/contact`);
        console.log(`   Jira Test: http://localhost:${this.port}/api/contact/test-jira`);
        console.log(`   Chatbot Webhook: POST http://localhost:${this.port}/api/chatbot/webhook/jira`);
        console.log(`   Direct Chat: POST http://localhost:${this.port}/api/chatbot/chat`);
        console.log(`   WebSocket: ws://localhost:${this.port}/socket.io/`);
        console.log('\n✅ API lista para recibir solicitudes (incluye webhooks de Jira y WebSockets)');
        console.log('🔗 Public URL: https://chat.movonte.com\n');
      });
    } catch (error) {
      console.error('❌ Error iniciando la aplicación:', error);
      process.exit(1);
    }
  }
}

// Iniciar la aplicación
if (require.main === module) {
  console.log('🔍 Validando configuración...');
  validateEnvironmentVariables();
  
  console.log('🚀 Iniciando Movonte API...');
  const api = new MovonteAPI();
  api.start().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export default MovonteAPI;
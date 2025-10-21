import { sequelize } from '../config/database';

export class CorsService {
  private static instance: CorsService;
  private allowedOrigins: Set<string> = new Set();
  private lastUpdate: Date = new Date();
  private cacheTimeout: number = 60000; // 1 minuto

  private constructor() {
    // Inicializar con orígenes base del .env
    const baseOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://chat.movonte.com',
      'https://movonte.com',
      'https://www.movonte.com'
    ];
    
    baseOrigins.forEach(origin => this.allowedOrigins.add(origin.trim()));
    
    // Cargar dominios aprobados de la BD al inicializar
    this.loadApprovedDomainsFromDatabase();
  }

  public static getInstance(): CorsService {
    if (!CorsService.instance) {
      CorsService.instance = new CorsService();
    }
    return CorsService.instance;
  }

  /**
   * Cargar dominios aprobados desde la base de datos
   */
  private async loadApprovedDomainsFromDatabase(): Promise<void> {
    try {
      console.log('🔄 Cargando dominios aprobados desde la base de datos...');
      
      const [services] = await sequelize.query(`
        SELECT DISTINCT configuration 
        FROM unified_configurations 
        WHERE is_active = TRUE
      `);

      let domainsAdded = 0;
      
      for (const service of services as any[]) {
        let config = {};
        try {
          config = typeof service.configuration === 'string' 
            ? JSON.parse(service.configuration) 
            : service.configuration || {};
        } catch (e) {
          continue;
        }

        const requestedDomain = (config as any).requestedDomain;
        
        if (requestedDomain && (config as any).adminApproved) {
          // Agregar variaciones del dominio
          const variants = [
            `https://${requestedDomain}`,
            `http://${requestedDomain}`,
            `https://www.${requestedDomain}`,
            `http://www.${requestedDomain}`
          ];
          
          variants.forEach(variant => {
            if (!this.allowedOrigins.has(variant)) {
              this.allowedOrigins.add(variant);
              domainsAdded++;
            }
          });
        }
      }

      this.lastUpdate = new Date();
      console.log(`✅ ${domainsAdded} dominios aprobados cargados desde la BD`);
      console.log(`📋 Total de orígenes permitidos: ${this.allowedOrigins.size}`);
      
    } catch (error) {
      console.error('❌ Error cargando dominios aprobados:', error);
    }
  }

  /**
   * Refrescar dominios desde la BD si ha pasado el tiempo de caché
   */
  private async refreshIfNeeded(): Promise<void> {
    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - this.lastUpdate.getTime();
    
    if (timeSinceLastUpdate > this.cacheTimeout) {
      await this.loadApprovedDomainsFromDatabase();
    }
  }

  /**
   * Verificar si un origen está permitido
   */
  public async isOriginAllowed(origin: string): Promise<boolean> {
    // Refrescar dominios si es necesario
    await this.refreshIfNeeded();
    
    // Permitir requests sin origin (webhooks)
    if (!origin) {
      return true;
    }

    // Verificar si el origin está en la lista
    if (this.allowedOrigins.has(origin)) {
      return true;
    }

    // Verificar patrones con wildcard para Atlassian
    if (origin.includes('.atlassian.net')) {
      return true;
    }

    return false;
  }

  /**
   * Agregar un dominio aprobado dinámicamente
   */
  public async addApprovedDomain(domain: string): Promise<void> {
    try {
      console.log(`➕ Agregando dominio aprobado: ${domain}`);
      
      // Agregar variaciones del dominio
      const variants = [
        `https://${domain}`,
        `http://${domain}`,
        `https://www.${domain}`,
        `http://www.${domain}`
      ];
      
      variants.forEach(variant => {
        this.allowedOrigins.add(variant);
        console.log(`   ✅ Agregado: ${variant}`);
      });

      console.log(`📋 Total de orígenes permitidos: ${this.allowedOrigins.size}`);
      
    } catch (error) {
      console.error(`❌ Error agregando dominio ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Remover un dominio
   */
  public removeDomain(domain: string): void {
    const variants = [
      `https://${domain}`,
      `http://${domain}`,
      `https://www.${domain}`,
      `http://www.${domain}`
    ];
    
    variants.forEach(variant => this.allowedOrigins.delete(variant));
    console.log(`➖ Dominio removido: ${domain}`);
  }

  /**
   * Forzar recarga inmediata desde la BD
   */
  public async forceReload(): Promise<void> {
    console.log('🔄 Forzando recarga de dominios aprobados...');
    await this.loadApprovedDomainsFromDatabase();
  }

  /**
   * Obtener lista de orígenes permitidos
   */
  public getAllowedOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }

  /**
   * Obtener estadísticas
   */
  public getStats(): {
    totalOrigins: number;
    lastUpdate: Date;
    origins: string[];
  } {
    return {
      totalOrigins: this.allowedOrigins.size,
      lastUpdate: this.lastUpdate,
      origins: this.getAllowedOrigins()
    };
  }
}

export default CorsService;

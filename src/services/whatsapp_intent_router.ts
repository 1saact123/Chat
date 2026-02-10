/**
 * WhatsApp intent router: decide to which service to route a new conversation
 * based on the first message. Services and keywords are loaded from
 * unified_configurations (active services for the user, configuration.whatsappKeywords).
 */

import { sequelize } from '../config/database';

export interface RoutedService {
  serviceId: string;
  source: 'keyword' | 'default';
}

export interface RoutableService {
  serviceId: string;
  serviceName: string;
  keywords: string[];
}

/**
 * Load active services for the user from unified_configurations.
 * Keywords come from configuration.whatsappKeywords (array or comma-separated string).
 */
export async function getRoutableServicesFromDb(userId: number): Promise<RoutableService[]> {
  const [rows] = await sequelize.query(
    `SELECT service_id, service_name, configuration
     FROM unified_configurations
     WHERE user_id = :userId AND is_active = TRUE
     ORDER BY service_name`,
    { replacements: { userId } }
  ) as [any[], unknown];

  const result: RoutableService[] = [];
  for (const row of rows || []) {
    const config =
      typeof row.configuration === 'string'
        ? JSON.parse(row.configuration || '{}')
        : row.configuration || {};
    let keywords: string[] = [];
    if (Array.isArray(config.whatsappKeywords)) {
      keywords = config.whatsappKeywords.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean);
    } else if (typeof config.whatsappKeywords === 'string') {
      keywords = config.whatsappKeywords
        .split(',')
        .map((k: string) => k.trim().toLowerCase())
        .filter(Boolean);
    }
    result.push({
      serviceId: String(row.service_id),
      serviceName: row.service_name || String(row.service_id),
      keywords
    });
  }
  return result;
}

/**
 * Get active service IDs for the user (from unified_configurations).
 * Kept for compatibility.
 */
export async function getActiveServiceIdsForUser(userId: number): Promise<string[]> {
  const services = await getRoutableServicesFromDb(userId);
  return services.map((s) => s.serviceId);
}

export interface ServiceSelection {
  serviceId: string;
  serviceName: string;
}

/**
 * Detect if the user message is a selection from the assistant list:
 * - Number 1..N (1-based index into services list)
 * - Or matches a service name / keyword (normalized).
 * Returns the selected service or null if not a clear selection.
 */
export function parseServiceSelection(
  services: RoutableService[],
  messageText: string
): ServiceSelection | null {
  const normalized = messageText.trim().toLowerCase();
  if (!normalized || services.length === 0) return null;

  const num = parseInt(normalized, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= services.length) {
    const svc = services[num - 1];
    return { serviceId: svc.serviceId, serviceName: svc.serviceName };
  }

  for (const svc of services) {
    const nameNorm = svc.serviceName.trim().toLowerCase();
    if (nameNorm && normalized === nameNorm) return { serviceId: svc.serviceId, serviceName: svc.serviceName };
    if (nameNorm && normalized.includes(nameNorm)) return { serviceId: svc.serviceId, serviceName: svc.serviceName };
    for (const kw of svc.keywords) {
      if (kw && (normalized === kw || normalized.includes(kw))) return { serviceId: svc.serviceId, serviceName: svc.serviceName };
    }
  }
  return null;
}

/** Build the Asistente Movonte welcome + list message (no Jira, predefined assistant). */
export function buildAssistantListMessage(services: RoutableService[]): string {
  const lines = [
    'Hola, soy *Asistente Movonte*.',
    '',
    'Nuestros servicios:',
    ...services.map((s, i) => `${i + 1}. ${s.serviceName}`),
    '',
    'Responde con el *número* o el *nombre del servicio* para continuar.'
  ];
  return lines.join('\n');
}

/**
 * Detect which service_id to use for this message (new conversation).
 * Services and keywords are taken from unified_configurations only.
 * If no keyword matches, returns defaultServiceId (if it exists in DB for this user).
 */
export async function routeToService(
  userId: number,
  messageText: string,
  defaultServiceId: string
): Promise<RoutedService> {
  const normalizedText = messageText.trim().toLowerCase();
  if (!normalizedText) {
    return { serviceId: defaultServiceId, source: 'default' };
  }

  const services = await getRoutableServicesFromDb(userId);
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const fullPhrase = normalizedText.replace(/\s+/g, ' ');

  // Build keyword -> serviceId (first match wins; order by service_name)
  for (const svc of services) {
    for (const kw of svc.keywords) {
      if (words.includes(kw) || fullPhrase.includes(kw)) {
        return { serviceId: svc.serviceId, source: 'keyword' };
      }
    }
  }

  // Validate default is in DB; if not, use first available service
  const activeIds = new Set(services.map((s) => s.serviceId));
  const fallback =
    activeIds.has(defaultServiceId) ? defaultServiceId : services[0]?.serviceId ?? defaultServiceId;
  return { serviceId: fallback, source: 'default' };
}

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

/**
 * Detect which service_id to use for this message (new conversation).
 * - The "WhatsApp main assistant" is the defaultServiceId: it is used when no intent matches.
 * - Only "other" services (not the default) are considered for keyword matching, so the
 *   main assistant is an independent entry point and "does the switch" to other services.
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

  // Keyword match: only among services that are NOT the WhatsApp main assistant (default).
  // So the main assistant is never selected by keyword — it only receives when no match.
  for (const svc of services) {
    if (svc.serviceId === defaultServiceId) continue;
    for (const kw of svc.keywords) {
      if (words.includes(kw) || fullPhrase.includes(kw)) {
        return { serviceId: svc.serviceId, source: 'keyword' };
      }
    }
  }

  // No keyword match → use the WhatsApp main assistant (default service)
  const activeIds = new Set(services.map((s) => s.serviceId));
  const fallback =
    activeIds.has(defaultServiceId) ? defaultServiceId : services[0]?.serviceId ?? defaultServiceId;
  return { serviceId: fallback, source: 'default' };
}

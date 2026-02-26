/**
 * WhatsApp Cloud API send helpers.
 *
 * sendWhatsAppText              – plain text message
 * sendWhatsAppInteractiveServices – interactive service selector
 *   · ≤ 3 services  → reply buttons  (native tap, no keyboard needed)
 *   · 4-10 services → list message   (scrollable menu)
 *   · > 10 services → plain text     (API limit)
 */

const API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export interface ServiceOption {
  serviceId: string;
  serviceName: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper – POST to Meta graph API
// ─────────────────────────────────────────────────────────────────────────────
async function postToMeta(
  phoneNumberId: string,
  payload: object
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.warn('⚠️ WhatsApp send: WHATSAPP_ACCESS_TOKEN not set.');
    return { success: false, error: 'WHATSAPP_ACCESS_TOKEN not set' };
  }

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = (await res.json()) as { error?: { message?: string; code?: number } };

    if (!res.ok) {
      const code = data.error?.code;
      const msg = data.error?.message || String(res.status);
      if (code === 131030) {
        console.warn('⚠️ WhatsApp send: número no está en la lista de destinatarios de Meta (modo desarrollo). Agrégalo en la app de WhatsApp.');
      } else {
        console.error('❌ WhatsApp send error:', data);
      }
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err) {
    console.error('❌ WhatsApp send request failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain text message
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWhatsAppText(
  phoneNumberId: string,
  toPhone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const to = toPhone.replace(/\D/g, '');
  if (!to) return { success: false, error: 'Invalid recipient phone' };

  return postToMeta(phoneNumberId, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive service selector
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWhatsAppInteractiveServices(
  phoneNumberId: string,
  toPhone: string,
  services: ServiceOption[],
  headerText = 'Asistente Movonte',
  bodyText = '¿Con qué servicio te podemos ayudar hoy?'
): Promise<{ success: boolean; error?: string }> {
  const to = toPhone.replace(/\D/g, '');
  if (!to) return { success: false, error: 'Invalid recipient phone' };

  // Fallback to plain text if too many services (> 10, API limit)
  if (services.length > 10) {
    const lines = [
      bodyText,
      '',
      ...services.map((s, i) => `${i + 1}. ${s.serviceName}`),
      '',
      'Responde con el número o el nombre del servicio.'
    ];
    return sendWhatsAppText(phoneNumberId, toPhone, lines.join('\n'));
  }

  // ── Reply buttons (≤ 3 services) ─────────────────────────────────────────
  if (services.length <= 3) {
    const buttons = services.map((s) => ({
      type: 'reply',
      reply: {
        id: s.serviceId,
        // Button title: max 20 chars
        title: s.serviceName.length > 20 ? s.serviceName.slice(0, 17) + '...' : s.serviceName
      }
    }));

    return postToMeta(phoneNumberId, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: headerText.length > 60 ? headerText.slice(0, 57) + '...' : headerText
        },
        body: { text: bodyText },
        action: { buttons }
      }
    });
  }

  // ── List message (4-10 services) ─────────────────────────────────────────
  const rows = services.map((s) => ({
    id: s.serviceId,
    // Row title: max 24 chars
    title: s.serviceName.length > 24 ? s.serviceName.slice(0, 21) + '...' : s.serviceName,
    // Row description: max 72 chars (optional)
    ...(s.description
      ? { description: s.description.length > 72 ? s.description.slice(0, 69) + '...' : s.description }
      : {})
  }));

  return postToMeta(phoneNumberId, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: headerText.length > 60 ? headerText.slice(0, 57) + '...' : headerText
      },
      body: { text: bodyText },
      footer: { text: 'Toca para seleccionar' },
      action: {
        button: 'Ver servicios',
        sections: [
          {
            title: 'Servicios disponibles',
            rows
          }
        ]
      }
    }
  });
}

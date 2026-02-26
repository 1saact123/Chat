/**
 * Send text messages via WhatsApp Cloud API.
 * Requires WHATSAPP_ACCESS_TOKEN and phone_number_id (from webhook or WHATSAPP_PHONE_NUMBER_ID).
 */

const API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Send a text message to a WhatsApp user.
 * @param phoneNumberId - From webhook value.metadata.phone_number_id or env WHATSAPP_PHONE_NUMBER_ID
 * @param toPhone - Recipient phone (with or without +), will be normalized to digits only
 * @param text - Message body
 */
export async function sendWhatsAppText(
  phoneNumberId: string,
  toPhone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.warn('⚠️ WhatsApp send: WHATSAPP_ACCESS_TOKEN not set.');
    return { success: false, error: 'WHATSAPP_ACCESS_TOKEN not set' };
  }
  const to = toPhone.replace(/\D/g, '');
  if (!to) {
    return { success: false, error: 'Invalid recipient phone' };
  }
  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text }
      })
    });
    const data = (await res.json()) as { error?: { message?: string; code?: number }; messages?: unknown };
    if (!res.ok) {
      const code = data.error?.code;
      const msg = data.error?.message || String(res.status);
      // 131030 = recipient not in allowed list (expected in Meta dev mode)
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

const express = require('express');
const twilio = require('twilio');

const router = express.Router();

function normalizePhoneNumber(value) {
  if (!value) return null;

  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;

  let normalized = digits;

  if (normalized.startsWith('0')) {
    normalized = `234${normalized.slice(1)}`;
  }

  if (!normalized.startsWith('234') && normalized.length === 11) {
    normalized = `234${normalized}`;
  }

  return `+${normalized}`;
}

router.post('/send-bulk-sms', async (req, res) => {
  const { recipients, message } = req.body || {};
  const text = String(message || '').trim();

  if (!Array.isArray(recipients) || !recipients.length) {
    return res.status(400).json({ error: 'Please provide a list of recipients.' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({
      error: 'Twilio credentials are not configured. Add your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the .env file.',
    });
  }

  const client = twilio(accountSid, authToken);
  const uniqueRecipients = [...new Set(
    recipients
      .map(normalizePhoneNumber)
      .filter(Boolean)
  )];

  if (!uniqueRecipients.length) {
    return res.status(400).json({ error: 'No valid phone numbers were provided.' });
  }

  const results = [];
  let sent = 0;

  for (const to of uniqueRecipients) {
    try {
      const payload = { body: text, to };

      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        payload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else if (process.env.TWILIO_FROM_NUMBER) {
        payload.from = process.env.TWILIO_FROM_NUMBER;
      }

      const response = await client.messages.create(payload);
      results.push({ to, status: 'sent', sid: response.sid });
      sent += 1;
    } catch (error) {
      results.push({ to, status: 'failed', error: error.message || 'Unable to send SMS.' });
    }
  }

  return res.json({
    success: true,
    total: uniqueRecipients.length,
    sent,
    results,
  });
});

module.exports = router;

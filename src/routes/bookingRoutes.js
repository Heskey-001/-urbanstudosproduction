const express = require('express');
const { db } = require('../db');

const router = express.Router();

function normalizePhoneNumber(phone) {
  if (!phone) return null;

  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('+254')) return cleaned.replace('+', '');

  return cleaned;
}

function extractAmountFromDeposit(value) {
  if (!value) return 0;

  const numeric = Number(String(value).replace(/[^0-9]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

async function triggerStkPush(phone, amount, bookingId) {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
    return {
      enabled: false,
      message: 'M-Pesa STK Push is not configured yet. Add MPESA credentials to the environment.'
    };
  }

  const phoneNumber = normalizePhoneNumber(phone);
  if (!phoneNumber) {
    return {
      enabled: false,
      message: 'A valid client phone number is required for STK Push.'
    };
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const authResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: 'application/json'
    }
  });

  const authData = await authResponse.json();

  if (!authResponse.ok || !authData.access_token) {
    throw new Error(authData.error_description || 'Failed to authenticate with M-Pesa.');
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://example.com/mpesa/callback';

  const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.access_token}`
    },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: `UrbanStudios-${bookingId}`,
      TransactionDesc: 'Urban Studios booking deposit'
    })
  });

  const stkData = await stkResponse.json();

  return {
    enabled: true,
    response: stkData,
    message: stkResponse.ok ? 'STK push request sent successfully.' : stkData.errorMessage || 'STK push request failed.'
  };
}

router.get('/', (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY created_at DESC', (error, rows) => {
    if (error) {
      return res.status(500).json({ error: 'Unable to fetch bookings.' });
    }

    return res.json({ success: true, bookings: rows });
  });
});

router.post('/', async (req, res) => {
  const { name, email, phone, service, date, deposit, details } = req.body || {};

  if (!name || !email || !phone || !service || !date || !deposit || !details) {
    return res.status(400).json({ error: 'All booking fields are required.' });
  }

  const amount = extractAmountFromDeposit(deposit);
  if (!amount) {
    return res.status(400).json({ error: 'Please choose a valid deposit amount.' });
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Please enter a valid phone number for the deposit prompt.' });
  }

  const insertBooking = () => new Promise((resolve, reject) => {
    const statement = db.prepare(`
      INSERT INTO bookings (name, email, phone, service, preferred_date, deposit_amount, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      name.trim(),
      email.trim(),
      normalizedPhone,
      service.trim(),
      date,
      amount,
      details.trim(),
      function (error) {
        if (error) return reject(new Error('Unable to save booking.'));
        resolve(this.lastID);
      }
    );

    statement.finalize();
  });

  try {
    const bookingId = await insertBooking();
    const paymentResult = await triggerStkPush(normalizedPhone, amount, bookingId);

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      bookingId,
      payment: paymentResult
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to process booking and payment request.' });
  }
});

module.exports = router;

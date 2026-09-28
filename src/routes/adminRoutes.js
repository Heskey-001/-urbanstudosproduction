const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({ error: 'Admin credentials are not configured.' });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  return res.json({
    success: true,
    message: 'Admin login successful.',
    token: 'demo-admin-token',
  });
});

router.get('/dashboard', (req, res) => {
  db.get('SELECT COUNT(*) AS totalBookings FROM bookings', (bookingError, bookingRow) => {
    if (bookingError) {
      return res.status(500).json({ error: 'Unable to fetch dashboard stats.' });
    }

    db.get('SELECT COUNT(*) AS totalContacts FROM contacts', (contactError, contactRow) => {
      if (contactError) {
        return res.status(500).json({ error: 'Unable to fetch dashboard stats.' });
      }

      return res.json({
        success: true,
        stats: {
          bookings: Number(bookingRow?.totalBookings || 0),
          contacts: Number(contactRow?.totalContacts || 0),
        },
      });
    });
  });
});

module.exports = router;

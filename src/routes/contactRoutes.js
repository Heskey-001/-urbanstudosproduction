const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { name, email, phone, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const statement = db.prepare(`
    INSERT INTO contacts (name, email, phone, message)
    VALUES (?, ?, ?, ?)
  `);

  statement.run(name.trim(), email.trim(), (phone || '').trim(), message.trim(), function (error) {
    if (error) {
      return res.status(500).json({ error: 'Unable to save contact message.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Message received successfully.',
      contactId: this.lastID,
    });
  });
  statement.finalize();
});

module.exports = router;

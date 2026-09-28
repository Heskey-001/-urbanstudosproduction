const express = require('express');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./src/db');
const bookingRoutes = require('./src/routes/bookingRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const smsRoutes = require('./src/routes/smsRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Studio server is working!' });
});

app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', smsRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`URBAN STUDIOS PROJECT running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
const navToggle = document.querySelector('.nav-toggle');
const siteHeader = document.querySelector('.site-header');
const filterButtons = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');
const bookingForm = document.getElementById('bookingForm');
const bulkMessageForm = document.getElementById('bulkMessageForm');
const yearEl = document.getElementById('year');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteHeader.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));

    portfolioItems.forEach((item) => {
      const matches = filter === 'all' || item.dataset.category === filter;
      item.classList.toggle('hidden', !matches);
    });
  });
});

if (bookingForm) {
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formStatus = bookingForm.querySelector('.form-status');
    const name = bookingForm.querySelector('#name').value.trim();
    const email = bookingForm.querySelector('#email').value.trim();
    const phone = bookingForm.querySelector('#phone').value.trim();
    const service = bookingForm.querySelector('#service').value.trim();
    const date = bookingForm.querySelector('#date').value;
    const deposit = bookingForm.querySelector('#deposit').value.trim();
    const details = bookingForm.querySelector('#details').value.trim();

    if (!name || !email || !phone || !service || !date || !deposit || !details) {
      formStatus.textContent = 'Please complete all booking fields before submitting.';
      formStatus.style.color = '#fca5a5';
      return;
    }

    formStatus.textContent = 'Sending your booking request...';
    formStatus.style.color = '#d4af6a';

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          service,
          date,
          deposit,
          details
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit booking request.');
      }

      formStatus.textContent = `Thanks, ${name || 'there'}! Your booking request has been received and saved successfully.`;
      formStatus.style.color = '#d4af6a';
      bookingForm.reset();
    } catch (error) {
      formStatus.textContent = error.message;
      formStatus.style.color = '#fca5a5';
    }
  });
}

if (bulkMessageForm) {
  bulkMessageForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const channel = document.getElementById('bulkChannel').value;
    const numbers = (document.getElementById('bulkNumbers').value || '')
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    const message = document.getElementById('bulkMessage').value.trim();
    const statusEl = bulkMessageForm.querySelector('.bulk-status');
    const previewList = document.getElementById('bulkPreviewList');

    if (!numbers.length || !message) {
      statusEl.textContent = 'Add at least one client number and a message before sending your campaign.';
      statusEl.style.color = '#fca5a5';
      return;
    }

    const validNumbers = numbers
      .map((number) => {
        const digits = number.replace(/\D/g, '');
        if (!digits) return null;
        return digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
      })
      .filter(Boolean);

    if (!validNumbers.length) {
      statusEl.textContent = 'Please enter valid phone numbers that can receive messages.';
      statusEl.style.color = '#fca5a5';
      return;
    }

    if (channel === 'whatsapp') {
      const links = validNumbers.map((number) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`);

      previewList.innerHTML = validNumbers
        .map((number, index) => {
          const label = number.startsWith('234') ? `+${number}` : number;
          return `<li><a href="${links[index]}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
        })
        .join('');

      statusEl.textContent = `${validNumbers.length} client${validNumbers.length > 1 ? 's are' : ' is'} ready for a WhatsApp campaign.`;
      statusEl.style.color = '#d4af6a';
      return;
    }

    statusEl.textContent = 'Sending SMS campaign...';
    statusEl.style.color = '#d4af6a';

    try {
      const response = await fetch('/api/send-bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          recipients: validNumbers
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to send SMS messages.');
      }

      previewList.innerHTML = data.results
        .map((result) => {
          const label = result.to.startsWith('234') ? `+${result.to}` : result.to;
          const status = result.status === 'sent' ? 'Sent' : 'Failed';
          return `<li>${label} — ${status}</li>`;
        })
        .join('');

      statusEl.textContent = `${data.sent} of ${data.total} SMS messages sent successfully.`;
      statusEl.style.color = '#d4af6a';
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.style.color = '#fca5a5';
    }
  });
}

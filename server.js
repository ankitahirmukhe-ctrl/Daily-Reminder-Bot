const path = require('path');
const fs = require('fs');
const express = require('express');
const dotenv = require('dotenv');

// Fetch polyfill for Node 18- use node-fetch if needed
let fetchImpl;
try {
  fetchImpl = require('node-fetch');
} catch (e) {
  if (typeof fetch !== 'undefined') {
    fetchImpl = fetch;
  } else {
    console.error('Install node-fetch or run on Node 18+.');
    process.exit(1);
  }
}

const envFilePath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : null;

if (envFilePath) dotenv.config({ path: envFilePath });

const WORQHAT_ENDPOINT = process.env.WORQHAT_ENDPOINT;
const WORQHAT_API_KEY = process.env.WORQHAT_API_KEY;

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/trigger', async (req, res) => {
  try {
    const { email, reminder } = req.body || {};
    if (!email || !reminder) {
      return res.status(400).json({ message: 'Email and reminder are required.' });
    }
    const apiRes = await fetchImpl(WORQHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + WORQHAT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, reminder })
    });
    const text = await apiRes.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { }
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ message: parsed?.message || text || 'Worqhat workflow error' });
    }
    res.json(parsed || { message: 'Reminder scheduled!' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running: http://localhost:${port}`));

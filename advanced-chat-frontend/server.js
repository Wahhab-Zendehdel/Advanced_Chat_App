// server.js
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Make sure to use the correct filenames for your certificate
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, './localhost+3-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './localhost+3.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(10000, (err) => {
    if (err) throw err;
    console.log('> Ready on https://localhost:10000');
  });
});
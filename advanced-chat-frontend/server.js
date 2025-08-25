// server.js
// Import necessary modules for creating an HTTPS server and handling Next.js
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Check if the environment is development or production
const dev = process.env.NODE_ENV !== 'production';
// Initialize the Next.js app
const app = next({ dev });
// Get the Next.js request handler
const handle = app.getRequestHandler();

// Define HTTPS options by reading the SSL key and certificate files
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, './SARI.chat-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './SARI.chat.pem')),
};

// Set the hostname to '0.0.0.0' to allow connections from any network interface
const hostname = '0.0.0.0';

// Prepare the Next.js app and then start the server
app.prepare().then(() => {
  // Create the HTTPS server
  createServer(httpsOptions, (req, res) => {
    // Parse the request URL
    const parsedUrl = parse(req.url, true);
    // Pass the request to the Next.js handler
    handle(req, res, parsedUrl);
  }).listen(443, hostname, (err) => {
    // Throw an error if the server fails to start
    if (err) throw err;
    // Log a message to the console when the server is ready
    console.log(`> Frontend server ready on https://127.0.0.1 (and your network IP)`);
  });
});

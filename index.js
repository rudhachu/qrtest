const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

const app = express();
const __path = process.cwd();
const PORT = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(express.static(path.join(__path, 'public')));

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__path, '/public/pair.html'));
});

app.get('/qr', (req, res) => {
    res.sendFile(path.join(__path, '/public/qr.html'));
});

app.get('/web-pair', (req, res) => {
    res.sendFile(path.join(__path, '/public/web-pair.html'));
});

app.get('/web-qr', (req, res) => {
    res.sendFile(path.join(__path, '/public/web-qr.html'));
});
/*
app.get('/update-session', (req, res) => {
    res.sendFile(path.join(__path, '/public/updateSession.html'));
});

let updateSession = require('./updateSession');
app.use('/sid', updateSession);
*/
let qrCode = require('./qr');
app.use('/qr-code', qrCode);

let pair = require('./pair');
app.use('/code', pair);

let webqr = require('./web-qr');
app.use('/web-qrcode', webqr);

let webpair = require('./web-pair');
app.use('/web-code', webpair);

app.get('/', (req, res) => {
    res.sendFile(path.join(__path, '/public/index.html'));
});

app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
});

module.exports = app;

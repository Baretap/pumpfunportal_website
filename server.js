const http = require('http');
const fs = require('fs');
const url = require('url');
const formidable = require('formidable');
const axios = require('axios');

const usersFile = 'users.json';
let users = [];
if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile));
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream('index.html').pipe(res);
    } else if (parsedUrl.pathname === '/client.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        fs.createReadStream('client.js').pipe(res);
    } else if (parsedUrl.pathname === '/register' && req.method === 'POST') {
        const form = new formidable.IncomingForm();
        form.parse(req, async (err, fields) => {
            if (err) {
                console.error('Form parse error:', err);
                res.writeHead(500);
                res.end('Virhe lomakkeen käsittelyssä');
                return;
            }
            const username = fields.username[0];
            const email = fields.email[0];
            const password = fields.password[0];
            if (users.find(u => (Array.isArray(u.email) ? u.email[0] : u.email) === email)) {
                res.writeHead(400);
                res.end('Sähköposti on jo käytössä!');
            } else {
                try {
                    const walletResponse = await axios.get('https://pumpportal.fun/api/create-wallet');
                    const walletData = walletResponse.data;
                    const user = {
                        username,
                        email,
                        password,
                        wallet: {
                            publicKey: walletData.publicKey || 'N/A',
                            privateKey: walletData.privateKey || 'N/A',
                            apiKey: walletData.apiKey || 'N/A'
                        }
                    };
                    users.push(user);
                    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Rekisteröityminen onnistui!', wallet: user.wallet }));
                } catch (error) {
                    console.error('Wallet creation error:', error.message);
                    res.writeHead(500);
                    res.end('Lompakon luonti epäonnistui: ' + error.message);
                }
            }
        });
    } else if (parsedUrl.pathname === '/login' && req.method === 'POST') {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields) => {
            if (err) {
                console.error('Form parse error:', err);
                res.writeHead(500);
                res.end('Virhe lomakkeen käsittelyssä');
                return;
            }
            const email = fields.email[0];
            const password = fields.password[0];
            const user = users.find(u => (Array.isArray(u.email) ? u.email[0] : u.email) === email && 
                                       (Array.isArray(u.password) ? u.password[0] : u.password) === password);
            if (user) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Kirjautuminen onnistui!', email: user.email }));
            } else {
                console.log('Users in database:', users);
                res.writeHead(401);
                res.end('Väärä sähköposti tai salasana!');
            }
        });
    } else if (parsedUrl.pathname === '/events') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream('events.html').pipe(res);
    } else if (parsedUrl.pathname === '/wallet' && req.method === 'GET') {
        if (fs.existsSync('wallet.html')) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream('wallet.html').pipe(res);
        } else {
            res.writeHead(404);
            res.end('Wallet-sivua ei löydy palvelimelta');
        }
    } else if (parsedUrl.pathname === '/trade' && req.method === 'GET') {
        if (fs.existsSync('trade.html')) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream('trade.html').pipe(res);
        } else {
            res.writeHead(404);
            res.end('Trade-sivua ei löydy palvelimelta');
        }
    } else if (parsedUrl.pathname === '/create' && req.method === 'GET') {
        if (fs.existsSync('create.html')) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream('create.html').pipe(res);
        } else {
            res.writeHead(404);
            res.end('Create-sivua ei löydy palvelimelta');
        }
    } else if (parsedUrl.pathname === '/user' && req.method === 'GET') {
        const email = parsedUrl.query.email;
        const user = users.find(u => (Array.isArray(u.email) ? u.email[0] : u.email) === email);
        if (user) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));
        } else {
            res.writeHead(404);
            res.end('Käyttäjää ei löydy');
        }
    } else {
        res.writeHead(404);
        res.end('Sivua ei löydy');
    }
});

server.listen(8080, () => {
    console.log('Palvelin käynnissä portissa 8080');
});

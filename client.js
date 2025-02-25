// Rekisteröitymislomakkeen käsittely
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/register', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(result => {
            const messageDiv = document.getElementById('register-message');
            messageDiv.textContent = result.message;
            if (result.message === 'Rekisteröityminen onnistui!') {
                const walletInfo = document.getElementById('wallet-info');
                document.getElementById('public-key').textContent = result.wallet.publicKey;
                document.getElementById('private-key').textContent = result.wallet.privateKey;
                document.getElementById('api-key').textContent = result.wallet.apiKey;
                walletInfo.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            document.getElementById('register-message').textContent = 'Virhe: ' + error.message;
        });
    });
}

// Kirjautumislomakkeen käsittely
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/login', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            document.getElementById('login-message').textContent = result.message;
            if (result.message === 'Kirjautuminen onnistui!') {
                localStorage.setItem('email', result.email); // Tallenna email paikallisesti
                window.location.href = '/events'; // Ohjaa tapahtumasivulle
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            document.getElementById('login-message').textContent = 'Virhe: ' + error.message;
        });
    });
}

// WebSocket /events-sivulla
if (window.location.pathname === '/events') {
    const ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.onopen = function() {
        console.log('WebSocket-yhteys avattu');
        ws.send(JSON.stringify({ method: "subscribeNewToken" }));
        const eventsDiv = document.getElementById('events');
        const statusItem = document.createElement('div');
        statusItem.className = 'event-item';
        statusItem.innerHTML = '<span class="emoji">✅</span> <span class="token-info">Yhteys avattu - odotetaan uusia tokeneita...</span>';
        eventsDiv.appendChild(statusItem);
    };

    ws.onmessage = function(event) {
        console.log('Vastaanotettu viesti:', event.data);
        const data = JSON.parse(event.data);
        const eventsDiv = document.getElementById('events');
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        const ca = data.mint || 'Tuntematon';
        const shortCA = ca.length > 20 ? `${ca.slice(0, 10)}...${ca.slice(-10)}` : ca;
        eventItem.innerHTML = `
            <div style="display: flex; align-items: center;">
                <span class="emoji">🪙</span>
                <span class="token-info">
                    <strong>Uusi token luotu!</strong><br>
                    CA: <span class="token-ca">${shortCA}</span><br>
                    Aika: ${new Date().toLocaleString()}<br>
                    ${data.name ? `Nimi: ${data.name}` : 'Nimi: Ei saatavilla'}
                </span>
            </div>
        `;
        eventsDiv.insertBefore(eventItem, eventsDiv.firstChild); // Uusin ylimmäksi
    };

    ws.onerror = function(error) {
        console.error('WebSocket-virhe:', error);
        const eventsDiv = document.getElementById('events');
        const errorItem = document.createElement('div');
        errorItem.className = 'event-item error';
        errorItem.innerHTML = '<span class="emoji">❌</span> <span class="token-info">Virhe WebSocket-yhteydessä!</span>';
        eventsDiv.appendChild(errorItem);
    };

    ws.onclose = function() {
        console.log('WebSocket-yhteys suljettu');
        const eventsDiv = document.getElementById('events');
        const closeItem = document.createElement('div');
        closeItem.className = 'event-item error';
        closeItem.innerHTML = '<span class="emoji">🔌</span> <span class="token-info">Yhteys suljettu - tarkista verkko!</span>';
        eventsDiv.appendChild(closeItem);
    };
}

// Wallet-sivun logiikka
if (window.location.pathname === '/wallet') {
    const email = localStorage.getItem('email');
    if (!email) {
        document.body.innerHTML = '<p style="color: #ff0000; padding: 20px;">⚠️ Kirjaudu ensin sisään! <a href="/" style="color: #ffff00;">Takaisin</a></p>';
    } else {
        fetch(`/user?email=${encodeURIComponent(email)}`)
            .then(response => {
                if (!response.ok) throw new Error('Käyttäjätietojen haku epäonnistui: ' + response.status);
                return response.json();
            })
            .then(user => {
                document.getElementById('username').textContent = user.username;
                document.getElementById('email').textContent = user.email;
                document.getElementById('public-key').textContent = user.wallet.publicKey;
                document.getElementById('private-key').textContent = user.wallet.privateKey;
                document.getElementById('api-key').textContent = user.wallet.apiKey;
                document.getElementById('balance').textContent = 'Saldo: Ei vielä saatavilla';
            })
            .catch(error => {
                console.error('Error fetching user:', error);
                document.getElementById('wallet-details').innerHTML = `<p class="warning">⚠️ Virhe latauksessa: ${error.message}</p>`;
            });

        // Kopiointipainikkeet
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const text = document.getElementById(targetId).textContent;
                navigator.clipboard.writeText(text)
                    .then(() => btn.textContent = '✅ Kopioitu!')
                    .catch(err => btn.textContent = '❌ Virhe!');
                setTimeout(() => btn.textContent = 'Kopioi 📋', 2000);
            });
        });
    }
}

// Kauppasivun logiikka
if (window.location.pathname === '/trade') {
    const email = localStorage.getItem('email');
    if (!email) {
        document.body.innerHTML = '<p style="color: #ff0000; padding: 20px;">⚠️ Kirjaudu ensin sisään! <a href="/" style="color: #ffff00;">Takaisin</a></p>';
    } else {
        fetch(`/user?email=${encodeURIComponent(email)}`)
            .then(response => response.json())
            .then(user => {
                document.getElementById('trade-form').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const formData = new FormData(this);
                    const messageDiv = document.getElementById('message');
                    const resultDiv = document.getElementById('result');
                    messageDiv.textContent = 'Suoritetaan kauppaa...';

                    const tradeData = {
                        action: formData.get('action'),
                        mint: formData.get('mint'),
                        amount: parseFloat(formData.get('amount')),
                        denominatedInSol: formData.get('denominatedInSol'),
                        slippage: parseInt(formData.get('slippage')),
                        priorityFee: parseFloat(formData.get('priorityFee')),
                        pool: formData.get('pool')
                    };

                    try {
                        const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${user.wallet.apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(tradeData)
                        });

                        if (!response.ok) throw new Error(`Kauppa epäonnistui: ${response.statusText}`);
                        const data = await response.json();

                        messageDiv.textContent = 'Kauppa suoritettu onnistuneesti!';
                        resultDiv.innerHTML = `Transaktio: <a href="https://solscan.io/tx/${data.signature}" target="_blank">${data.signature}</a>`;
                    } catch (error) {
                        console.error('Trade error:', error);
                        messageDiv.textContent = 'Virhe: ' + error.message;
                        resultDiv.textContent = '';
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching user:', error);
                document.body.innerHTML = '<p style="color: #ff0000; padding: 20px;">⚠️ Virhe käyttäjän latauksessa! <a href="/" style="color: #ffff00;">Takaisin</a></p>';
            });
    }
}

// Tokenin luomissivun logiikka
if (window.location.pathname === '/create') {
    const email = localStorage.getItem('email');
    if (!email) {
        document.body.innerHTML = '<p style="color: #ff0000; padding: 20px;">⚠️ Kirjaudu ensin sisään! <a href="/" style="color: #ffff00;">Takaisin</a></p>';
    } else {
        fetch(`/user?email=${encodeURIComponent(email)}`)
            .then(response => response.json())
            .then(user => {
                document.getElementById('create-form').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const formData = new FormData(this);
                    const messageDiv = document.getElementById('message');
                    const resultDiv = document.getElementById('result');
                    messageDiv.textContent = 'Luodaan tokenia...';

                    try {
                        // 1. Lataa kuva ja metatiedot IPFS:ään
                        const metadataResponse = await fetch('https://pump.fun/api/ipfs', {
                            method: 'POST',
                            body: formData
                        });
                        if (!metadataResponse.ok) throw new Error('IPFS-lataus epäonnistui');
                        const metadataResponseJSON = await metadataResponse.json();

                        // 2. Lähetä luontipyyntö PumpPortalin API:lle
                        const tokenMetadata = {
                            name: formData.get('name'),
                            symbol: formData.get('symbol'),
                            uri: metadataResponseJSON.metadataUri
                        };

                        const createResponse = await fetch(`https://pumpportal.fun/api/trade?api-key=${user.wallet.apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'create',
                                tokenMetadata: tokenMetadata,
                                mint: 'random', // Huom: Oikeassa toteutuksessa generoitava avainpari
                                denominatedInSol: 'true',
                                amount: 1, // Dev buy 1 SOL
                                slippage: 10,
                                priorityFee: 0.0005,
                                pool: 'pump'
                            })
                        });

                        if (!createResponse.ok) throw new Error('Tokenin luonti epäonnistui: ' + createResponse.statusText);
                        const createData = await createResponse.json();

                        messageDiv.textContent = 'Token luotu onnistuneesti!';
                        resultDiv.innerHTML = `Transaktio: <a href="https://solscan.io/tx/${createData.signature}" target="_blank">${createData.signature}</a>`;
                    } catch (error) {
                        console.error('Token creation error:', error);
                        messageDiv.textContent = 'Virhe: ' + error.message;
                        resultDiv.textContent = '';
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching user:', error);
                document.body.innerHTML = '<p style="color: #ff0000; padding: 20px;">⚠️ Virhe käyttäjän latauksessa! <a href="/" style="color: #ffff00;">Takaisin</a></p>';
            });
    }
}

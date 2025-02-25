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
                window.location.href = '/events';
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
        eventsDiv.insertBefore(eventItem, eventsDiv.firstChild);
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

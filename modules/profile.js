const API_BASE = 'https://gamehub-api-imrv.onrender.com';

// Utility: always parse user from localStorage (defensive)
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user')) || {};
    } catch (e) {
        return {};
    }
}

// Utility: save user to localStorage but keep existing _id if response missing it
function saveUserSafely(newPartialUser) {
    const current = getCurrentUser();
    const merged = { ...current, ...(newPartialUser || {}) };
    // Ensure we keep an _id if it existed
    if (!merged._id && current._id) merged._id = current._id;
    localStorage.setItem('user', JSON.stringify(merged));
}

// UI helper
function setMessage(el, txt = '', color = '') {
    el.textContent = txt;
    el.style.color = color || '';
}

export async function openProfileModule() {
    const token = localStorage.getItem('token');

    // show profile module
    document.querySelectorAll('.module').forEach(m => m.style.display = 'none');
    document.getElementById('profileModule').style.display = 'block';

    const form = document.getElementById('profileForm');
    const msg = document.getElementById('profileFormMessage');

    // remove old listener if present
    if (form._profileSubmitHandler) {
        form.removeEventListener('submit', form._profileSubmitHandler);
        form._profileSubmitHandler = null;
    }

    // Fill the form from server using the freshest id from localStorage
    async function loadPlayerInfo() {
        setMessage(msg, ''); // clear

        const user = getCurrentUser();
        const id = user._id;
        if (!id) {
            setMessage(msg, 'Erreur : ID du joueur introuvable (localStorage).', 'red');
            // clear fields to avoid stale data
            document.getElementById('playerId').value = '';
            document.getElementById('playerUsername').value = '';
            document.getElementById('playerEmail').value = '';
            document.getElementById('playerPassword').value = '';
            document.getElementById('playerScore').value = '';
            document.getElementById('playerCreatedAt').value = '';
            document.getElementById('playerRole').innerHTML = '';
            return false;
        }

        try {
            const res = await fetch(`${API_BASE}/api/players/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // handle non-json or empty body defensively
            let data = {};
            try { data = await res.json(); } catch (e) { data = {}; }

            if (!res.ok) {
                setMessage(msg, data.message || `Erreur ${res.status} lors de la récupération du joueur.`, 'red');
                return false;
            }

            const player = data.player || {};
            // Ensure we have an id to fill form; fallback to localStorage id
            const finalId = player._id || id;

            // Fill fields
            document.getElementById('playerId').value = finalId;
            document.getElementById('playerUsername').value = player.username || '';
            document.getElementById('playerEmail').value = player.email || '';
            document.getElementById('playerPassword').value = '';
            document.getElementById('playerScore').value = player.totalScore ?? '';
            document.getElementById('playerCreatedAt').value = player.createdAt ? new Date(player.createdAt).toLocaleString() : '';

            // Role select
            const roleSelect = document.getElementById('playerRole');
            roleSelect.innerHTML = '';
            const roles = ['player', 'admin'];
            roles.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
                if (player.role === r) opt.selected = true;
                roleSelect.appendChild(opt);
            });

            // Disable role editing for non-admin current user (re-read current user)
            const currentUser = getCurrentUser();
            roleSelect.disabled = currentUser.role !== 'admin';

            // Save server player partially to localStorage but keep existing _id if needed
            if (data.player) saveUserSafely(data.player);

            return true;
        } catch (err) {
            console.error('loadPlayerInfo error', err);
            setMessage(msg, 'Erreur de connexion au serveur.', 'red');
            return false;
        }
    }

    // initial load when opening the module
    await loadPlayerInfo();

    // single submit handler
    const submitHandler = async (e) => {
        e.preventDefault();
        setMessage(msg, '');

        // Always read id from form (which should have been filled from loadPlayerInfo)
        const id = document.getElementById('playerId').value || getCurrentUser()._id;
        if (!id) {
            setMessage(msg, 'Erreur : ID joueur introuvable', 'red');
            return;
        }

        // Build payload
        const payload = {
            username: document.getElementById('playerUsername').value.trim(),
            email: document.getElementById('playerEmail').value.trim()
        };
        const pwd = document.getElementById('playerPassword').value.trim();
        if (pwd) payload.password = pwd;

        // Only include role if current user is admin (re-read)
        if (getCurrentUser().role === 'admin') {
            payload.role = document.getElementById('playerRole').value;
        }

        try {
            const res = await fetch(`${API_BASE}/api/players/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            // defensive parsing
            let data = {};
            try { data = await res.json(); } catch (e) { data = {}; }

            if (!res.ok) {
                setMessage(msg, data.error || data.message || `Erreur ${res.status} lors de la mise à jour.`, 'red');
                return;
            }

            // If server returned player, merge it; otherwise merge payload to keep consistency
            if (data.player) {
                saveUserSafely(data.player);
            } else {
                // server did not return full player, at least merge the fields we sent
                saveUserSafely(payload);
            }

            setMessage(msg, '✅ Profil mis à jour avec succès !', 'limegreen');

            // Laisser le message visible un court instant avant de recharger les infos
            setTimeout(() => {
                loadPlayerInfo();
            }, 800); // 800 ms suffit


        } catch (err) {
            console.error('submit error', err);
            setMessage(msg, 'Erreur de connexion au serveur.', 'red');
        }
    };

    // attach and store handler reference so we can remove next time
    form._profileSubmitHandler = submitHandler;
    form.addEventListener('submit', submitHandler);
}

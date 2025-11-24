// public/modules/sessions.js
const API_BASE = 'http://localhost:3000';

let currentSessionPage = 1;
let sessionsPerPage = 5;

// cache des options (chargées une seule fois par session d'ouverture)
let allPlayers = [];
let allGames = [];

// util
function getToken() {
  return localStorage.getItem('token');
}
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user')) || {}; }
  catch (e) { return {}; }
}
function setMessage(el, txt = '', color = '') {
  if (!el) return;
  el.textContent = txt;
  el.style.color = color || '';
}
function formatDuration(seconds) {
  if (seconds == null || seconds === '') return '—';
  seconds = Number(seconds) || 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Chargement des joueurs et jeux (options du formulaire)
// Défensive : si déjà chargés, ne recharge pas.
async function loadFormOptionsIfNeeded() {
  const token = getToken();
  if (!token) return;

  try {
    if (!allPlayers.length) {
      const resP = await fetch(`${API_BASE}/api/players`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dp = await resP.json();
      allPlayers = (dp && dp.players) ? dp.players : [];
    }

    if (!allGames.length) {
      const resG = await fetch(`${API_BASE}/api/games`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dg = await resG.json();
      allGames = (dg && dg.games) ? dg.games : [];
    }

    // Remplir les selects (si présents dans DOM)
    const playerSelect = document.getElementById('sessionPlayer');
    if (playerSelect) {
      playerSelect.innerHTML = '';
      allPlayers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p._id;
        opt.textContent = p.username || p.email || p._id;
        playerSelect.appendChild(opt);
      });
    }

    const gameSelect = document.getElementById('sessionGame');
    if (gameSelect) {
      gameSelect.innerHTML = '';
      allGames.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g._id;
        opt.textContent = g.title || g.slug || g._id;
        gameSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Erreur loadFormOptionsIfNeeded', err);
  }
}

// Ouvre le formulaire d'ajout/édition
function openSessionForm(session = null) {
  const card = document.getElementById('sessionFormCard');
  const form = document.getElementById('sessionForm');
  const title = document.getElementById('sessionFormTitle');
  const msg = document.getElementById('sessionFormMessage');

  if (!card || !form) return;

  setMessage(msg, '');
  title.textContent = session ? 'Modifier session' : 'Nouvelle session';
  card.style.display = 'block';

  if (session) {
    document.getElementById('sessionId').value = session._id || '';
    document.getElementById('sessionPlayer').value = session.player?._id || '';
    document.getElementById('sessionGame').value = session.game?._id || '';
    document.getElementById('sessionScore').value = session.score ?? 0;
    document.getElementById('sessionActive').value = session.active ? 'true' : 'false';
  } else {
    form.reset();
    document.getElementById('sessionId').value = '';
    // default values
    document.getElementById('sessionScore').value = 0;
    document.getElementById('sessionActive').value = 'true';
  }

  // cancel handler (ensure single assignment)
  const cancelBtn = document.getElementById('cancelSessionBtn');
  if (cancelBtn) {
    if (cancelBtn._cancelHandler) cancelBtn.removeEventListener('click', cancelBtn._cancelHandler);
    const cancelHandler = () => { card.style.display = 'none'; };
    cancelBtn._cancelHandler = cancelHandler;
    cancelBtn.addEventListener('click', cancelHandler);
  }

  // submit handler — avoid duplicates by storing reference on form
  if (form._sessionSubmitHandler) {
    form.removeEventListener('submit', form._sessionSubmitHandler);
    form._sessionSubmitHandler = null;
  }

  const submitHandler = async (e) => {
    e.preventDefault();
    setMessage(msg, '');

    const token = getToken();
    if (!token) {
      setMessage(msg, 'Non authentifié.', 'red');
      return;
    }

    const id = document.getElementById('sessionId').value || '';
    const payload = {
      player: document.getElementById('sessionPlayer').value,
      game: document.getElementById('sessionGame').value,
      score: parseInt(document.getElementById('sessionScore').value, 10) || 0,
      active: document.getElementById('sessionActive').value === 'true'
    };

    try {
        console.log(JSON.stringify(payload))
      const res = await fetch(`${API_BASE}/api/sessions${id ? '/' + id : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await (async () => {
        try { return await res.json(); } catch (e) { return {}; }
      })();

      if (!res.ok) {
        setMessage(msg, data.message || `Erreur ${res.status}`, 'red');
        return;
      }

      setMessage(msg, '✅ Session enregistrée !', 'limegreen');

      // fermer et recharger tableau après un petit délai (pour voir le message)
      setTimeout(() => {
        document.getElementById('sessionFormCard').style.display = 'none';
        loadSessions();
      }, 800);

    } catch (err) {
      console.error('Erreur submit session', err);
      setMessage(msg, 'Erreur serveur', 'red');
    }
  };

  form._sessionSubmitHandler = submitHandler;
  form.addEventListener('submit', submitHandler);
}

// Chargement et affichage des sessions (tri / pagination)
export async function openSessionsModule() {
  const token = getToken();
  if (!token) {
    console.warn('openSessionsModule: no token');
  }

  // show module and hide others
  document.querySelectorAll('.module').forEach(m => m.style.display = 'none');
  const moduleEl = document.getElementById('sessionsModule');
  if (!moduleEl) {
    console.error('sessionsModule element not found');
    return;
  }
  moduleEl.style.display = 'block';

  const user = getCurrentUser();

  // configure Add button (admin only)
  const addBtn = document.getElementById('addSessionBtn');
  if (addBtn) {
    addBtn.style.display = (user.role === 'admin') ? 'inline-block' : 'none';
    // bind single handler
    if (addBtn._handler) addBtn.removeEventListener('click', addBtn._handler);
    const handler = async () => {
      await loadFormOptionsIfNeeded();
      openSessionForm(null);
    };
    addBtn._handler = handler;
    addBtn.addEventListener('click', handler);
  }

  // pagination buttons and sort — attach only once
  const prevBtn = document.getElementById('prevSessions');
  const nextBtn = document.getElementById('nextSessions');
  const sortSelect = document.getElementById('sortSessions');

  if (prevBtn) {
    if (!prevBtn._handler) {
      prevBtn._handler = () => {
        if (currentSessionPage > 1) {
          currentSessionPage--;
          loadSessions();
        }
      };
      prevBtn.addEventListener('click', prevBtn._handler);
    }
  }
  if (nextBtn) {
    if (!nextBtn._handler) {
      nextBtn._handler = () => {
        currentSessionPage++;
        loadSessions();
      };
      nextBtn.addEventListener('click', nextBtn._handler);
    }
  }
  if (sortSelect) {
    if (!sortSelect._handler) {
      sortSelect._handler = () => {
        currentSessionPage = 1;
        loadSessions();
      };
      sortSelect.addEventListener('change', sortSelect._handler);
    }
  }

  // ensure options ready for the form (load once)
  await loadFormOptionsIfNeeded();

  // initial load
  await loadSessions();
}

async function loadSessions() {
  const token = getToken();
  const msg = document.getElementById('sessionsMessage');
  setMessage(msg, '');

  const sort = document.getElementById('sortSessions')?.value || '';
  let url = `${API_BASE}/api/sessions?page=${currentSessionPage}&limit=${sessionsPerPage}`;
  if (sort) url += `&sort=${encodeURIComponent(sort)}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await (async () => {
      try { return await res.json(); } catch (e) { return {}; }
    })();

    if (!res.ok) {
      setMessage(msg, data.message || `Erreur ${res.status}`, 'red');
      return;
    }

    const sessions = data.sessions || [];
    const total = data.total || 0;

    const tbody = document.getElementById('sessionList');
    tbody.innerHTML = '';

    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucune session trouvée</td></tr>';
      document.getElementById('prevSessions').disabled = currentSessionPage <= 1;
      document.getElementById('nextSessions').disabled = currentSessionPage * sessionsPerPage >= total;
      return;
    }

    const user = getCurrentUser();

    sessions.forEach(s => {
      const tr = document.createElement('tr');

      // Defensive access to nested populated fields
      const playerName = (s.player && (s.player.username || s.player.email)) || '—';
      const gameTitle = (s.game && (s.game.title || s.game.slug)) || '—';

      tr.innerHTML = `
        <td>${playerName}</td>
        <td>${gameTitle}</td>
        <td>${s.score ?? 0}</td>
        <td>${formatDuration(s.durationSeconds)}</td>
        <td>${s.active ? '✅' : '❌'}</td>
        <td>${s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</td>
      `;

      // clickable rows for admin
      if (user.role === 'admin') {
        tr.style.cursor = 'pointer';
        // bind once by storing on the tr element
        if (tr._clickHandler) tr.removeEventListener('click', tr._clickHandler);
        const clickHandler = async () => {
          // fetch fresh session data from API before editing (to be safe)
          try {
            const sessionRes = await fetch(`${API_BASE}/api/sessions/${s._id}`, {
              headers: { Authorization: `Bearer ${getToken()}` }
            });
            const sessData = await sessionRes.json();
            const sessionObj = (sessionRes.ok && sessData.session) ? sessData.session : s;
            await loadFormOptionsIfNeeded();
            openSessionForm(sessionObj);
          } catch (err) {
            console.error('Erreur récupération session pour édition', err);
            setMessage(document.getElementById('sessionFormMessage'), 'Impossible de récupérer la session.', 'red');
          }
        };
        tr._clickHandler = clickHandler;
        tr.addEventListener('click', clickHandler);
      }

      tbody.appendChild(tr);
    });

    // update pagination disabled state
    document.getElementById('prevSessions').disabled = currentSessionPage <= 1;
    document.getElementById('nextSessions').disabled = currentSessionPage * sessionsPerPage >= total;

  } catch (err) {
    console.error('Erreur loadSessions', err);
    setMessage(msg, 'Erreur de connexion au serveur.', 'red');
  }
}

// expose functions if needed (ES module export)
export default {
  openSessionsModule
};

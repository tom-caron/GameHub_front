const API_BASE = 'http://localhost:3000';

let currentGenrePage = 1;
let genresPerPage = 10; // ✅ par défaut 10

export async function openGenresModule() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const formCard = document.getElementById('genreFormCard');
  if (user.role !== 'admin') {
    formCard.style.display = 'none';

    const listCol = formCard.parentElement.nextElementSibling;
    listCol.classList.remove('col-md-6');
    listCol.classList.add('col-md-12');
  } else {
    setupForm(token, user);
  }

  await loadGenres(token, user);

  // Pagination
  document.getElementById('prevGenres').addEventListener('click', () => {
    if (currentGenrePage > 1) {
      currentGenrePage--;
      loadGenres(token, user);
    }
  });

  document.getElementById('nextGenres').addEventListener('click', () => {
    currentGenrePage++;
    loadGenres(token, user);
  });

  // Tri
  document.getElementById('sortGenres').addEventListener('change', () => {
    currentGenrePage = 1;
    loadGenres(token, user);
  });

  // ✅ Sélection du nombre d’éléments par page
  const limitSelect = document.getElementById('limitGenres');
  limitSelect.addEventListener('change', () => {
    genresPerPage = parseInt(limitSelect.value);
    currentGenrePage = 1;
    loadGenres(token, user);
  });
}

async function loadGenres(token, user) {
  try {
    const sort = document.getElementById('sortGenres').value;
    const url = `${API_BASE}/api/genres?page=${currentGenrePage}&limit=${genresPerPage}${sort ? `&sort=${sort}` : ""}`;
    console.log('Fetching genres from URL:', url);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();

    const genres = data.genres || [];
    const total = data.total || 0;

    const ul = document.getElementById('genreList');
    ul.innerHTML = '';

    genres.forEach(genre => {
      const li = document.createElement('li');
      li.classList.add('list-group-item');
      li.innerHTML = `
        <span>${genre.name}</span>

        ${user.role === 'admin' ? `
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary" onclick="editGenre('${genre._id}')">🖉</button>
          <button class="btn btn-sm btn-danger" onclick="deleteGenre('${genre._id}')">🗑️</button>
        </div>
        ` : ''}
      `;
      ul.appendChild(li);
    });

    document.getElementById('prevGenres').disabled = currentGenrePage <= 1;
    document.getElementById('nextGenres').disabled = currentGenrePage * genresPerPage >= total;

  } catch (err) {
    console.error('Erreur chargement des genres :', err);
  }
}

function setupForm(token, user) {
  const form = document.getElementById('genreForm');
  const messageDiv = document.getElementById('genreFormMessage');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    messageDiv.textContent = '';

    const id = document.getElementById('genreId').value;
    const payload = {
      name: document.getElementById('genreName').value.trim(),
      slug: document.getElementById('genreSlug').value.trim(),
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/api/genres/${id}` : `${API_BASE}/api/genres`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        messageDiv.textContent = errorData.message || 'Erreur lors de la création/modification de la plateforme.';
        messageDiv.style.color = 'red';
        return;
      }

      form.reset();
      document.getElementById('genreId').value = '';
      messageDiv.textContent = '✅ Genre enregistré avec succès !';
      messageDiv.style.color = 'limegreen';

      // Laisse le message visible 1 seconde avant de recharger
      setTimeout(() => {
        loadGenres(token, user);
        messageDiv.textContent = '';
      }, 1000);

    } catch (err) {
      console.error('Erreur envoi formulaire genre :', err);
      messageDiv.textContent = 'Erreur de connexion au serveur.';
      messageDiv.style.color = 'red';
    }
  });
}

window.editGenre = async function (id) {
  const token = localStorage.getItem('token');
  const data = await fetch(`${API_BASE}/api/genres/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  document.getElementById('genreId').value = data.genre._id;
  document.getElementById('genreName').value = data.genre.name;
  document.getElementById('genreSlug').value = data.genre.slug;
};

window.deleteGenre = async function (id) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  if (user.role !== 'admin') return;

  if (!confirm("Supprimer ce genre ?")) return;

  await fetch(`${API_BASE}/api/genres/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  loadGenres(token, user);
};

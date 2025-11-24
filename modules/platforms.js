const API_BASE = 'https://gamehub-api-imrv.onrender.com';

let currentPlatformPage = 1;
let platformsPerPage = 10; // ✅ par défaut 10

export async function openPlatformsModule() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const formCard = document.getElementById('platformFormCard');
  if (user.role !== 'admin') {
    formCard.style.display = 'none';

    const listCol = formCard.parentElement.nextElementSibling;
    listCol.classList.remove('col-md-6');
    listCol.classList.add('col-md-12');
  } else {
    setupForm(token, user);
  }

  await loadPlatforms(token, user);

  // Pagination
  document.getElementById('prevPlatforms').addEventListener('click', () => {
    if (currentPlatformPage > 1) {
      currentPlatformPage--;
      loadPlatforms(token, user);
    }
  });

  document.getElementById('nextPlatforms').addEventListener('click', () => {
    currentPlatformPage++;
    loadPlatforms(token, user);
  });

  // Tri
  document.getElementById('sortPlatforms').addEventListener('change', () => {
    currentPlatformPage = 1;
    loadPlatforms(token, user);
  });

  // ✅ Sélection du nombre d’éléments par page
  const limitSelect = document.getElementById('limitPlatforms');
  limitSelect.addEventListener('change', () => {
    platformsPerPage = parseInt(limitSelect.value);
    currentPlatformPage = 1;
    loadPlatforms(token, user);
  });
}

async function loadPlatforms(token, user) {
  try {
    const sort = document.getElementById('sortPlatforms').value;
    const url = `${API_BASE}/api/platforms?page=${currentPlatformPage}&limit=${platformsPerPage}${sort ? `&sort=${sort}` : ""}`;
    console.log('Fetching platforms from URL:', url);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();

    const platforms = data.platforms || [];
    const total = data.total || 0;

    const ul = document.getElementById('platformList');
    ul.innerHTML = '';

    platforms.forEach(platform => {
      const li = document.createElement('li');
      li.classList.add('list-group-item');
      li.innerHTML = `
        <span>${platform.name}</span>

        ${user.role === 'admin' ? `
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary" onclick="editPlatform('${platform._id}')">🖉</button>
          <button class="btn btn-sm btn-danger" onclick="deletePlatform('${platform._id}')">🗑️</button>
        </div>
        ` : ''}
      `;
      ul.appendChild(li);
    });

    document.getElementById('prevPlatforms').disabled = currentPlatformPage <= 1;
    document.getElementById('nextPlatforms').disabled = currentPlatformPage * platformsPerPage >= total;

  } catch (err) {
    console.error('Erreur chargement plateformes :', err);
  }
}

function setupForm(token, user) {
  const form = document.getElementById('platformForm');
  const messageDiv = document.getElementById('platformFormMessage');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    messageDiv.textContent = '';

    const id = document.getElementById('platformId').value;
    const payload = {
      name: document.getElementById('platformName').value.trim(),
      slug: document.getElementById('platformSlug').value.trim(),
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/api/platforms/${id}` : `${API_BASE}/api/platforms`;

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
      document.getElementById('platformId').value = '';
      messageDiv.textContent = '✅ Plateforme enregistrée avec succès !';
      messageDiv.style.color = 'limegreen';

      // Laisse le message visible 1 seconde avant de recharger
      setTimeout(() => {
        loadPlatforms(token, user);
        messageDiv.textContent = '';
      }, 1000);

    } catch (err) {
      console.error('Erreur envoi formulaire plateforme :', err);
      messageDiv.textContent = 'Erreur de connexion au serveur.';
      messageDiv.style.color = 'red';
    }
  });
}

window.editPlatform = async function (id) {
  const token = localStorage.getItem('token');
  const data = await fetch(`${API_BASE}/api/platforms/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  document.getElementById('platformId').value = data.platform._id;
  document.getElementById('platformName').value = data.platform.name;
  document.getElementById('platformSlug').value = data.platform.slug;
};

window.deletePlatform = async function (id) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  if (user.role !== 'admin') return;

  if (!confirm("Supprimer cette plateforme ?")) return;

  await fetch(`${API_BASE}/api/platforms/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  loadPlatforms(token, user);
};

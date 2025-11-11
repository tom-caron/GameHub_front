const API_BASE = 'http://localhost:3000';

let currentGamePage = 1;
const gamesPerPage = 5;

export async function openGamesModule() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};

    // masquer formulaire si pas admin
    const formCard = document.getElementById('gameFormCard');
    if (user.role !== 'admin') {
    formCard.style.display = 'none';

    // agrandir la liste
    const listCol = formCard.parentElement.nextElementSibling;
    listCol.classList.remove('col-md-6');
    listCol.classList.add('col-md-12');

    } else {
        await loadGenresAndPlatforms(token);
        setupForm(token, user);
    }

  await loadGames(token, user);

    document.getElementById('prevGames').addEventListener('click', () => {
    if (currentGamePage > 1) {
      currentGamePage--;
      loadGames(token, user);
    }
  });

  document.getElementById('nextGames').addEventListener('click', () => {
    currentGamePage++;
    loadGames(token, user);
  });

  document.getElementById('sortGames').addEventListener('change', () => {
  loadGames(token, user);
});

}

async function loadGames(token, user) {
  try {
    const sort = document.getElementById('sortGames').value;
    const url = `${API_BASE}/api/games?page=${currentGamePage}&limit=${gamesPerPage}${sort ? `&sort=${sort}` : ""}`;
    console.log('Fetching games from URL:', url);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    const games = data.games;
    const total = data.total;

    const ul = document.getElementById('gameList');
    ul.innerHTML = '';

    games.forEach(game => {
      const li = document.createElement('li');
      li.classList.add('list-group-item');
      li.innerHTML = `
        <span>${game.title} (${game.genre.name} - ${game.platform.name})</span>

        ${user.role === 'admin' ? `
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary" onclick="editGame('${game._id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteGame('${game._id}')">Del</button>
        </div>
        ` : ''}
      `;
      ul.appendChild(li);
    });

    document.getElementById('prevGames').disabled = currentGamePage <= 1;
    document.getElementById('nextGames').disabled = currentGamePage * gamesPerPage >= total;


  } catch(err){
    console.error('Erreur chargement jeux :', err);
  }
}

function setupForm(token, user){
  const form = document.getElementById('gameForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const id = document.getElementById('gameId').value;
    const payload = {
      title: document.getElementById('gameName').value,
      slug: document.getElementById('gameSlug').value,
      genre: document.getElementById('gameGenre').value,
      platform: document.getElementById('gamePlatform').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/api/games/${id}` : `${API_BASE}/api/games`;

    await fetch(url,{
      method,
      headers:{
        'Content-Type':'application/json',
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify(payload)
    });
    
    form.reset();
    document.getElementById('gameId').value = '';
    loadGames(token,user);
  });
}

async function loadGenresAndPlatforms(token) {
  try {
    const [genresRes, platformsRes] = await Promise.all([
      fetch(`${API_BASE}/api/genres`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/platforms`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const genresData = await genresRes.json();

    const platformsData = await platformsRes.json();

    const genreSelect = document.getElementById('gameGenre');
    const platformSelect = document.getElementById('gamePlatform');

    genreSelect.innerHTML = '';
    platformSelect.innerHTML = '';

    // Remplir le <select> genres
    genresData.genres.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre._id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });

    // Remplir le <select> plateformes
    platformsData.platforms.forEach(platform => {
      const option = document.createElement('option');
      option.value = platform._id;
      option.textContent = platform.name;
      platformSelect.appendChild(option);
    });

  } catch (err) {
    console.error('Erreur chargement genres/plateformes :', err);
  }
}



window.editGame = async function(id){
  const token = localStorage.getItem('token');
  const data = await fetch(`${API_BASE}/api/games/${id}`, {
    headers:{Authorization:`Bearer ${token}`}
  }).then(r=>r.json());

  document.getElementById('gameId').value = data.game._id;
  document.getElementById('gameName').value = data.game.title;
  document.getElementById('gameSlug').value = data.game.slug;
  document.getElementById('gameGenre').value = data.game.genre._id;
  document.getElementById('gamePlatform').value = data.game.platform._id;
}

window.deleteGame = async function(id){
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  if (user.role !== 'admin') return;

  if(!confirm("Supprimer ce jeu ?")) return;

  await fetch(`${API_BASE}/api/games/${id}`,{
    method:'DELETE',
    headers:{Authorization:`Bearer ${token}`}
  });

  loadGames(token, user);
}

import { openGamesModule } from './modules/games.js';
import { openPlatformsModule } from './modules/platforms.js';
import { openGenresModule } from './modules/genres.js';
import { openStatsModule } from './modules/stats.js';

async function loadNavbar() {
  const container = document.getElementById('navbarContainer');
  const response = await fetch('partials/navbar.html');
  const html = await response.text();
  container.innerHTML = html;

  document.querySelectorAll('.btn-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleName = btn.dataset.module;

      fetch(`modules/${moduleName}.html`)
        .then(res => res.text())
        .then(html => {
          document.getElementById('moduleContainer').innerHTML = html;

          // Appelle le module JS correspondant
          if(moduleName === 'games') openGamesModule();
          else if(moduleName === 'platforms') openPlatformsModule();
          else if(moduleName === 'genres') openGenresModule();
          else if(moduleName === 'stats') openStatsModule();
        });
    });
  });

  const user = JSON.parse(localStorage.getItem('user'));
  if(user && document.getElementById('navbarUsername')){
      document.getElementById('navbarUsername').textContent = 'Bonjour ' + user.username + ' !';
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) { 
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    });
  }
}

async function init() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();
    localStorage.setItem('user', JSON.stringify(data.user));

    await loadNavbar(); 

  } catch (error) {
    console.error("Erreur de connexion au serveur d'authentification:", error);
  }
}

init();
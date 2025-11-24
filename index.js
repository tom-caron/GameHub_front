import { openGamesModule } from './modules/games.js';
import { openPlatformsModule } from './modules/platforms.js';
import { openGenresModule } from './modules/genres.js';
import { openStatsModule } from './modules/stats.js';
import { openProfileModule } from './modules/profile.js';
import { openSessionsModule } from './modules/sessions.js';

async function loadModule(moduleName) {
    const moduleContainer = document.getElementById('moduleContainer');

    try {
        const res = await fetch(`modules/${moduleName}.html`);
        const html = await res.text();
        moduleContainer.innerHTML = html;

        // Appelle le JS correspondant
        switch(moduleName) {
            case 'games': openGamesModule(); break;
            case 'platforms': openPlatformsModule(); break;
            case 'genres': openGenresModule(); break;
            case 'stats': openStatsModule(); break;
            case 'profile': openProfileModule(); break;
            case 'sessions': openSessionsModule(); break;
        }
    } catch (err) {
        console.error(`Erreur chargement module ${moduleName}:`, err);
    }
}

async function loadNavbar() {
    const container = document.getElementById('navbarContainer');
    const response = await fetch('partials/navbar.html');
    const html = await response.text();
    container.innerHTML = html;

    // Menu buttons
    document.querySelectorAll('.btn-menu[data-module]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = btn.dataset.module;
            loadModule(moduleName);
        });
    });

    // Ouvrir le module sessions quand on clique sur GameHub
    const gameHubTitle = document.querySelector('h1.m-0.fs-4');
    if(gameHubTitle){
        gameHubTitle.addEventListener('click', (e) => {
            e.preventDefault();
            loadModule('sessions');
        });
    }

    // Affichage nom utilisateur
    const user = JSON.parse(localStorage.getItem('user'));
    if(user && document.getElementById('navbarUsername')){
        document.getElementById('navbarUsername').textContent = 'Bonjour ' + user.username + ' !';
    }

    // Déconnexion
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
        const res = await fetch(`https://gamehub-api-imrv.onrender.com/auth/me`, {
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

        // ✅ Ouvrir le module Sessions par défaut
        loadModule('sessions');

    } catch (error) {
        console.error("Erreur de connexion au serveur d'authentification:", error);
    }
}

init();

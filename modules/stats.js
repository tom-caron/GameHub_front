const API_BASE = 'http://localhost:3000';

export async function openStatsModule() {
    const token = localStorage.getItem('token');

    // Charger les statistiques
    loadStats(token);
}

async function loadStats(token) {
    try {
        const res = await fetch(`${API_BASE}/api/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        // Totaux
        document.getElementById('statTotalGames').textContent = data.totalGames;
        document.getElementById('statTotalPlayers').textContent = data.totalPlayers;
        document.getElementById('statTotalGenres').textContent = data.totalGenres;
        document.getElementById('statTotalPlatforms').textContent = data.totalPlatforms;
        document.getElementById('statTotalSessions').textContent = data.totalSessions;

        // Top 5 joueurs
        const tbody = document.getElementById('topPlayersTable');
        tbody.innerHTML = '';
        const topFivePlayer = data.topFivePlayer.players

        if (!data.topFivePlayer || data.topFivePlayer.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">Aucun joueur trouvé</td></tr>`;
            return;
        }

        topFivePlayer.forEach((player, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${player.username}</td>
                    <td>${player.totalScore}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error('Erreur chargement statistiques :', err);
    }
}

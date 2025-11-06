const API_URL = 'https://webservices-api-98zg.onrender.com/api';

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login.html';
}

let userRole = 'user';
let currentPageBooks = 1;
const limitBooks = 5;
let currentAuthorPage = 1;
const authorsPerPage = 5;

try {
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }
  userRole = payload.role || 'user';
} catch (err) {
  console.error('Token invalide', err);
  window.location.href = '/login.html';
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + token
});

// === Chargement initial ===
document.addEventListener('DOMContentLoaded', () => {
  loadAuthors();
  loadBooks();

  document.getElementById('prevBooks').addEventListener('click', () => {
    if (currentPageBooks > 1) {
      currentPageBooks--;
      loadBooks();
    }
  });

  document.getElementById('nextBooks').addEventListener('click', () => {
    currentPageBooks++;
    loadBooks();
  });

  document.getElementById('prevAuthors').addEventListener('click', () => {
    if (currentAuthorPage > 1) {
      currentAuthorPage--;
      loadAuthors();
    }
  });

  document.getElementById('nextAuthors').addEventListener('click', () => {
    currentAuthorPage++;
    loadAuthors();
  });

  document.getElementById('sortAuthors').addEventListener('change', loadAuthors);
  document.getElementById('sortBooks').addEventListener('change', loadBooks);
  document.getElementById('bookForm').addEventListener('submit', addBook);
  document.getElementById('authorForm').addEventListener('submit', addAuthor);
});

// === Charger la liste des auteurs ===
async function loadAuthors() {
  try {
    const sort = document.getElementById('sortAuthors').value;
    const url = `${API_URL}/authors?page=${currentAuthorPage}&limit=${authorsPerPage}${sort ? `&sort=${sort}` : ""}`;

    const res = await fetch(url, { headers: getHeaders() });
    const data = await res.json();

    const authors = data.authors;
    const total = data.total;

    const select = document.getElementById('authorId');
    if (!authors || authors.length === 0) {
      select.innerHTML = '<option disabled>Aucun auteur trouvé</option>';
      return;
    }

    select.innerHTML = authors.map(a => `<option value="${a._id}">${a.name}</option>`).join('');

    const list = document.getElementById('authorList');
    list.innerHTML = '';
    for (const author of authors) {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
      li.innerHTML = `
        <span><strong>${author.name}</strong> (${author.birthYear})</span>
        ${userRole === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteAuthor('${author._id}')">🗑️</button>` : ''}
      `;
      list.appendChild(li);
    }

    document.getElementById('prevAuthors').disabled = currentAuthorPage <= 1;
    document.getElementById('nextAuthors').disabled = currentAuthorPage * authorsPerPage >= total;

  } catch (err) {
    console.error('Erreur chargement auteurs:', err);
  }
}

// === Charger la liste des livres ===
async function loadBooks() {
  try {
    const sort = document.getElementById('sortBooks')?.value || "";
    const url = `${API_URL}/books?page=${currentPageBooks}&limit=${limitBooks}${sort ? `&sort=${sort}` : ""}`;
    console.log('Fetching books from URL:', url);

    const res = await fetch(url, { headers: getHeaders() });
    const data = await res.json();

    const books = data.books;
    const total = data.total;

    const list = document.getElementById('bookList');
    list.innerHTML = '';
    for (const book of books) {
      const authorName = book.authorId ? book.authorId.name : 'Inconnu';

      const li = document.createElement('li');
      li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
      li.innerHTML = `
        <span><strong>${book.title}</strong> (${book.publishedYear})<br>
        Auteur : ${authorName}</span>
        ${userRole === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteBook('${book._id}')">🗑️</button>` : ''}
      `;
      list.appendChild(li);
    }

    document.getElementById('prevBooks').disabled = currentPageBooks <= 1;
    document.getElementById('nextBooks').disabled = currentPageBooks * limitBooks >= total;

  } catch (err) {
    console.error('Erreur chargement livres:', err);
  }
}

//Ajouter un livre
async function addBook(e) {
  e.preventDefault();

  const bookMessage = document.getElementById('bookMessage');
  if (userRole !== 'admin') {
    bookMessage.className = 'text-danger';
    bookMessage.innerText = "Accès refusé : vous n'êtes pas administrateur.";
    return;
  }

  bookMessage.innerText = '';
  const title = document.getElementById('title').value;
  const authorId = document.getElementById('authorId').value;
  const publishedYear = parseInt(document.getElementById('publishedYear').value);

  try {
    const res = await fetch(`${API_URL}/books`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, authorId, publishedYear })
    });
    const data = await res.json();

    if (res.ok) {
      bookMessage.className = 'text-success';
      bookMessage.innerText = "Livre ajouté avec succès !";
      document.getElementById('bookForm').reset();
      loadBooks();
    } else {
      bookMessage.className = 'text-danger';
      bookMessage.innerText = data.message || data.error || 'Erreur inconnue';
    }
  } catch (err) {
    bookMessage.className = 'text-danger';
    bookMessage.innerText = 'Erreur réseau';
    console.error(err);
  }
}

//Ajouter un auteur
async function addAuthor(e) {
  e.preventDefault();

  const authorMessage = document.getElementById('authorMessage');
  if (userRole !== 'admin') {
    authorMessage.className = 'text-danger';
    authorMessage.innerText = "Accès refusé : vous n'êtes pas administrateur.";
    return;
  }

  authorMessage.innerText = '';
  const name = document.getElementById('name').value;
  const birthYear = parseInt(document.getElementById('birthYear').value);

  try {
    const res = await fetch(`${API_URL}/authors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, birthYear })
    });
    const data = await res.json();

    if (res.ok) {
      authorMessage.className = 'text-success';
      authorMessage.innerText = "Auteur ajouté avec succès !";
      document.getElementById('authorForm').reset();
      loadAuthors();
    } else {
      authorMessage.className = 'text-danger';
      authorMessage.innerText = data.message || data.error || 'Erreur inconnue';
    }
  } catch (err) {
    authorMessage.className = 'text-danger';
    authorMessage.innerText = 'Erreur réseau';
    console.error(err);
  }
}

//Supprimer un livre
async function deleteBook(id) {
  const bookMessage = document.getElementById('bookMessage');
  if (userRole !== 'admin') {
    alert('Accès refusé : vous n\'êtes pas administrateur.');
    return;
  }
  if (!confirm('Supprimer ce livre ?')) return;

  try {
    const res = await fetch(`${API_URL}/books/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      bookMessage.className = 'text-success';
      bookMessage.innerText = "Livre supprimé avec succès !";
      loadBooks();
    } else {
      const data = await res.json();
      alert(`Erreur : ${data.error || data.message}`);
    }
  } catch (err) {
    console.error('Erreur suppression livre:', err);
  }
}

//Supprimer un auteur
async function deleteAuthor(id) {
  const authorMessage = document.getElementById('authorMessage');
  if (userRole !== 'admin') {
    alert('Accès refusé : vous n\'êtes pas administrateur.');
    return;
  }
  if (!confirm('Supprimer cet auteur ?')) return;

  try {
    const res = await fetch(`${API_URL}/authors/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      authorMessage.className = 'text-success';
      authorMessage.innerText = "Auteur supprimé avec succès !";
      loadAuthors();
    } else {
      const data = await res.json();
      authorMessage.className = 'text-danger';
      authorMessage.innerText = data.message || 'Impossible de supprimer l\'auteur.';
    }
  } catch (err) {
    console.error('Erreur suppression auteur:', err);
  }
}

// Déconnexion
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
});

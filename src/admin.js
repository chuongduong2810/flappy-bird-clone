/**
 * admin.js
 * Character admin panel — upload sprites, set name/price, persist to catalog.
 * Auth: Bearer token stored in sessionStorage (ADMIN_SECRET env var).
 */

const TOKEN_KEY = 'flappy_admin_token';
const API = '/api/characters';
const SPRITE_BASE = 'assets/sprites/';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const charForm = document.getElementById('char-form');
const charList = document.getElementById('char-list');
const formStatus = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function apiFetch(method, body, query = '') {
  const res = await fetch(`${API}${query}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function showLogin() {
  loginSection.hidden = false;
  adminSection.hidden = true;
}

function showAdmin() {
  loginSection.hidden = true;
  adminSection.hidden = false;
}

function setStatus(msg, isError = false) {
  formStatus.hidden = !msg;
  formStatus.textContent = msg;
  formStatus.className = isError ? 'status error' : 'status success';
}

async function verifyToken() {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: authHeaders(),
      body: '{}',
    });
    return res.status !== 401;
  } catch {
    return false;
  }
}

async function loadCharacterList() {
  const data = await fetch(API).then((r) => r.json());
  const chars = data.characters || [];
  charList.innerHTML = '';

  for (const c of chars) {
    const row = document.createElement('div');
    row.className = 'char-row';

    const img = document.createElement('img');
    img.src = SPRITE_BASE + c.mid;
    img.alt = c.label;
    img.className = 'char-thumb';
    img.onerror = () => { img.src = `/api/sprite?file=${encodeURIComponent(c.mid)}`; };
    row.appendChild(img);

    const info = document.createElement('div');
    info.className = 'char-info';
    info.innerHTML = `<strong>${c.label}</strong><span class="char-meta">id: ${c.id} · 🪙 ${c.price}</span>`;
    row.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'char-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => fillForm(c));
    actions.appendChild(editBtn);

    const protectedIds = ['yellow', 'red', 'blue'];
    if (!protectedIds.includes(c.id)) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn small danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteCharacter(c.id, c.label));
      actions.appendChild(delBtn);
    }

    row.appendChild(actions);
    charList.appendChild(row);
  }
}

function fillForm(c) {
  document.getElementById('char-id').value = c.id;
  document.getElementById('char-label').value = c.label;
  document.getElementById('char-price').value = c.price;
  ['up', 'mid', 'down'].forEach((frame) => {
    const input = document.getElementById(`sprite-${frame}`);
    input.required = false;
    const preview = document.getElementById(`preview-${frame}`);
    preview.src = SPRITE_BASE + c[frame];
    preview.hidden = false;
    preview.onerror = () => { preview.src = `/api/sprite?file=${encodeURIComponent(c[frame])}`; };
  });
  setStatus(`Editing "${c.label}" — leave sprite fields empty to keep existing images.`);
  document.getElementById('char-id').focus();
}

async function deleteCharacter(id, label) {
  if (!confirm(`Delete "${label}" (${id})?`)) return;
  try {
    await apiFetch('DELETE', { id });
    setStatus(`Deleted "${label}".`);
    await loadCharacterList();
  } catch (err) {
    setStatus(err.message, true);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupPreviews() {
  for (const frame of ['up', 'mid', 'down']) {
    const input = document.getElementById(`sprite-${frame}`);
    const preview = document.getElementById(`preview-${frame}`);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        preview.hidden = true;
        return;
      }
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const secret = document.getElementById('secret-input').value.trim();
  setToken(secret);

  const ok = await verifyToken();
  if (!ok) {
    setToken('');
    loginError.textContent = 'Invalid admin secret.';
    loginError.hidden = false;
    return;
  }
  showAdmin();
  await loadCharacterList();
});

charForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  setStatus('Saving…');

  try {
    const id = document.getElementById('char-id').value.trim();
    const label = document.getElementById('char-label').value.trim();
    const price = parseInt(document.getElementById('char-price').value, 10) || 0;

    const allChars = await fetch(API).then((r) => r.json()).then((d) => d.characters || []);
    const existing = allChars.find((c) => c.id === id) || null;

    const body = {
      id,
      label,
      price,
      up: existing?.up || `${id}_upflap.png`,
      mid: existing?.mid || `${id}_midflap.png`,
      down: existing?.down || `${id}_downflap.png`,
      sprites: {},
    };

    for (const frame of ['up', 'mid', 'down']) {
      const file = document.getElementById(`sprite-${frame}`).files?.[0];
      if (file) {
        body.sprites[frame] = {
          filename: body[frame],
          data: await fileToBase64(file),
        };
      }
    }

    const isNew = !existing;
    if (isNew && Object.keys(body.sprites).length < 3) {
      throw new Error('New characters need all three sprite frames (up, mid, down).');
    }

    const result = await apiFetch('POST', body);
    setStatus(`Saved "${result.character.label}" — refresh the game to see it in the shop.`);
    charForm.reset();
    ['up', 'mid', 'down'].forEach((frame) => {
      document.getElementById(`sprite-${frame}`).required = true;
      document.getElementById(`preview-${frame}`).hidden = true;
    });
    await loadCharacterList();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

charForm.addEventListener('reset', () => {
  ['up', 'mid', 'down'].forEach((frame) => {
    document.getElementById(`sprite-${frame}`).required = true;
    document.getElementById(`preview-${frame}`).hidden = true;
  });
  setStatus('');
});

setupPreviews();

(async function init() {
  const token = getToken();
  if (token) {
    const ok = await verifyToken();
    if (ok) {
      showAdmin();
      await loadCharacterList();
      return;
    }
    setToken('');
  }
  showLogin();
})();

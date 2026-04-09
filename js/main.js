/**
 * ForUs - Main Application Logic (Supabase Version - Debug Mode)
 */

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://gubhrjflcvhzpqvaagnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmhyamZsY3ZoenBxdmFhZ25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDcxMTYsImV4cCI6MjA5MTI4MzExNn0.0Fb_gENYirL7-F_RN_8s7rHbtMQOnErFV32RwMZbhgU';

let sb = null;
try {
    if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase initialized');
    }
} catch (e) {
    console.error('❌ Supabase Init Error:', e);
}

// --- State ---
let appData = {
    startDate: "2025-04-07",
    albums: [],
    notes: []
};
let currentAlbumId = null;

// --- DOM Elements (Refreshed in DOMContentLoaded) ---
let elements = {};

function refreshElements() {
    elements = {
        views: document.querySelectorAll('.view'),
        navLinks: document.querySelectorAll('.nav-link'),
        themeToggle: document.getElementById('theme-toggle'),
        modalContainer: document.getElementById('modal-container'),
        modals: document.querySelectorAll('.modal'),
        header: document.getElementById('header-main'),
        loginError: document.getElementById('login-error')
    };
    console.log('✅ DOM Elements cached');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded fired');
    refreshElements();
    initTheme();
    setupEventListeners();
    
    if (sb) {
        checkUser();
    } else {
        console.error('❌ Supabase not initialized. Check your credentials in js/main.js');
    }
});

// --- Auth Management ---
async function checkUser() {
    try {
        const { data: { user } } = await sb.auth.getUser();
        console.log('👤 Current user:', user ? user.email : 'None');
        handleAuthState(user);

        sb.auth.onAuthStateChange((event, session) => {
            console.log('🔔 Auth state changed:', event);
            handleAuthState(session?.user);
        });
    } catch (e) {
        console.error('❌ checkUser Error:', e);
    }
}

function handleAuthState(user) {
    if (!elements.header) refreshElements();
    
    if (user) {
        if (elements.header) elements.header.style.display = 'flex';
        showView('view-home');
        fetchData();
        startCounter();
    } else {
        if (elements.header) elements.header.style.display = 'none';
        showView('view-login');
    }
}

async function login() {
    console.log('🔑 Login attempt initiated');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = elements.loginError || document.getElementById('login-error');

    if (!email || !password) {
        console.warn('⚠️ Missing email or password');
        return;
    }

    try {
        console.log('📡 Sending request to Supabase...');
        const { error } = await sb.auth.signInWithPassword({ email, password });
        
        if (error) {
            console.error('❌ Login failed:', error.message);
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.innerText = error.message;
            }
        } else {
            console.log('✅ Login successful!');
            if (errorEl) errorEl.style.display = 'none';
        }
    } catch (err) {
        console.error('❌ Unexpected Login Error:', err);
    }
}

async function logout() {
    await sb.auth.signOut();
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme + '-mode';
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    document.body.className = newTheme + '-mode';
    localStorage.setItem('theme', newTheme);
}

// --- Data Management (Supabase) ---
async function fetchData() {
    try {
        console.log('🔄 Fetching app data...');
        // Settings
        const { data: settings, error: sError } = await sb.from('settings').select('*').eq('key', 'start_date').single();
        if (settings) appData.startDate = settings.value;
        if (sError) console.warn('Note: Settings fetch error (may not exist yet):', sError.message);

        // Albums
        const { data: albums } = await sb.from('albums').select('*, photos(*)').order('created_at', { ascending: false });
        appData.albums = albums || [];

        // Notes
        const { data: notes } = await sb.from('notes').select('*').order('created_at', { ascending: false });
        appData.notes = notes || [];

        renderActiveView();
        console.log('✅ Data fetch complete');
    } catch (error) {
        console.error('❌ Error fetching data:', error);
    }
}

// --- View Navigation ---
function showView(viewId) {
    if (!elements.views) refreshElements();
    
    console.log('🖼️ Switching to view:', viewId);
    elements.views.forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    } else {
        console.error('❌ View not found:', viewId);
    }
    
    // Update Nav active state
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.id === `nav-${viewId.replace('view-', '')}`);
    });

    renderActiveView();
}

function renderActiveView() {
    const activeView = document.querySelector('.view.active')?.id;
    if (activeView === 'view-albums') renderAlbums();
    if (activeView === 'view-album-detail') renderAlbumDetail();
    if (activeView === 'view-letters') renderLetters();
}

// --- Counter Logic ---
function startCounter() {
    const startDate = new Date(appData.startDate);
    
    function updateCounter() {
        const now = new Date();
        let years = now.getFullYear() - startDate.getFullYear();
        let months = now.getMonth() - startDate.getMonth();
        let days = now.getDate() - startDate.getDate();

        if (days < 0) {
            months--;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const yEl = document.getElementById('years');
        const mEl = document.getElementById('months');
        const dEl = document.getElementById('days');
        if (yEl) yEl.innerText = years;
        if (mEl) mEl.innerText = months;
        if (dEl) dEl.innerText = days;
    }

    updateCounter();
    setInterval(updateCounter, 1000 * 60 * 60 * 24);
}

// --- Render Functions (Albums, Letters, etc.) ---
function renderAlbums() {
    const grid = document.getElementById('albums-grid');
    if (!grid) return;
    grid.innerHTML = '';
    appData.albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `<div class="album-cover" style="background-image: url('${album.cover_url || '/placeholder-album.jpg'}')"></div><div class="album-info"><h3>${album.name}</h3><p>${album.photos ? album.photos.length : 0} photos</p></div>`;
        card.onclick = () => { currentAlbumId = album.id; showView('view-album-detail'); };
        grid.appendChild(card);
    });
}

function renderAlbumDetail() {
    const album = appData.albums.find(a => a.id === currentAlbumId);
    const grid = document.getElementById('photos-grid');
    if (!album || !grid) return;
    document.getElementById('current-album-title').innerText = album.name;
    grid.innerHTML = '';
    (album.photos || []).forEach(photo => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = `<img src="${photo.url}" class="photo-img"><div class="photo-caption">${photo.caption}</div>`;
        grid.appendChild(card);
    });
}

function renderLetters() {
    const list = document.getElementById('letters-list');
    if (!list) return;
    list.innerHTML = '';
    appData.notes.forEach(letter => {
        const card = document.createElement('div');
        card.className = 'letter-card';
        card.innerHTML = `<div class="letter-header"><span>From: ${letter.author}</span><span class="letter-date">${new Date(letter.created_at).toLocaleDateString()}</span></div><strong class="letter-title">${letter.title || 'Untitled Letter'}</strong>`;
        card.onclick = () => openLetterDetail(letter);
        list.appendChild(card);
    });
}

function openLetterDetail(letter) {
    document.getElementById('view-author').innerText = letter.author;
    document.getElementById('view-date').innerText = new Date(letter.created_at).toLocaleDateString();
    document.getElementById('view-title').innerText = letter.title || 'Untitled Letter';
    document.getElementById('view-content').innerText = letter.content;
    openModal('modal-view-letter');
}

// --- Modal Logic ---
function openModal(modalId) {
    if (elements.modalContainer) {
        elements.modalContainer.classList.add('active');
    }
    
    // Hide all modals first
    const allModals = elements.modals || document.querySelectorAll('.modal');
    allModals.forEach(m => m.style.display = 'none');
    
    // Show the target modal
    const targetModal = document.getElementById(modalId);
    if (targetModal) {
        targetModal.style.display = 'block';
    } else {
        console.error('❌ Modal not found:', modalId);
    }
}

function closeModal() {
    if (elements.modalContainer) elements.modalContainer.classList.remove('active');
}

// --- Event Listeners ---
function setupEventListeners() {
    console.log('👂 Setting up event listeners...');
    
    // Auth
    const loginBtn = document.getElementById('btn-do-login');
    if (loginBtn) {
        loginBtn.onclick = login;
        console.log('   ✅ login button listener attached');
    } else {
        console.error('   ❌ login button NOT FOUND');
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.onclick = logout;

    // Nav
    document.getElementById('nav-home').onclick = () => showView('view-home');
    document.getElementById('nav-albums').onclick = () => showView('view-albums');
    document.getElementById('nav-letters').onclick = () => showView('view-letters');
    
    // Theme
    if (elements.themeToggle) elements.themeToggle.onclick = toggleTheme;

    // Album Actions
    const addAlbumBtn = document.getElementById('btn-add-album');
    if (addAlbumBtn) addAlbumBtn.onclick = () => openModal('modal-add-album');
    
    const backBtn = document.getElementById('btn-back-albums');
    if (backBtn) backBtn.onclick = () => showView('view-albums');

    const confirmAlbumBtn = document.getElementById('confirm-add-album');
    if (confirmAlbumBtn) {
        confirmAlbumBtn.onclick = async () => {
            const name = document.getElementById('input-album-name').value;
            if (!name) return;
            const { error } = await sb.from('albums').insert([{ name }]);
            if (!error) { fetchData(); closeModal(); document.getElementById('input-album-name').value = ''; }
        };
    }

    // Photo Actions
    const addPhotoBtn = document.getElementById('btn-add-photo');
    if (addPhotoBtn) addPhotoBtn.onclick = () => openModal('modal-add-photo');

    const realPhotoInput = document.getElementById('input-photo-file');
    const fakeBtn = document.getElementById('btn-fake-file');
    const fileNameDisplay = document.getElementById('file-name-display');

    if (fakeBtn && realPhotoInput) {
        fakeBtn.onclick = () => realPhotoInput.click();
        realPhotoInput.onchange = () => {
            if (realPhotoInput.files.length > 0) fileNameDisplay.innerText = realPhotoInput.files[0].name;
        };
    }

    const confirmPhotoBtn = document.getElementById('confirm-add-photo');
    if (confirmPhotoBtn) {
        confirmPhotoBtn.onclick = async () => {
            const file = realPhotoInput.files[0];
            const caption = document.getElementById('input-photo-caption').value || '';
            if (!file) return;
            const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await sb.storage.from('photos').upload(fileName, file);
            if (uploadError) return console.error('Upload Error:', uploadError);
            const { data: { publicUrl } } = sb.storage.from('photos').getPublicUrl(fileName);
            const { error: dbError } = await sb.from('photos').insert([{ album_id: currentAlbumId, url: publicUrl, caption: caption }]);
            if (!dbError) {
                fetchData(); closeModal(); realPhotoInput.value = '';
                fileNameDisplay.innerText = 'No file chosen';
                document.getElementById('input-photo-caption').value = '';
            }
        };
    }

    // Letter Actions
    const writeLetterBtn = document.getElementById('btn-write-letter');
    if (writeLetterBtn) writeLetterBtn.onclick = () => openModal('modal-write-letter');
    
    document.querySelectorAll('.author-toggle').forEach(toggle => {
        toggle.onclick = () => {
            document.querySelectorAll('.author-toggle').forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
        };
    });

    const confirmLetterBtn = document.getElementById('confirm-send-letter');
    if (confirmLetterBtn) {
        confirmLetterBtn.onclick = async () => {
            const title = document.getElementById('input-letter-title').value;
            const activeToggle = document.querySelector('.author-toggle.active');
            const author = activeToggle ? activeToggle.dataset.author : 'Unknown';
            const content = document.getElementById('input-letter-content').value;
            if (!author || !content || !title) return;
            const { error } = await sb.from('notes').insert([{ title, author, content }]);
            if (!error) { fetchData(); closeModal(); document.getElementById('input-letter-title').value = ''; document.getElementById('input-letter-content').value = ''; }
        };
    }

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => { btn.onclick = closeModal; });
}

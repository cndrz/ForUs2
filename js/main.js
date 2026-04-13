/**
* ForUs - Main Application Logic (Supabase Version - Debug Mode)
*/
import { createClient } from '@supabase/supabase-js';

// --- Supabase Configuration ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- AI Configuration ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let sb = null;
try {
    if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        sb = createClient(SUPABASE_URL, SUPABASE_KEY);
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
let writingStartTime = null;

// --- DOM Elements (Refreshed in DOMContentLoaded) ---
let elements = {};

function refreshElements() {
    elements = {
        views: document.querySelectorAll('.view'),
        navLinks: document.querySelectorAll('.nav-link'),
        themeToggle: document.getElementById('theme-toggle'),
        modalContainer: document.getElementById('modal-container'),
        modals: document.querySelectorAll('.modal'),
        bottomNav: document.getElementById('bottom-nav'),
        floatingActions: document.getElementById('floating-actions'),
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
    if (!elements.bottomNav) refreshElements();

    if (user) {
        if (elements.bottomNav) elements.bottomNav.style.display = 'flex';
        if (elements.floatingActions) elements.floatingActions.style.display = 'flex';
        showView('view-home');
        fetchData();
        startCounter();
    } else {
        if (elements.bottomNav) elements.bottomNav.style.display = 'none';
        if (elements.floatingActions) elements.floatingActions.style.display = 'none';
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
    showConfirm('Logout', 'Are you sure you want to log out love?', async () => {
        await sb.auth.signOut();
    });
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

    // Update navigation active state
    const viewName = activeView?.replace('view-', '');
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.id === `nav-${viewName}`);
    });
}

// --- Counter Logic ---
function startCounter() {
    const startDate = new Date(appData.startDate);

    function updateCounter() {
        const now = new Date();
        const diff = now - startDate;

        // Breakdown into units
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

        // Time parts
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Update DOM
        const els = {
            years: document.getElementById('years'),
            months: document.getElementById('months'),
            days: document.getElementById('days'),
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds')
        };

        if (els.years) els.years.innerText = years;
        if (els.months) els.months.innerText = months;
        if (els.days) els.days.innerText = days;
        if (els.hours) els.hours.innerText = hours.toString().padStart(2, '0');
        if (els.minutes) els.minutes.innerText = minutes.toString().padStart(2, '0');
        if (els.seconds) els.seconds.innerText = seconds.toString().padStart(2, '0');
    }

    updateCounter();
    setInterval(updateCounter, 1000); // Update every second
}

// --- Render Functions (Albums, Letters, etc.) ---
function renderAlbums() {
    const grid = document.getElementById('albums-grid');
    if (!grid) return;
    grid.innerHTML = '';
    appData.albums.forEach(album => {
        // Use the first photo as the thumbnail if available
        const firstPhoto = album.photos && album.photos.length > 0 ? album.photos[0] : null;
        const thumbnail = firstPhoto ? firstPhoto.url : (album.cover_url || '/placeholder-album.jpg');

        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="card-actions">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteAlbum('${album.id}')">🗑️</button>
            </div>
            <div class="album-cover" style="background-image: url('${thumbnail}')"></div>
            <div class="album-info">
                <h3>${album.name}</h3>
                <p>${album.photos ? album.photos.length : 0} photos</p>
            </div>`;
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
        card.innerHTML = `
            <div class="card-actions">
                <button class="delete-btn" onclick="event.stopPropagation(); deletePhoto('${photo.id}', '${photo.url}')">🗑️</button>
            </div>
            <img src="${photo.url}" class="photo-img">`;
        card.onclick = () => openPhotoViewer(photo.url, photo.caption);
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

    // Stats display
    const statsContainer = document.getElementById('writing-stats');
    if (letter.writing_started_at && letter.writing_finished_at) {
        statsContainer.style.display = 'grid';
        const start = new Date(letter.writing_started_at);
        const end = new Date(letter.writing_finished_at);
        const durationSec = Math.floor((end - start) / 1000);
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;

        document.getElementById('stat-start').innerText = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('stat-end').innerText = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('stat-duration').innerText = `${mins}m ${secs}s`;
    } else {
        statsContainer.style.display = 'none';
    }

    openModal('modal-view-letter');
}

function openPhotoViewer(url, caption) {
    const img = document.getElementById('viewer-img');
    const cap = document.getElementById('viewer-caption');
    if (img) img.src = url;
    if (cap) cap.innerText = caption || '';
    openModal('modal-photo-viewer');
}

// Expose to window for inline onclick handlers
window.openPhotoViewer = openPhotoViewer;
window.deleteAlbum = deleteAlbum;
window.deletePhoto = deletePhoto;

// --- Custom Dialog Logic ---
let pendingConfirmAction = null;

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    // Set the action callback
    pendingConfirmAction = onConfirm;

    // Clean up any old event listener to prevent multiple triggers
    const confirmBtn = document.getElementById('btn-confirm-action');
    confirmBtn.onclick = () => {
        if (pendingConfirmAction) pendingConfirmAction();
        closeModal();
    };

    openModal('modal-confirm');
}

function showAlert(title, message) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    openModal('modal-alert');
}

// --- Deletion Logic ---
async function deleteAlbum(id) {
    showConfirm('Delete Album', 'Are you sure you want to delete this entire album and ALL its photos? This cannot be undone.', async () => {
        try {
            const album = appData.albums.find(a => a.id === id);
            if (album && album.photos) {
                // 1. Delete files from storage
                const fileNames = album.photos.map(p => p.url.split('/').pop());
                if (fileNames.length > 0) {
                    await sb.storage.from('photos').remove(fileNames);
                }
            }

            // 2. Delete album from DB
            await sb.from('photos').delete().eq('album_id', id);
            const { error } = await sb.from('albums').delete().eq('id', id);

            if (error) throw error;

            fetchData();
            if (currentAlbumId === id) showView('view-albums');
        } catch (e) {
            console.error('Error deleting album:', e);
            showAlert('Deletion Failed', 'Failed to delete album: ' + e.message);
        }
    });
}

async function deletePhoto(id, url) {
    showConfirm('Delete Photo', 'Are you sure you want to delete this photo?', async () => {
        try {
            // 1. Delete from Storage
            const fileName = url.split('/').pop();
            await sb.storage.from('photos').remove([fileName]);

            // 2. Delete from DB
            const { error } = await sb.from('photos').delete().eq('id', id);

            if (error) throw error;

            fetchData();
        } catch (e) {
            console.error('Error deleting photo:', e);
            showAlert('Deletion Failed', 'Failed to delete photo: ' + e.message);
        }
    });
}

// --- Flashcards Logic ---
let activeFlashcardCategory = 'Deep & Intimate';

async function generateFlashcard() {
    const flashcardInner = document.getElementById('flashcard-inner');
    const flashcardText = document.getElementById('flashcard-text');
    const btnNext = document.getElementById('btn-next-flashcard');
    
    // Reset state & Disable button
    flashcardInner.classList.remove('is-flipped');
    btnNext.disabled = true;
    btnNext.innerText = 'Thinking...';
    
    // Allow animation to flip back before generating (so user sees front side briefly)
    await new Promise(r => setTimeout(r, 400));
    
    if (!GEMINI_API_KEY) {
        flashcardText.innerText = "Error: VITE_GEMINI_API_KEY not found. Please add it to your environment variables.";
        flashcardInner.classList.add('is-flipped');
        btnNext.disabled = false;
        btnNext.innerText = 'Generate Next Question';
        return;
    }
    
    try {
        const prompt = `You are an AI generating fun, engaging, and meaningful flashcard questions for couples.
Generate exactly ONE short and interesting question (max 2 sentences) for the category: "${activeFlashcardCategory}".
The question should be directly addressed to the partner. Only return the question text without quotes or preamble. Make sure it feels natural.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 100 }
            })
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        let aiText = data.candidates[0].content.parts[0].text.trim();
        // Remove trailing/leading quotes if any
        aiText = aiText.replace(/^["']|["']$/g, '');
        
        flashcardText.innerText = aiText;
    } catch (e) {
        console.error('Gemini Error:', e);
        flashcardText.innerText = "Oops, failed to generate a question! Let's try again.";
    } finally {
        flashcardInner.classList.add('is-flipped');
        btnNext.disabled = false;
        btnNext.innerText = 'Generate Next Question';
    }
}

// --- Modal Logic ---
function openModal(modalId) {
    if (elements.modalContainer) {
        elements.modalContainer.classList.add('active');
    }

    // Start tracking letter writing time
    if (modalId === 'modal-write-letter') {
        writingStartTime = new Date().toISOString();
        console.log('✍️ Started writing at:', writingStartTime);
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
    document.getElementById('nav-flashcards').onclick = () => showView('view-flashcards');
    document.getElementById('nav-logout').onclick = logout;

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
            const writingFinishedTime = new Date().toISOString();

            if (!author || !content || !title) return;

            const { error } = await sb.from('notes').insert([{
                title,
                author,
                content,
                writing_started_at: writingStartTime,
                writing_finished_at: writingFinishedTime
            }]);

            if (!error) {
                fetchData();
                closeModal();
                document.getElementById('input-letter-title').value = '';
                document.getElementById('input-letter-content').value = '';
                writingStartTime = null;
            }
        };
    }

    // Flashcard Actions
    document.querySelectorAll('.flashcard-container').forEach(container => {
        container.onclick = () => {
            const inner = document.getElementById('flashcard-inner');
            if (inner) inner.classList.toggle('is-flipped');
        };
    });
    
    document.querySelectorAll('.category-pills .pill').forEach(pill => {
        pill.onclick = (e) => {
            document.querySelectorAll('.category-pills .pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            activeFlashcardCategory = e.target.dataset.category;
            
            const displayObj = document.getElementById('flashcard-category-display');
            if (displayObj) displayObj.innerText = activeFlashcardCategory;
            
            // Reset card visually when switching categories
            const flashcardInner = document.getElementById('flashcard-inner');
            if (flashcardInner) flashcardInner.classList.remove('is-flipped');
            
            const pText = document.getElementById('flashcard-text');
            if (pText) pText.innerText = "Tap 'Generate' to load question!";
        };
    });

    const nextFlashcardBtn = document.getElementById('btn-next-flashcard');
    if (nextFlashcardBtn) {
        nextFlashcardBtn.onclick = generateFlashcard;
    }

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => { btn.onclick = closeModal; });
}

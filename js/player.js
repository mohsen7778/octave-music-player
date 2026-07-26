// ============================================================
// player.js Octave Hybrid Audio Engine
// Background Playback Active + Ghost Timeline + Juicy Liquid Colors
// ============================================================

window.escapeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

// FIX: Ensure getSafeThumb is available even before app.js loads
if (!window.getSafeThumb) {
    window.getSafeThumb = (track) => {
        if (!track) return '';
        if (track.videoId) return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
        return track.thumb || '';
    };
}

window.OCTAVE = {
    queue:[],
    currentIndex: -1,
    isPlaying: false,
    liked: {},
    playlists: {},
    recentPlayed: [],
    recentSearches:[],
    playStats: {}, 
    activeTrackForOptions: null,
    dailyRecs: { timestamp: 0, tracks:[] },
    trendingData: { timestamp: 0, tracks:[] },
    artistCache: {},
    selectedFont: localStorage.getItem('octave_font') || 'Plus Jakarta Sans',
    sessionHistory:[], 
    trackStartTime: 0,
    isNextTrackManual: true, 
    activeTrackViewed: false,
    isDraggingProgress: false,
    isTransitioning: false, 
    nextTrackPreloaded: false,
    currentTrackErrorRetries: 0
};

// CHANGED: Robust two-tier cache system
const CACHE_KEY = 'octave_data';
const HEAVY_CACHE_KEY = 'octave_heavy_data';
const CACHE_VERSION = 2;

window.saveCache = () => {
    const payload = {
        _v: CACHE_VERSION,
        liked: window.OCTAVE.liked,
        playlists: window.OCTAVE.playlists,
        recentPlayed: (window.OCTAVE.recentPlayed || []).slice(0, 30),
        recentSearches: (window.OCTAVE.recentSearches || []).slice(0, 30),
        playStats: window.OCTAVE.playStats,
        queue: window.OCTAVE.queue,
        currentIndex: window.OCTAVE.currentIndex,
        dailyRecs: window.OCTAVE.dailyRecs,
    };

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.warn('Octave: localStorage quota exceeded. Trimming cache...');
            // Trim playStats to top 50 tracks
            const statsEntries = Object.entries(payload.playStats || {});
            if (statsEntries.length > 50) {
                payload.playStats = Object.fromEntries(
                    statsEntries.sort((a, b) => (b[1].plays || 0) - (a[1].plays || 0)).slice(0, 50)
                );
            }
            // Trim dailyRecs
            if (payload.dailyRecs && payload.dailyRecs.tracks) {
                payload.dailyRecs.tracks = payload.dailyRecs.tracks.slice(0, 5);
            }
            // Trim queue but keep currentIndex valid
            if (payload.queue && payload.queue.length > 20) {
                const current = payload.currentIndex >= 0 ? payload.currentIndex : 0;
                const start = Math.max(0, current - 10);
                const end = Math.min(payload.queue.length, current + 11);
                payload.queue = payload.queue.slice(start, end);
                payload.currentIndex = current - start;
            }
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
            } catch (e2) {
                console.error('Octave: Cache save failed even after trimming.', e2);
            }
        } else {
            console.error('Octave: Cache save failed.', e);
        }
    }
};

// CHANGED: Save heavy/refetchable data separately so it can't wipe main cache
window.saveHeavyCache = () => {
    try {
        localStorage.setItem(HEAVY_CACHE_KEY, JSON.stringify({
            trendingData: window.OCTAVE.trendingData,
            artistCache: window.OCTAVE.artistCache
        }));
    } catch (e) {
        try { localStorage.removeItem(HEAVY_CACHE_KEY); } catch(e) {}
    }
};

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            localStorage.removeItem(CACHE_KEY);
            return;
        }

        // Migrate old format playStats (numbers -> objects)
        if (!parsed._v && parsed.playStats) {
            Object.keys(parsed.playStats).forEach(key => {
                if (typeof parsed.playStats[key] === 'number') {
                    parsed.playStats[key] = {
                        plays: parsed.playStats[key],
                        skips: 0, completes: 0, manual: 0,
                        activeViews: 0, lastPlayedTimeOfDay: ''
                    };
                }
            });
        }

        window.OCTAVE.liked = parsed.liked || {};
        window.OCTAVE.playlists = parsed.playlists || {};
        window.OCTAVE.recentPlayed = Array.isArray(parsed.recentPlayed) ? parsed.recentPlayed : [];
        window.OCTAVE.recentSearches = Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [];
        window.OCTAVE.playStats = parsed.playStats || {};
        window.OCTAVE.queue = Array.isArray(parsed.queue) ? parsed.queue : [];
        
        const savedIndex = parsed.currentIndex;
        window.OCTAVE.currentIndex = (typeof savedIndex === 'number' && savedIndex >= -1 && savedIndex < window.OCTAVE.queue.length) 
            ? savedIndex 
            : -1;
        
        window.OCTAVE.dailyRecs = parsed.dailyRecs || { timestamp: 0, tracks: [] };
    } catch (e) {
        console.error('Octave: Cache load failed. Starting fresh.', e);
        try { localStorage.removeItem(CACHE_KEY); } catch(e) {}
    }

    // Load heavy cache separately (non-critical)
    try {
        const heavyRaw = localStorage.getItem(HEAVY_CACHE_KEY);
        if (heavyRaw) {
            const heavy = JSON.parse(heavyRaw);
            if (heavy.trendingData) window.OCTAVE.trendingData = heavy.trendingData;
            if (heavy.artistCache) window.OCTAVE.artistCache = heavy.artistCache;
        }
    } catch (e) {}
}
loadCache();

window.exportVault = () => {
    const data = localStorage.getItem(CACHE_KEY) || "{}";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Octave_Data_Vault.json";
    a.click();
    URL.revokeObjectURL(url);
};

window.importVault = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (json.playlists || json.liked) {
                localStorage.setItem(CACHE_KEY, e.target.result);
                alert('Data Vault Restored Reloading app');
                location.reload();
            }
        } catch (err) {
            alert('Invalid Vault Backup File');
        }
    };
    reader.readAsText(file);
};

// UPDATED: Working Invidious instances as of July 2026
window.INVIDIOUS = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://yt.chocolatemoo53.com',
    'https://invidious.tiekoetter.com',
    'https://inv.thepixora.com',
    'https://invidious.f5.si'
];

window.invIdx = Math.floor(Math.random() * window.INVIDIOUS.length);

const AUDIO = new Audio();
AUDIO.preload = 'auto';

const PRELOAD_AUDIO = new Audio(); 
PRELOAD_AUDIO.preload = 'auto';
let preloadedVideoId = null;

let audioUnlocked = false;
function unlockAudioEngine() {
    if (audioUnlocked) return;
    audioUnlocked = true;

    AUDIO.play().then(() => { AUDIO.pause(); }).catch(() => {});

    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        ctx.resume().catch(() => {});
    } catch (e) {}
}
document.addEventListener('click', unlockAudioEngine, { once: true });
document.addEventListener('touchstart', unlockAudioEngine, { once: true });

function getStreamUrl(videoId) {
    const base = window.INVIDIOUS[window.invIdx];
    return `${base}/latest_version?id=${videoId}&itag=140&_=${Date.now()}`;
}

async function fetchAudioUrlFromApi(videoId) {
    for (let i = 0; i < window.INVIDIOUS.length; i++) {
        const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 6000);
            const r = await fetch(`${base}/api/v1/videos/${videoId}?fields=adaptiveFormats`, { signal: controller.signal });
            clearTimeout(id);
            if (r.ok) {
                const d = await r.json();
                const audioItags = [251, 250, 249, 140, 141, 139];
                const format = d.adaptiveFormats?.find(f => audioItags.includes(parseInt(f.itag)));
                if (format && format.url) {
                    return format.url;
                }
            }
        } catch (e) { continue; }
    }
    return null;
}


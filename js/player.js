// ========================================
// FILE: js/player.js
// ========================================

// ============================================================
// player.js Octave Adaptive Audio Engine
// Step 1 Fix: Piped Stream Fetch + iFrame Fallback Guard
// ============================================================

window.escapeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

if (!window.getSafeThumb) {
    window.getSafeThumb = (track) => {
        if (!track) return '';
        if (track.videoId) return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
        return track.thumb || '';
    };
}

window.OCTAVE = {
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    liked: {},
    playlists: {},
    recentPlayed: [],
    recentSearches: [],
    playStats: {}, 
    activeTrackForOptions: null,
    dailyRecs: { timestamp: 0, tracks: [] },
    trendingData: { timestamp: 0, tracks: [] },
    artistCache: {},
    selectedFont: localStorage.getItem('octave_font') || 'Plus Jakarta Sans',
    sessionHistory: [], 
    trackStartTime: 0,
    isNextTrackManual: true, 
    activeTrackViewed: false,
    isDraggingProgress: false,
    isTransitioning: false, 
    nextTrackPreloaded: false,
    currentTrackErrorRetries: 0
};

// --- STRICT BROWSER ENGINE SEPARATION ---
const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function') || /Brave/.test(navigator.userAgent);

if (isBrave) {
    window.AUDIO_ENGINE = 'iframe';
    console.log("Octave: Brave detected -> iFrame Engine locked.");
} else {
    window.AUDIO_ENGINE = 'native';
    console.log("Octave: Chrome/Standard Browser -> Native Engine with iFrame Fallback enabled.");
}

let activeEngine = window.AUDIO_ENGINE;

// ============================================================
// STEP 1: BACKGROUND SILENT KEEPALIVE ENGINE
// Keeps Chrome's audio thread open when tab/app is minimized
// ============================================================
let keepAliveCtx = null;
let keepAliveNode = null;

function startSilentKeepalive() {
    if (keepAliveCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        keepAliveCtx = new AudioContext();
        
        const buffer = keepAliveCtx.createBuffer(1, 1, 22050);
        keepAliveNode = keepAliveCtx.createBufferSource();
        keepAliveNode.buffer = buffer;
        keepAliveNode.loop = true;
        keepAliveNode.connect(keepAliveCtx.destination);
        keepAliveNode.start(0);
        console.log("Octave: Silent Keepalive started.");
    } catch (e) {
        console.warn("Octave: Keepalive initialization error", e);
    }
}

function resumeKeepalive() {
    if (keepAliveCtx && keepAliveCtx.state === 'suspended') {
        keepAliveCtx.resume().catch(() => {});
    }
}

// --- PIPED INSTANCES (FOR CHROME NATIVE STREAMING) ---
window.PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.private.coffee',
    'https://pipedapi.mha.fi',
    'https://pipedapi.projectsegfau.lt',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.garudalinux.org'
];

window.pipedIdx = Math.floor(Math.random() * window.PIPED_INSTANCES.length);

async function fetchPipedAudioStreamUrl(videoId) {
    for (let i = 0; i < window.PIPED_INSTANCES.length; i++) {
        const base = window.PIPED_INSTANCES[(window.pipedIdx + i) % window.PIPED_INSTANCES.length];
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 6000);
            const r = await fetch(`${base}/streams/${videoId}`, { signal: controller.signal });
            clearTimeout(id);
            if (r.ok) {
                const data = await r.json();
                if (data && data.audioStreams && data.audioStreams.length > 0) {
                    const bestAudio = data.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
                    if (bestAudio && bestAudio.url) {
                        window.pipedIdx = (window.pipedIdx + i) % window.PIPED_INSTANCES.length;
                        return bestAudio.url;
                    }
                }
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

window.initTrackStats = (videoId) => {
    if (!window.OCTAVE.playStats[videoId]) {
        window.OCTAVE.playStats[videoId] = {
            plays: 0, skips: 0, completes: 0,
            manual: 0, activeViews: 0, lastPlayedTimeOfDay: ''
        };
    }
};

window.saveCache = () => {
    try {
        localStorage.setItem('octave_data', JSON.stringify({
            liked: window.OCTAVE.liked,
            playlists: window.OCTAVE.playlists,
            recentPlayed: window.OCTAVE.recentPlayed.slice(0, 50),
            recentSearches: window.OCTAVE.recentSearches.slice(0, 30),
            playStats: window.OCTAVE.playStats, 
            queue: window.OCTAVE.queue.slice(0, 100),
            currentIndex: window.OCTAVE.currentIndex,
            dailyRecs: window.OCTAVE.dailyRecs,
            trendingData: window.OCTAVE.trendingData,
            artistCache: window.OCTAVE.artistCache
        }));
    } catch(e) {
        console.warn('Octave: saveCache failed', e);
    }
};

function loadCache() {
    try {
        const data = localStorage.getItem('octave_data');
        if (data) {
            const parsed = JSON.parse(data);
            window.OCTAVE.liked = parsed.liked || {};
            window.OCTAVE.playlists = parsed.playlists || {};
            window.OCTAVE.recentPlayed = parsed.recentPlayed || [];
            window.OCTAVE.recentSearches = parsed.recentSearches || [];

            window.OCTAVE.playStats = parsed.playStats || {};
            Object.keys(window.OCTAVE.playStats).forEach(key => {
                if (typeof window.OCTAVE.playStats[key] === 'number') {
                    window.OCTAVE.playStats[key] = { plays: window.OCTAVE.playStats[key], skips: 0, completes: 0, manual: 0, activeViews: 0, lastPlayedTimeOfDay: '' };
                }
            });

            window.OCTAVE.queue = parsed.queue || [];
            window.OCTAVE.currentIndex = parsed.currentIndex !== undefined ? parsed.currentIndex : -1;

            if (window.OCTAVE.currentIndex >= window.OCTAVE.queue.length) {
                window.OCTAVE.currentIndex = window.OCTAVE.queue.length - 1;
            }

            window.OCTAVE.dailyRecs = parsed.dailyRecs || { timestamp: 0, tracks: [] };
            window.OCTAVE.trendingData = parsed.trendingData || { timestamp: 0, tracks: [] };
            window.OCTAVE.artistCache = parsed.artistCache || {};
        }
    } catch(e) {}
}
loadCache();

window.addEventListener('beforeunload', () => { window.saveCache(); });

setInterval(() => {
    if (window.OCTAVE.isPlaying || window.OCTAVE.recentPlayed.length > 0) {
        window.saveCache();
    }
}, 30000);

window.exportVault = () => {
    const data = localStorage.getItem('octave_data') || "{}";
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
                localStorage.setItem('octave_data', e.target.result);
                alert('Data Vault Restored. Reloading app...');
                location.reload();
            }
        } catch (err) {
            alert('Invalid Vault Backup File');
        }
    };
    reader.readAsText(file);
};

// --- NATIVE AUDIO PLAYER CONFIGURATION (CHROME) ---
const AUDIO = new Audio();
AUDIO.preload = 'auto';

const PRELOAD_AUDIO = new Audio(); 
PRELOAD_AUDIO.preload = 'auto';
let preloadedVideoId = null;
let preloadedStreamUrl = null;

let audioUnlocked = false;
function unlockAudioEngine() {
    if (audioUnlocked) return;
    audioUnlocked = true;

    startSilentKeepalive();

    const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIAD+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+AAAAAExhdmM1OS4yNwAAAAAAAAAAAAAAAAQAAgPIAAAAAAAAAAABIQQAAAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFNRTMuMTAwA8gAAAAAAgAAAEH//MUZBAAAAGkAAAAAAAAA0gAAAAAA//MUZCQAAAGkAAAAAAAAA0gAAAAAA//MUZGQAAAGkAAAAAAAAA0gAAAAAA";
    AUDIO.src = SILENT_MP3;
    AUDIO.play().then(() => { AUDIO.pause(); }).catch(() => {});
}
document.addEventListener('click', unlockAudioEngine, { once: true });
document.addEventListener('touchstart', unlockAudioEngine, { once: true });

async function preloadNextTrackInQueue() {
    if (activeEngine !== 'native' || window.OCTAVE.currentIndex < 0) return;
    const nextIdx = window.OCTAVE.currentIndex + 1;
    if (nextIdx < window.OCTAVE.queue.length) {
        const nextId = window.OCTAVE.queue[nextIdx].videoId;
        const streamUrl = await fetchPipedAudioStreamUrl(nextId);
        if (streamUrl) {
            PRELOAD_AUDIO.src = streamUrl;
            preloadedVideoId = nextId;
            preloadedStreamUrl = streamUrl;
            PRELOAD_AUDIO.load(); 
        }
    }
}

const tryNextStream = async (videoId) => {
    updatePlayIcons('fa-solid fa-spinner fa-spin'); 

    let streamUrl = null;
    if (preloadedVideoId === videoId && preloadedStreamUrl) {
        streamUrl = preloadedStreamUrl;
    } else {
        streamUrl = await fetchPipedAudioStreamUrl(videoId);
    }

    // Fall back to iframe if Piped API returns null
    if (!streamUrl) {
        console.warn("Octave: Piped stream unresolvable. Falling back to iFrame.");
        activeEngine = 'iframe';
        playViaIframe(videoId);
        return;
    }

    AUDIO.src = streamUrl;
    AUDIO.load();

    resumeKeepalive();

    AUDIO.play().catch(() => {
        console.warn("Octave: Native playback blocked. Falling back to iFrame.");
        activeEngine = 'iframe';
        playViaIframe(videoId);
    });
};

AUDIO.addEventListener('playing', () => {
    if (activeEngine !== 'native') return;
    window.OCTAVE.currentTrackErrorRetries = 0;
    window.OCTAVE.isTransitioning = false; 
    window.OCTAVE.isPlaying = true;
    updatePlayIcons('fa-solid fa-pause');
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
    }

    startProgressTracking();
    syncMediaSessionPosition();
});

AUDIO.addEventListener('pause', () => {
    if (activeEngine !== 'native') return;

    if (document.hidden && window.OCTAVE.isPlaying) {
        AUDIO.play().catch(() => {});
        resumeKeepalive();
        return;
    }

    window.OCTAVE.isPlaying = false;
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
    }

    const fpIcon = document.querySelector('#fp-play i');
    if (fpIcon && !fpIcon.classList.contains('fa-spinner')) {
        updatePlayIcons('fa-solid fa-play');
    }
    clearInterval(progressTimer);
});

AUDIO.addEventListener('ended', () => {
    if (activeEngine !== 'native') return;
    handleTrackEnded();
});

AUDIO.addEventListener('error', async () => {
    if (activeEngine !== 'native') return;

    if (AUDIO.error && AUDIO.error.code === MediaError.MEDIA_ERR_ABORTED) {
        return;
    }

    const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
    if (track && track.videoId) {
        activeEngine = 'iframe';
        playViaIframe(track.videoId);
    }
});

// --- YOUTUBE IFRAME ENGINE (FOR BRAVE & FALLBACK) ---
let YTP = null;
let ytReadyPromiseResolve = null;
const ytReadyPromise = new Promise((resolve) => {
    ytReadyPromiseResolve = resolve;
});

const script = document.createElement('script');
script.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(script);

window.onYouTubeIframeAPIReady = () => {
    const container = document.createElement('div');
    container.id = 'yt-hidden-frame';
    container.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0;right:0;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    YTP = new YT.Player('yt-hidden-frame', {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
            onReady: e => {
                e.target.setVolume(100);
                if (ytReadyPromiseResolve) ytReadyPromiseResolve();
                
                if (activeEngine === 'iframe' && window.OCTAVE.currentIndex >= 0 && window.OCTAVE.queue.length > 0) {
                    const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
                    YTP.cueVideoById({ videoId: track.videoId });
                }
            },
            onStateChange: onYTS
        }
    });
};

async function playViaIframe(videoId) {
    await ytReadyPromise;
    if (YTP && typeof YTP.loadVideoById === 'function') {
        YTP.loadVideoById({ videoId: videoId });
        YTP.playVideo();
    }
}

function onYTS(e) {
    if (activeEngine !== 'iframe') return;
    if (e.data === YT.PlayerState.PLAYING) {
        window.OCTAVE.isTransitioning = false; 
        window.OCTAVE.isPlaying = true;
        updatePlayIcons('fa-solid fa-pause');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        startProgressTracking();
        syncMediaSessionPosition();
    } else if (e.data === YT.PlayerState.PAUSED) {
        window.OCTAVE.isPlaying = false;
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        const fpIcon = document.querySelector('#fp-play i');
        if (fpIcon && !fpIcon.classList.contains('fa-spinner')) {
            updatePlayIcons('fa-solid fa-play');
        }
        clearInterval(progressTimer);
    } else if (e.data === YT.PlayerState.ENDED) {
        handleTrackEnded();
    }
}

let progressTimer = null;

function handleTrackEnded() {
    window.OCTAVE.isPlaying = false;
    clearInterval(progressTimer);
    if (window.OCTAVE.currentIndex >= 0) {
        const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
        window.initTrackStats(track.videoId);
        window.OCTAVE.playStats[track.videoId].completes++;
        window.saveCache();
    }
    if (window.playNextLogic) window.playNextLogic();
}

window.playNextLogic = () => {
    if (window.OCTAVE.isTransitioning) return; 

    if (window.OCTAVE.currentIndex >= 0 && window.OCTAVE.currentIndex < window.OCTAVE.queue.length - 1) {
        window.OCTAVE.isNextTrackManual = false;
        window.playTrackByIndex(window.OCTAVE.currentIndex + 1);
    } else {
        window.OCTAVE.isTransitioning = true;
        const fpPlay = document.querySelector('#fp-play i');
        if (fpPlay) fpPlay.className = 'fa-solid fa-spinner fa-spin';

        window.fetchAutoDjBatch().then(() => {
            window.OCTAVE.isTransitioning = false;
            if (window.OCTAVE.currentIndex < window.OCTAVE.queue.length - 1) {
                window.OCTAVE.isNextTrackManual = false;
                window.playTrackByIndex(window.OCTAVE.currentIndex + 1);
            } else {
                window.OCTAVE.isPlaying = false;
                updatePlayIcons('fa-solid fa-play');
                clearInterval(progressTimer);
            }
        }).catch(() => {
            window.OCTAVE.isTransitioning = false;
            window.OCTAVE.isPlaying = false;
            updatePlayIcons('fa-solid fa-play');
            clearInterval(progressTimer);
        });
    }
};

function updatePlayIcons(iconClass) {
    const mini = document.querySelector('.play-btn-mini i');
    const fp = document.querySelector('#fp-play i');
    if (mini) mini.className = iconClass;
    if (fp) fp.className = iconClass;
}

window.togglePlay = () => {
    if (window.OCTAVE.currentIndex === -1) return;

    if (activeEngine === 'iframe') {
        ytReadyPromise.then(() => {
            if (window.OCTAVE.isPlaying) {
                YTP.pauseVideo();
            } else {
                YTP.playVideo();
            }
        });
    } else {
        resumeKeepalive();
        window.OCTAVE.isPlaying ? AUDIO.pause() : AUDIO.play().catch(() => {});
    }
};

function startProgressTracking() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
        if (!window.OCTAVE.isPlaying || window.OCTAVE.isDraggingProgress) return;

        let current = 0;
        let total = 0;

        if (activeEngine === 'iframe' && YTP && typeof YTP.getCurrentTime === 'function') {
            current = YTP.getCurrentTime();
            total = YTP.getDuration();
        } else if (activeEngine === 'native') {
            current = AUDIO.currentTime;
            total = AUDIO.duration;
        }

        if (total > 0 && !isNaN(total)) {
            const percent = (current / total) * 100;
            const miniProg = document.getElementById('mini-progress');
            const fpProg = document.getElementById('fp-progress-fill');
            const currTime = document.getElementById('fp-time-current');
            const totTime = document.getElementById('fp-time-total');
            if (miniProg) miniProg.style.width = `${percent}%`;
            if (fpProg) fpProg.style.width = `${percent}%`;
            if (currTime) currTime.textContent = formatTime(current);
            if (totTime) totTime.textContent = formatTime(total);

            if (current >= 50 && !window.OCTAVE.nextTrackPreloaded) {
                preloadNextTrackInQueue();
                window.OCTAVE.nextTrackPreloaded = true;
            }
        }
    }, 500);
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    const thumb = window.getSafeThumb(track);

    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.author,
        artwork: thumb ? [
            { src: thumb, sizes: '96x96', type: 'image/jpeg' },
            { src: thumb, sizes: '128x128', type: 'image/jpeg' },
            { src: thumb, sizes: '192x192', type: 'image/jpeg' },
            { src: thumb, sizes: '256x256', type: 'image/jpeg' },
            { src: thumb, sizes: '384x384', type: 'image/jpeg' },
            { src: thumb, sizes: '512x512', type: 'image/jpeg' }
        ] : []
    });

    navigator.mediaSession.setActionHandler('play', () => { 
        if (activeEngine === 'native') AUDIO.play();
        else window.togglePlay(); 
    });
    navigator.mediaSession.setActionHandler('pause', () => { 
        if (activeEngine === 'native') AUDIO.pause();
        else window.togglePlay(); 
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => { window.playNextLogic(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { window.playPrev(); });

    try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (activeEngine === 'iframe' && YTP && typeof YTP.seekTo === 'function') {
                YTP.seekTo(details.seekTime, true);
            } else if (activeEngine === 'native' && AUDIO.duration) {
                AUDIO.currentTime = details.seekTime;
            }
            syncMediaSessionPosition();
        });
    } catch (e) {}
}

function syncMediaSessionPosition() {
    if (!('mediaSession' in navigator)) return;
    let duration = 0;
    let position = 0;

    if (activeEngine === 'iframe' && YTP && typeof YTP.getDuration === 'function') {
        duration = YTP.getDuration();
        position = YTP.getCurrentTime();
    } else if (activeEngine === 'native') {
        duration = AUDIO.duration;
        position = AUDIO.currentTime;
    }

    if (duration > 0 && !isNaN(duration)) {
        try {
            navigator.mediaSession.setPositionState({
                duration: duration,
                playbackRate: 1,
                position: Math.min(position, duration)
            });
        } catch (e) {}
    }
}

window.playTrackByIndex = (index) => {
    if (window.OCTAVE.isTransitioning) return; 

    if (index < 0 || index >= window.OCTAVE.queue.length) return;
    const track = window.OCTAVE.queue[index];

    window.OCTAVE.isTransitioning = true;
    window.OCTAVE.nextTrackPreloaded = false;
    window.OCTAVE.currentTrackErrorRetries = 0;
    setTimeout(() => { window.OCTAVE.isTransitioning = false; }, 4000); 

    clearInterval(progressTimer);
    window.OCTAVE.isPlaying = false;
    try {
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            navigator.mediaSession.setPositionState(null);
        }
    } catch (e) {}

    updatePlayIcons('fa-solid fa-spinner fa-spin'); 

    const miniProg = document.getElementById('mini-progress');
    const fpProg = document.getElementById('fp-progress-fill');
    const currTime = document.getElementById('fp-time-current');
    const totTime = document.getElementById('fp-time-total');
    if (miniProg) miniProg.style.width = '0%';
    if (fpProg) fpProg.style.width = '0%';
    if (currTime) currTime.textContent = "0:00";
    if (totTime) totTime.textContent = "0:00";

    const hour = new Date().getHours();
    let tod = 'night';
    if (hour >= 5 && hour < 12) tod = 'morning';
    else if (hour >= 12 && hour < 17) tod = 'afternoon';

    window.initTrackStats(track.videoId);
    window.OCTAVE.playStats[track.videoId].plays++;
    window.OCTAVE.playStats[track.videoId].lastPlayedTimeOfDay = tod;

    if (window.OCTAVE.isNextTrackManual) {
        window.OCTAVE.playStats[track.videoId].manual++;
    }

    window.OCTAVE.trackStartTime = Date.now();
    window.OCTAVE.activeTrackViewed = false;
    window.OCTAVE.currentIndex = index;

    if (!window.OCTAVE.sessionHistory.includes(track.videoId)) {
        window.OCTAVE.sessionHistory.push(track.videoId);
    }

    window.OCTAVE.recentPlayed = [track, ...window.OCTAVE.recentPlayed.filter(t => t.videoId !== track.videoId)].slice(0, 50);
    window.saveCache();

    updatePlayerUI(track);
    updateMediaSession(track);

    activeEngine = window.AUDIO_ENGINE; 

    if (activeEngine === 'iframe') {
        playViaIframe(track.videoId);
    } else {
        if (YTP && typeof YTP.pauseVideo === 'function') YTP.pauseVideo();
        tryNextStream(track.videoId); 
    }
};

window.playTrack = (track) => {
    if (window.OCTAVE.isTransitioning) return; 
    window.OCTAVE.isNextTrackManual = true; 
    window.OCTAVE.recentSearches = [track, ...window.OCTAVE.recentSearches.filter(t => t.videoId !== track.videoId)];
    const existIdx = window.OCTAVE.queue.findIndex(t => t.videoId === track.videoId);
    if (existIdx >= 0) {
        window.playTrackByIndex(existIdx);
    } else {
        window.OCTAVE.queue.push(track);
        window.playTrackByIndex(window.OCTAVE.queue.length - 1);
    }
};

window.playPrev = () => {
    if (window.OCTAVE.isTransitioning) return; 

    let current = 0;
    if (activeEngine === 'iframe' && YTP && typeof YTP.getCurrentTime === 'function') {
        current = YTP.getCurrentTime();
    } else if (activeEngine === 'native') {
        current = AUDIO.currentTime;
    }

    if (current > 3) {
        if (activeEngine === 'iframe' && YTP) YTP.seekTo(0);
        else if (activeEngine === 'native') AUDIO.currentTime = 0;
    } else if (window.OCTAVE.currentIndex > 0) {
        window.OCTAVE.isNextTrackManual = true;
        window.playTrackByIndex(window.OCTAVE.currentIndex - 1);
    }
};

window.playPlaylist = (plName) => {
    const pl = window.OCTAVE.playlists[plName];
    if (pl && pl.length > 0) {
        window.OCTAVE.isNextTrackManual = true;
        window.OCTAVE.queue = [...pl];
        window.playTrackByIndex(0);
    }
};

window.deletePlaylist = (plName) => {
    if (confirm(`Are you sure you want to permanently delete "${plName}"?`)) {
        delete window.OCTAVE.playlists[plName];
        window.saveCache();
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) activeNav.click();
    }
};

window.removeFromPlaylist = (plName, index) => {
    window.OCTAVE.playlists[plName].splice(index, 1);
    window.saveCache();
    if (window.renderPlaylistDetail) window.renderPlaylistDetail(plName);
};

window.removeFromLiked = (videoId) => {
    delete window.OCTAVE.liked[videoId];
    window.saveCache();
    if (window.renderLikedSongs) window.renderLikedSongs();
};

window.applyLiquidShadow = (imageSrc) => {
    if (!document.getElementById('liquid-keyframes')) {
        const style = document.createElement('style');
        style.id = 'liquid-keyframes';
        style.innerHTML = `
            @keyframes liquidFlow {
                0% { background-position: 0% 0%; }
                50% { background-position: 100% 100%; }
                100% { background-position: 0% 0%; }
            }
        `;
        document.head.appendChild(style);
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
            const w = img.width;
            const h = img.height;
            const sampleSize = 5;

            const points = [
                { x: Math.floor(w / 2), y: Math.floor(h / 2) },           
                { x: Math.floor(w / 2), y: Math.floor(h * 0.15) },        
                { x: Math.floor(w * 0.85), y: Math.floor(h * 0.85) },     
                { x: Math.floor(w * 0.15), y: Math.floor(h * 0.85) }      
            ];

            let r = 0, g = 0, b = 0, count = 0;

            points.forEach(pt => {
                const startX = Math.max(0, Math.min(pt.x - 2, w - sampleSize));
                const startY = Math.max(0, Math.min(pt.y - 2, h - sampleSize));

                const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize).data;

                for(let i=0; i < imageData.length; i+=4) {
                    if(imageData[i] > 15 || imageData[i+1] > 15 || imageData[i+2] > 15) {
                        r += imageData[i];
                        g += imageData[i+1];
                        b += imageData[i+2];
                        count++;
                    }
                }
            });

            if(count === 0) {
                const fallback = ctx.getImageData(Math.floor(w/2), Math.floor(h/2), 1, 1).data;
                r = fallback[0]; g = fallback[1]; b = fallback[2];
            } else {
                r = Math.floor(r/count); g = Math.floor(g/count); b = Math.floor(b/count);
            }

            let gray = (r + g + b) / 3;
            r = r + (r - gray) * 0.4; 
            g = g + (g - gray) * 0.4;
            b = b + (b - gray) * 0.4;

            r = Math.min(255, Math.max(0, Math.floor(r * 1.2)));
            g = Math.min(255, Math.max(0, Math.floor(g * 1.2)));
            b = Math.min(255, Math.max(0, Math.floor(b * 1.2)));

            const fpPlayer = document.getElementById('full-player');
            if (fpPlayer) {
                fpPlayer.style.background = `
                    radial-gradient(circle at 10% 20%, rgba(${r}, ${g}, ${b}, 0.9) 0%, transparent 40%),
                    radial-gradient(circle at 90% 80%, rgba(${r}, ${g}, ${b}, 0.8) 0%, transparent 40%),
                    radial-gradient(circle at 50% 50%, rgba(${r}, ${g}, ${b}, 0.7) 0%, transparent 50%),
                    var(--bg-deep)
                `;
                fpPlayer.style.backgroundSize = "200% 200%";
                fpPlayer.style.animation = "liquidFlow 15s ease-in-out infinite";
            }

            const fpArt = document.getElementById('fp-art');
            if (fpArt) {
                fpArt.style.boxShadow = `0 15px 30px rgba(0,0,0,0.5), 0 0 10px rgba(${r}, ${g}, ${b}, 1), 0 0 15px rgba(${r}, ${g}, ${b}, 0.8)`;
            }

            const mini = document.querySelector('.mini-player');
            if (mini) {
                mini.style.background = `radial-gradient(circle at 0% 50%, rgba(${r}, ${g}, ${b}, 0.45) 0%, transparent 70%), var(--glass-bg)`;
                mini.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(${r}, ${g}, ${b}, 0.45)`;
            }
        } catch (e) {}
    };
    img.src = imageSrc;
};

function updatePlayerUI(track) {
    const els = {
        mT: document.getElementById('mini-title-el'),
        mA: document.getElementById('mini-artist-el'),
        mArt: document.getElementById('mini-art-el'),
        fT: document.getElementById('fp-title'),
        fA: document.getElementById('fp-artist'),
        fArt: document.getElementById('fp-art'),
        mL: document.getElementById('mini-like-btn'),
        fL: document.getElementById('fp-like')
    };

    const thumb = window.getSafeThumb(track);

    if (els.mT) els.mT.textContent = track.title;
    if (els.mA) els.mA.textContent = track.author;
    if (els.mArt) {
        els.mArt.style.backgroundImage = thumb ? `url(${thumb})` : 'none';
        els.mArt.style.backgroundSize = 'cover';
        els.mArt.style.backgroundPosition = 'center';
        els.mArt.style.backgroundRepeat = 'no-repeat';
    }
    if (els.fT) els.fT.textContent = track.title;
    if (els.fA) els.fA.innerHTML = `${window.escapeHTML(track.author)} <i class="fa-solid fa-chevron-right" style="font-size: 10px; margin-left: 4px;"></i>`;
    if (els.fArt) {
        els.fArt.src = thumb;
        els.fArt.style.display = 'block';
    }

    window.applyLiquidShadow(thumb);

    const isLiked = !!window.OCTAVE.liked[track.videoId];
    const likeHTML = isLiked ? '<i class="fa-solid fa-heart" style="color:var(--accent);"></i>' : '<i class="fa-regular fa-heart"></i>';
    if (els.mL) els.mL.innerHTML = likeHTML;
    if (els.fL) els.fL.innerHTML = likeHTML;

    if (document.getElementById('playlist-detail-list')) {
        const activeNav = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
        if (activeNav === 'home' || activeNav === 'library') {
            if (window.renderHome) window.renderHome();
        }
    }
}

window.toggleLike = (track) => {
    if (window.OCTAVE.liked[track.videoId]) {
        delete window.OCTAVE.liked[track.videoId];
    } else {
        window.OCTAVE.liked[track.videoId] = track;
    }
    window.saveCache();
    updatePlayerUI(track);
    if (window.renderHome) window.renderHome();
};

function seekToPosition(e, containerElement, isFinalSeek = true) {
    if (window.OCTAVE.currentIndex === -1 || !containerElement) return;
    const rect = containerElement.getBoundingClientRect();

    let clientX = 0;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
    } else {
        clientX = e.clientX;
    }

    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    let totalTime = 0;
    if (activeEngine === 'iframe' && YTP && typeof YTP.getDuration === 'function') {
        totalTime = YTP.getDuration();
    } else if (activeEngine === 'native') {
        totalTime = AUDIO.duration;
    }

    if (totalTime > 0 && !isNaN(totalTime)) {
        const fpFill = document.getElementById('fp-progress-fill');
        const miniFill = document.getElementById('mini-progress');
        const currTime = document.getElementById('fp-time-current');

        if (containerElement.id === 'fp-progress-container' && fpFill) fpFill.style.width = `${percentage * 100}%`;
        if (containerElement.classList.contains('mini-player') && miniFill) miniFill.style.width = `${percentage * 100}%`;
        if (currTime) currTime.textContent = formatTime(totalTime * percentage);

        if (isFinalSeek) {
            if (activeEngine === 'iframe' && YTP && typeof YTP.seekTo === 'function') {
                YTP.seekTo(totalTime * percentage, true);
            } else if (activeEngine === 'native') {
                AUDIO.currentTime = totalTime * percentage;
            }
            syncMediaSessionPosition();
        }
    }
}

function initPlayerDOM() {
    try {
        if (window.OCTAVE.currentIndex === -1 && window.OCTAVE.recentPlayed.length > 0) {
            window.OCTAVE.queue = [window.OCTAVE.recentPlayed[0]];
            window.OCTAVE.currentIndex = 0;
            window.saveCache();
        }

        if (window.OCTAVE.currentIndex >= 0 && window.OCTAVE.queue.length > 0) {
            const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
            if (track) {
                updatePlayerUI(track);
                updateMediaSession(track); 
            }
        }

        document.getElementById('close-fp')?.addEventListener('click', () => {
            document.getElementById('full-player')?.classList.remove('active');
        });

        document.querySelector('.mini-player')?.addEventListener('click', (e) => {
            const rect = document.querySelector('.mini-player').getBoundingClientRect();
            if (e.clientY - rect.top <= 10) {
                e.stopPropagation();
                seekToPosition(e, document.querySelector('.mini-player'), true);
            } else {
                document.getElementById('full-player')?.classList.add('active');
                if(window.OCTAVE.currentIndex >= 0 && !window.OCTAVE.activeTrackViewed) {
                    const id = window.OCTAVE.queue[window.OCTAVE.currentIndex].videoId;
                    window.initTrackStats(id);
                    window.OCTAVE.playStats[id].activeViews++;
                    window.OCTAVE.activeTrackViewed = true;
                    window.saveCache();
                }
            }
        });

        document.querySelector('.play-btn-mini')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.togglePlay();
        });

        document.getElementById('fp-play')?.addEventListener('click', window.togglePlay);

        document.getElementById('fp-next')?.addEventListener('click', () => {
            if (window.OCTAVE.isTransitioning) return; 

            if (window.OCTAVE.currentIndex >= 0) {
                const timeListened = Date.now() - window.OCTAVE.trackStartTime;
                if (timeListened < 15000) { 
                    const id = window.OCTAVE.queue[window.OCTAVE.currentIndex].videoId;
                    window.initTrackStats(id);
                    window.OCTAVE.playStats[id].skips++;
                    window.saveCache();
                }
            }
            window.OCTAVE.isNextTrackManual = true;
            if (window.playNextLogic) window.playNextLogic();
        });

        document.getElementById('fp-prev')?.addEventListener('click', window.playPrev);

        document.getElementById('mini-like-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.OCTAVE.currentIndex >= 0) window.toggleLike(window.OCTAVE.queue[window.OCTAVE.currentIndex]);
        });

        document.getElementById('fp-like')?.addEventListener('click', () => {
            if (window.OCTAVE.currentIndex >= 0) window.toggleLike(window.OCTAVE.queue[window.OCTAVE.currentIndex]);
        });

        const fpProgContainer = document.getElementById('fp-progress-container');
        if (fpProgContainer) {
            const handleScrubStart = (e) => {
                window.OCTAVE.isDraggingProgress = true;
                seekToPosition(e, fpProgContainer, false);
            };
            const handleScrubMove = (e) => {
                if (!window.OCTAVE.isDraggingProgress) return;
                if (e.type === 'touchmove' && e.cancelable) e.preventDefault(); 
                seekToPosition(e, fpProgContainer, false);
            };
            const handleScrubEnd = (e) => {
                if (!window.OCTAVE.isDraggingProgress) return;
                window.OCTAVE.isDraggingProgress = false;
                seekToPosition(e, fpProgContainer, true);
            };

            fpProgContainer.addEventListener('mousedown', handleScrubStart);
            document.addEventListener('mousemove', handleScrubMove, { passive: false });
            document.addEventListener('mouseup', handleScrubEnd);

            fpProgContainer.addEventListener('touchstart', handleScrubStart, { passive: true });
            document.addEventListener('touchmove', handleScrubMove, { passive: false });
            document.addEventListener('touchend', handleScrubEnd);
        }
    } catch (domErr) {
        console.warn("Recovered from DOMContentLoaded error inside player.js", domErr);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerDOM);
} else {
    initPlayerDOM();
}

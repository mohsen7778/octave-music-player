// ========================================
// FILE: js/algorithm.js
// ========================================

// ============================================================
// algorithm.js — Octave Top-Notch Auto-DJ & Prediction Engine
// Strict Music Firewall + Direct YouTube CDN Images
// ============================================================

// Failsafe safety net to prevent render crashes if player.js loads out of sync
if (!window.escapeHTML) {
    window.escapeHTML = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
}

// Failsafe fallback array in case algorithm.js loads before player.js
if (!window.INVIDIOUS || !Array.isArray(window.INVIDIOUS) || window.INVIDIOUS.length === 0) {
    window.INVIDIOUS = [
        'https://inv.nadeko.net',
        'https://invidious.nerdvpn.de',
        'https://yt.chocolatemoo53.com',
        'https://invidious.tiekoetter.com',
        'https://inv.thepixora.com',
        'https://invidious.f5.si'
    ];
}
if (typeof window.invIdx === 'undefined') {
    window.invIdx = Math.floor(Math.random() * window.INVIDIOUS.length);
}

window.calculateTrackScore = (track) => {
    if (!track || !track.videoId) return -100;
    const stats = (window.OCTAVE && window.OCTAVE.playStats && window.OCTAVE.playStats[track.videoId]) || { plays: 0, skips: 0, completes: 0, manual: 0, activeViews: 0 };

    let score = 0;
    score += (stats.plays * 1);
    score += (stats.completes * 3);  
    score += (stats.manual * 5);     
    score += (stats.activeViews * 1);
    score -= (stats.skips * 10); 

    if (window.OCTAVE && window.OCTAVE.liked && window.OCTAVE.liked[track.videoId]) score += 20;

    let inPlaylist = false;
    if (window.OCTAVE && window.OCTAVE.playlists) {
        Object.values(window.OCTAVE.playlists).forEach(pl => {
            if (Array.isArray(pl) && pl.find(t => t.videoId === track.videoId)) inPlaylist = true;
        });
    }
    if (inPlaylist) score += 5;

    return score;
};

window.isFetchingBatch = false;

window.fetchAutoDjBatch = async () => {
    if (window.isFetchingBatch) return;
    window.isFetchingBatch = true;

    try {
        const octave = window.OCTAVE || {};
        const liked = octave.liked || {};
        const recentPlayed = octave.recentPlayed || [];
        const queue = octave.queue || [];
        const sessionHistory = octave.sessionHistory || [];

        const allKnown = [...Object.values(liked), ...recentPlayed, ...queue];
        const uniqueKnown = Array.from(new Map(allKnown.map(t => [t.videoId, t])).values());

        let topSeeds = uniqueKnown
            .filter(t => !sessionHistory.includes(t.videoId))
            .sort((a, b) => window.calculateTrackScore(b) - window.calculateTrackScore(a))
            .slice(0, 3);

        if (topSeeds.length === 0 && recentPlayed.length > 0) {
            topSeeds.push(recentPlayed[0]);
        }

        let candidatePool = [];

        // METHOD 1: Fetch recommended videos across safe instances with CORS fallback
        if (topSeeds.length > 0) {
            for (const seed of topSeeds) {
                for (let i = 0; i < window.INVIDIOUS.length; i++) {
                    const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
                    const rawUrl = `${base}/api/v1/videos/${seed.videoId}?fields=recommendedVideos`;
                    const urlsToTry = [rawUrl, `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`];

                    let fetched = false;
                    for (const fetchUrl of urlsToTry) {
                        try {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), 6000); 
                            const r = await fetch(fetchUrl, { signal: controller.signal });
                            clearTimeout(id);
                            if (r.ok) {
                                const d = await r.json();
                                if (d.recommendedVideos && d.recommendedVideos.length > 0) {
                                    candidatePool.push(...d.recommendedVideos);
                                    fetched = true;
                                    break; 
                                }
                            }
                        } catch (e) { continue; }
                    }
                    if (fetched) break;
                }
            }
        }

        // METHOD 2: Use the working Search API for the seed artists
        if (candidatePool.length < 5 && topSeeds.length > 0) {
            for (const seed of topSeeds) {
                try {
                    const searchResults = await window.performSearch(`${seed.author} audio`);
                    if (searchResults && searchResults.length > 0) {
                        candidatePool.push(...searchResults);
                    }
                } catch(e) {}
            }
        }

        // METHOD 3: Nuclear Fallback -> Global Popular Music
        if (candidatePool.length < 5) {
            for (let i = 0; i < window.INVIDIOUS.length; i++) {
                const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
                const rawUrl = `${base}/api/v1/popular?videoCategory=10`;
                const urlsToTry = [rawUrl, `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`];

                let fetched = false;
                for (const fetchUrl of urlsToTry) {
                    try {
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), 6000);
                        const r = await fetch(fetchUrl, { signal: controller.signal });
                        clearTimeout(id);
                        if (r.ok) {
                            const d = await r.json();
                            if (d && Array.isArray(d) && d.length > 0) {
                                candidatePool.push(...d);
                                fetched = true;
                                break;
                            }
                        }
                    } catch(e) { continue; }
                }
                if (fetched) break;
            }
        }

        // --- MILITARY GRADE MUSIC FILTER ---
        const badWords = [
            'tutorial', 'vlog', 'news', 'podcast', 'interview', 'review', 'unboxing', 
            'live', 'type beat', 'full album', 'documentary', 'short', 'shorts', 
            'tiktok', 'meme', 'reaction', 'gameplay', 'how to', 'bts', 'behind the scenes', 
            'teaser', 'trailer', 'audiobook', 'karaoke', 'prank', 'funny', 'compilation'
        ];

        const freshRecs = candidatePool.filter(v => {
            if (!v || !v.videoId) return false;
            // STRICT TIME BOUNDS: Must be between 2 mins (120s) and 7 mins (420s)
            const isMusicLength = v.lengthSeconds ? (v.lengthSeconds >= 120 && v.lengthSeconds <= 420) : true; 
            const notPlayedThisSession = !sessionHistory.includes(v.videoId);
            const notPenalized = window.calculateTrackScore({ videoId: v.videoId }) >= -5; 

            const titleLower = (v.title || '').toLowerCase();
            const authorLower = (v.author || '').toLowerCase();
            const noBadWords = !badWords.some(bw => titleLower.includes(bw) || authorLower.includes(bw));
            const notInQueue = !queue.some(q => q.videoId === v.videoId);

            return isMusicLength && notPlayedThisSession && notPenalized && noBadWords && notInQueue;
        });

        const uniqueRecs = Array.from(new Map(freshRecs.map(t => [t.videoId, t])).values());
        uniqueRecs.sort(() => 0.5 - Math.random());

        const next5 = uniqueRecs.slice(0, 5).map(pick => ({
            videoId: pick.videoId, 
            title: pick.title, 
            author: pick.author,
            thumb: pick.videoId ? `https://i.ytimg.com/vi/${pick.videoId}/hqdefault.jpg` : ''
        }));

        if (next5.length > 0 && window.OCTAVE && Array.isArray(window.OCTAVE.queue)) {
            window.OCTAVE.queue.push(...next5);
            if (typeof window.saveCache === 'function') window.saveCache();
        }

    } catch (e) {
        console.warn("Octave: Silent Auto-DJ batch fetch skipped.", e);
    } finally {
        window.isFetchingBatch = false;
    }
};

setTimeout(() => {
    if (window.playTrackByIndex) {
        const originalPlayTrackByIndex = window.playTrackByIndex;
        window.playTrackByIndex = (index) => {
            originalPlayTrackByIndex(index);
            if (window.OCTAVE && window.OCTAVE.queue && (window.OCTAVE.queue.length - index <= 2)) {
                setTimeout(() => {
                    window.fetchAutoDjBatch();
                }, 2000);
            }
        };
    }
}, 500); 

window.generateDiscoverMix = async () => {
    const allKnown = [...Object.values((window.OCTAVE && window.OCTAVE.liked) || {}), ...((window.OCTAVE && window.OCTAVE.recentPlayed) || [])];
    if (allKnown.length === 0) {
        alert("Play or like some songs first to build your taste profile!");
        return;
    }

    const dynamicView = document.getElementById('dynamic-view');
    if (dynamicView) {
        dynamicView.innerHTML = `
            <div style="padding: 20px;">
                <button class="icon-btn" onclick="document.querySelector('.nav-item.active').click()"><i class="fa-solid fa-arrow-left"></i></button>
            </div>
            <div style="padding: 60px 20px; text-align:center;">
                <i class="fa-solid fa-wand-magic-sparkles fa-bounce" style="font-size: 40px; color: var(--accent); margin-bottom: 20px;"></i>
                <h2>Brewing your mix...</h2>
                <p style="color:var(--text-secondary);font-size:14px;margin-top:10px;">Analyzing taste profile via advanced predictive engine.</p>
            </div>
        `;
    }

    const backupQueue = [...((window.OCTAVE && window.OCTAVE.queue) || [])];
    const backupIndex = window.OCTAVE ? window.OCTAVE.currentIndex : -1;

    if (window.OCTAVE) {
        window.OCTAVE.queue = [];
        window.OCTAVE.currentIndex = -1;
    }

    await window.fetchAutoDjBatch(); 

    if (window.OCTAVE && window.OCTAVE.queue && window.OCTAVE.queue.length > 0) {
        window.OCTAVE.isNextTrackManual = true; 
        window.playTrackByIndex(0);
        const homeTab = document.querySelector('.nav-item[data-tab="home"]');
        if (homeTab) homeTab.click();
    } else {
        if (window.OCTAVE) {
            window.OCTAVE.queue = backupQueue;
            window.OCTAVE.currentIndex = backupIndex;
        }
        alert("Algorithm failed to connect to network. Try again.");
        const homeTab = document.querySelector('.nav-item[data-tab="home"]');
        if (homeTab) homeTab.click(); 
    }
};

window.fetchDailyRecommendations = async () => {
    if (!window.OCTAVE) return;
    const now = Date.now();
    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

    if (window.OCTAVE.dailyRecs && window.OCTAVE.dailyRecs.tracks && window.OCTAVE.dailyRecs.tracks.length > 0) {
        const usesBadThumbs = window.OCTAVE.dailyRecs.tracks.some(t => t.thumb && !t.thumb.includes('ytimg.com'));
        if (!usesBadThumbs && (now - window.OCTAVE.dailyRecs.timestamp < FIVE_DAYS)) return; 
    }

    const allKnown = [...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || [])];
    const topScored = allKnown.sort((a, b) => window.calculateTrackScore(b) - window.calculateTrackScore(a)).slice(0, 10);

    for (let i = 0; i < window.INVIDIOUS.length; i++) {
        const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
        let url = '';
        if (topScored.length > 0) {
            const seed = topScored[Math.floor(Math.random() * topScored.length)];
            url = `${base}/api/v1/videos/${seed.videoId}?fields=recommendedVideos`;
        } else {
            url = `${base}/api/v1/popular?videoCategory=10`; 
        }

        const urlsToTry = [url, `https://corsproxy.io/?url=${encodeURIComponent(url)}`];

        let success = false;
        for (const fetchUrl of urlsToTry) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            try {
                const r = await fetch(fetchUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (r.ok) {
                    const d = await r.json();
                    let newTracks = [];

                    if (topScored.length > 0 && d.recommendedVideos) {
                        newTracks = d.recommendedVideos.filter(v => v.lengthSeconds ? (v.lengthSeconds >= 120 && v.lengthSeconds <= 420) : true).slice(0, 10);
                    } else if (topScored.length === 0 && Array.isArray(d)) {
                        newTracks = d.filter(v => v.lengthSeconds ? (v.lengthSeconds >= 120 && v.lengthSeconds <= 420) : true).slice(0, 10);
                    }

                    if (newTracks.length > 0) {
                        window.OCTAVE.dailyRecs = {
                            timestamp: now,
                            tracks: newTracks.map(rec => ({
                                videoId: rec.videoId, title: rec.title, author: rec.author,
                                thumb: rec.videoId ? `https://i.ytimg.com/vi/${rec.videoId}/hqdefault.jpg` : ''
                            }))
                        };
                        if (typeof window.saveCache === 'function') window.saveCache();
                        const activeTab = document.querySelector('.nav-item.active');
                        if (activeTab && activeTab.getAttribute('data-tab') === 'home' && typeof window.renderHome === 'function') {
                            window.renderHome();
                        }
                        success = true;
                        break;
                    }
                }
            } catch(e) { continue; }
        }
        if (success) break;
    }
};

window.fetchTrendingMusic = async () => {
    const trendingGrid = document.getElementById('home-trending-grid');
    if (!trendingGrid) return;

    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

    if (window.OCTAVE && window.OCTAVE.trendingData && window.OCTAVE.trendingData.tracks && window.OCTAVE.trendingData.tracks.length > 0) {
        if (now - window.OCTAVE.trendingData.timestamp < THREE_DAYS) {
            if (typeof window.renderTrendingTracks === 'function') {
                window.renderTrendingTracks(window.OCTAVE.trendingData.tracks, trendingGrid);
            }
            return;
        }
    }

    try {
        const r = await fetch(`https://itunes.apple.com/us/rss/topsongs/limit=50/json?_t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) {
            const d = await r.json();
            if (d.feed && d.feed.entry) {
                const uniqueTracks = new Map();

                d.feed.entry.forEach(entry => {
                    const title = entry['im:name'].label;
                    const author = entry['im:artist'].label;
                    const key = `${title}-${author}`.toLowerCase(); 

                    if (!uniqueTracks.has(key)) {
                        let thumbUrl = '';
                        if (entry['im:image'] && entry['im:image'].length > 0) {
                            thumbUrl = entry['im:image'][entry['im:image'].length - 1].label;
                        }

                        uniqueTracks.set(key, {
                            videoId: null, 
                            title: title,
                            author: author,
                            thumb: thumbUrl
                        });
                    }
                });

                const newTracks = Array.from(uniqueTracks.values());

                if (newTracks.length > 0 && window.OCTAVE) {
                    window.OCTAVE.trendingData = {
                        timestamp: now,
                        tracks: newTracks
                    };
                    if (typeof window.saveCache === 'function') window.saveCache();
                    if (typeof window.renderTrendingTracks === 'function') {
                        window.renderTrendingTracks(newTracks, trendingGrid);
                    }
                }
            }
        }
    } catch(e) { 
        trendingGrid.innerHTML = '<div class="empty-state-text">Failed to load charts.</div>';
    }
};

window.renderTrendingTracks = (tracks, container) => {
    if (!container) return;
    container.innerHTML = '';
    tracks.forEach(track => {
        const el = document.createElement('div');
        el.className = 'square-card';
        el.innerHTML = `<div class="card-art shadow-heavy" style="background-image: url('${track.thumb}'); background-size: cover;"></div><div class="card-title">${window.escapeHTML(track.title)}</div>`;

        el.addEventListener('click', async () => {
            if (!track.videoId) {
                el.style.opacity = '0.5'; 
                const query = `${track.author} ${track.title} audio`;
                const results = await window.performSearch(query);
                el.style.opacity = '1';

                if (results && results.length > 0) {
                    track.videoId = results[0].videoId;
                    if (typeof window.saveCache === 'function') window.saveCache(); 
                    if (typeof window.playTrack === 'function') window.playTrack(track);
                } else {
                    alert("Could not find an audio stream for this track.");
                }
            } else {
                if (typeof window.playTrack === 'function') window.playTrack(track);
            }
        });

        container.appendChild(el);
    });
};

window.smartShufflePlaylist = (plName) => {
    if (!window.OCTAVE || !window.OCTAVE.playlists) return;
    const pl = window.OCTAVE.playlists[plName];
    if (pl && pl.length > 0) {
        let sorted = [...pl].sort((a, b) => {
            const countA = window.calculateTrackScore(a);
            const countB = window.calculateTrackScore(b);
            if (countB !== countA) return countB - countA;
            return 0.5 - Math.random(); 
        });
        window.OCTAVE.queue = sorted; 
        window.OCTAVE.isNextTrackManual = true;
        if (typeof window.playTrackByIndex === 'function') window.playTrackByIndex(0);
    }
};

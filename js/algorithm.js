// ============================================================
// algorithm.js — Octave Top-Notch Auto-DJ & Prediction Engine
// Features: Silent Background Batching, Triple-Seed Blending, Strict Filtering
// ============================================================

// --- 1. TRACK SCORING ENGINE (UPGRADED) ---
window.calculateTrackScore = (track) => {
    if (!track || !track.videoId) return -100;
    const stats = window.OCTAVE.playStats[track.videoId] || { plays: 0, skips: 0, completes: 0, manual: 0, activeViews: 0 };
    
    let score = 0;
    score += (stats.plays * 1);
    score += (stats.completes * 3);  // Higher reward for finishing
    score += (stats.manual * 5);     // High reward for manual search/click
    score += (stats.activeViews * 1);
    
    // Aggressive Penalty for skips
    score -= (stats.skips * 10); 
    
    // Massive reward for liking the song
    if (window.OCTAVE.liked && window.OCTAVE.liked[track.videoId]) score += 20;
    
    // Playlist presence reward
    let inPlaylist = false;
    if (window.OCTAVE.playlists) {
        Object.values(window.OCTAVE.playlists).forEach(pl => {
            if (pl.find(t => t.videoId === track.videoId)) inPlaylist = true;
        });
    }
    if (inPlaylist) score += 5;
    
    return score;
};

// --- 2. SILENT BACKGROUND BATCH FETCHER ---
window.isFetchingBatch = false;

window.fetchAutoDjBatch = async () => {
    if (window.isFetchingBatch) return;
    window.isFetchingBatch = true;

    try {
        // Pool all known tracks to find the ultimate seeds
        const allKnown =[...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || []), ...(window.OCTAVE.queue ||[])];
        const uniqueKnown = Array.from(new Map(allKnown.map(t =>[t.videoId, t])).values());
        
        // Grab the top 3 highest scored tracks that haven't been overplayed in this exact session
        const topSeeds = uniqueKnown
            .filter(t => !window.OCTAVE.sessionHistory.includes(t.videoId))
            .sort((a, b) => window.calculateTrackScore(b) - window.calculateTrackScore(a))
            .slice(0, 3);
            
        // Fallback to recent track if no high scores found
        if (topSeeds.length === 0 && window.OCTAVE.recentPlayed.length > 0) {
            topSeeds.push(window.OCTAVE.recentPlayed[0]);
        }
        if (topSeeds.length === 0) return; // Nothing to seed from

        let candidatePool =[];
        
        // Race all 3 seeds concurrently to Invidious
        const fetchPromises = topSeeds.map((seed, index) => {
            const base = window.INVIDIOUS[(window.invIdx + index) % window.INVIDIOUS.length];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // Strict timeout to free resources
            
            return fetch(`${base}/api/v1/videos/${seed.videoId}?fields=recommendedVideos`, { signal: controller.signal })
                .then(r => r.json())
                .then(d => {
                    if (d.recommendedVideos) candidatePool.push(...d.recommendedVideos);
                })
                .catch(() => {})
                .finally(() => clearTimeout(timeoutId));
        });

        // Wait silently in the background
        await Promise.all(fetchPromises);

        // STRICT MUSIC FIREWALL (Blocks Vlogs, News, Podcasts, etc.)
        const badWords =['tutorial', 'vlog', 'news', 'podcast', 'interview', 'review', 'unboxing', 'live', 'type beat', 'full album', 'documentary'];
        
        const freshRecs = candidatePool.filter(v => {
            const isShortEnough = v.lengthSeconds && v.lengthSeconds < 600 && v.lengthSeconds > 60; // 1 to 10 mins strictly
            const notPlayedThisSession = !window.OCTAVE.sessionHistory.includes(v.videoId);
            const notPenalized = window.calculateTrackScore({ videoId: v.videoId }) >= -5; // Ban heavily skipped songs
            
            const titleLower = (v.title || '').toLowerCase();
            const authorLower = (v.author || '').toLowerCase();
            const noBadWords = !badWords.some(bw => titleLower.includes(bw) || authorLower.includes(bw));

            return isShortEnough && notPlayedThisSession && notPenalized && noBadWords;
        });

        // Deduplicate and Shuffle
        const uniqueRecs = Array.from(new Map(freshRecs.map(t => [t.videoId, t])).values());
        uniqueRecs.sort(() => 0.5 - Math.random());
        
        // Take the absolute best 5 and securely push them to the current queue
        const next5 = uniqueRecs.slice(0, 5).map(pick => ({
            videoId: pick.videoId, 
            title: pick.title, 
            author: pick.author,
            thumb: (pick.videoThumbnails && pick.videoThumbnails.length > 0) ? pick.videoThumbnails[0].url : ''
        }));

        if (next5.length > 0) {
            window.OCTAVE.queue.push(...next5);
            window.saveCache();
        }
        
    } catch (e) {
        console.warn("Octave: Silent Auto-DJ batch fetch skipped.");
    } finally {
        window.isFetchingBatch = false;
    }
};

// --- 3. QUEUE MANAGER (INTERCEPTS PLAYBACK TO FILL BACKGROUND) ---
// We wrap the original playTrackByIndex so every time a song starts, it checks if it needs to fetch more.
setTimeout(() => {
    if (window.playTrackByIndex) {
        const originalPlayTrackByIndex = window.playTrackByIndex;
        window.playTrackByIndex = (index) => {
            originalPlayTrackByIndex(index);
            
            // If there are 2 or fewer songs left in the queue, fetch 5 more silently!
            if (window.OCTAVE.queue.length - index <= 2) {
                // Give the UI 2 seconds to settle the new song, then secretly fetch
                setTimeout(() => {
                    window.fetchAutoDjBatch();
                }, 2000);
            }
        };
    }
}, 500); // Short delay to ensure player.js has loaded first

// The main Next button logic
window.playNextLogic = async () => {
    if (window.OCTAVE.isTransitioning) return;
    
    // If we surprisingly hit the absolute end (meaning background fetch failed or user clicked too fast)
    if (window.OCTAVE.currentIndex >= window.OCTAVE.queue.length - 1) {
        const fpPlay = document.querySelector('#fp-play i');
        if (fpPlay) fpPlay.className = 'fa-solid fa-spinner fa-spin'; // Only show loader when desperately needed
        
        await window.fetchAutoDjBatch();
    }

    if (window.OCTAVE.currentIndex < window.OCTAVE.queue.length - 1) {
        window.OCTAVE.isNextTrackManual = false; // Flag as Auto-DJ choice
        window.playTrackByIndex(window.OCTAVE.currentIndex + 1);
    } else {
        window.OCTAVE.isPlaying = false;
        const fpPlay = document.querySelector('#fp-play i');
        if (fpPlay) fpPlay.className = 'fa-solid fa-play';
    }
};
window.playNext = window.playNextLogic; // Fallback mapping

// --- 4. VISUAL MANUAL DISCOVER MIX ---
// This is triggered ONLY when they click the "Discover Mix" button. It shows the UI intentionally.
window.generateDiscoverMix = async () => {
    const allKnown =[...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || [])];
    if (allKnown.length === 0) {
        alert("Play or like some songs first to build your taste profile!");
        return;
    }

    const dynamicView = document.getElementById('dynamic-view');
    const originalHTML = dynamicView.innerHTML;
    
    // Show beautiful loading UI since this is a manual request
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

    // Empty the queue and force a massive batch fetch
    window.OCTAVE.queue =[];
    window.OCTAVE.currentIndex = -1;
    
    await window.fetchAutoDjBatch(); // Grabs 5
    await window.fetchAutoDjBatch(); // Grabs 5 more (10 total)

    if (window.OCTAVE.queue.length > 0) {
        window.OCTAVE.isNextTrackManual = true; // Mark as manual intent
        window.playTrackByIndex(0);
        const homeTab = document.querySelector('.nav-item[data-tab="home"]');
        if (homeTab) homeTab.click();
    } else {
        dynamicView.innerHTML = originalHTML;
        alert("Algorithm failed to connect to network. Try again.");
    }
};

// --- 5. STATIC DATA FETCHERS ---
window.fetchDailyRecommendations = async () => {
    if (!window.OCTAVE) return;
    const now = Date.now();
    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
    
    if (window.OCTAVE.dailyRecs && window.OCTAVE.dailyRecs.tracks && window.OCTAVE.dailyRecs.tracks.length > 0) {
        if (now - window.OCTAVE.dailyRecs.timestamp < FIVE_DAYS) return; 
    }
    
    const allKnown =[...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || [])];
    const topScored = allKnown.sort((a, b) => window.calculateTrackScore(b) - window.calculateTrackScore(a)).slice(0, 10);
    
    for (let i = 0; i < window.INVIDIOUS.length; i++) {
        const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            let url = '';
            if (topScored.length > 0) {
                const seed = topScored[Math.floor(Math.random() * topScored.length)];
                url = `${base}/api/v1/videos/${seed.videoId}?fields=recommendedVideos`;
            } else {
                url = `${base}/api/v1/popular?videoCategory=10`; 
            }

            const r = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (r.ok) {
                const d = await r.json();
                let newTracks =[];

                if (topScored.length > 0 && d.recommendedVideos) {
                    newTracks = d.recommendedVideos.filter(v => v.lengthSeconds && v.lengthSeconds < 600).slice(0, 10);
                } else if (topScored.length === 0 && Array.isArray(d)) {
                    newTracks = d.filter(v => v.lengthSeconds && v.lengthSeconds < 600).slice(0, 10);
                }

                if (newTracks.length > 0) {
                    window.OCTAVE.dailyRecs = {
                        timestamp: now,
                        tracks: newTracks.map(rec => ({
                            videoId: rec.videoId, title: rec.title, author: rec.author,
                            thumb: (rec.videoThumbnails && rec.videoThumbnails.length > 0) ? rec.videoThumbnails[0].url : ''
                        }))
                    };
                    window.saveCache();
                    const activeTab = document.querySelector('.nav-item.active');
                    if (activeTab && activeTab.getAttribute('data-tab') === 'home') {
                        window.renderHome();
                    }
                    break;
                }
            }
        } catch(e) { continue; }
    }
};

window.fetchTrendingMusic = async () => {
    const trendingGrid = document.getElementById('home-trending-grid');
    if (!trendingGrid) return;

    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

    if (window.OCTAVE.trendingData && window.OCTAVE.trendingData.tracks && window.OCTAVE.trendingData.tracks.length > 0) {
        if (now - window.OCTAVE.trendingData.timestamp < THREE_DAYS) {
            window.renderTrendingTracks(window.OCTAVE.trendingData.tracks, trendingGrid);
            return;
        }
    }

    try {
        const r = await fetch('https://itunes.apple.com/us/rss/topsongs/limit=50/json');
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

                if (newTracks.length > 0) {
                    window.OCTAVE.trendingData = {
                        timestamp: now,
                        tracks: newTracks
                    };
                    window.saveCache();
                    window.renderTrendingTracks(newTracks, trendingGrid);
                }
            }
        }
    } catch(e) { 
        trendingGrid.innerHTML = '<div class="empty-state-text">Failed to load charts.</div>';
    }
};

window.renderTrendingTracks = (tracks, container) => {
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
                    window.saveCache(); 
                    window.playTrack(track);
                } else {
                    alert("Could not find an audio stream for this track.");
                }
            } else {
                window.playTrack(track);
            }
        });
        
        container.appendChild(el);
    });
};

window.smartShufflePlaylist = (plName) => {
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
        window.playTrackByIndex(0);
    }
};

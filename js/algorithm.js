// ============================================================
// algorithm.js — Octave Top-Notch Auto-DJ & Prediction Engine
// Strict Firewall + YouTube CDN Thumbnails
// ============================================================

window.calculateTrackScore = (track) => {
    if (!track || !track.videoId) return -100;
    const stats = window.OCTAVE.playStats[track.videoId] || { plays: 0, skips: 0, completes: 0, manual: 0, activeViews: 0 };
    
    let score = 0;
    score += (stats.plays * 1);
    score += (stats.completes * 3);  
    score += (stats.manual * 5);     
    score += (stats.activeViews * 1);
    score -= (stats.skips * 10); 
    
    if (window.OCTAVE.liked && window.OCTAVE.liked[track.videoId]) score += 20;
    
    let inPlaylist = false;
    if (window.OCTAVE.playlists) {
        Object.values(window.OCTAVE.playlists).forEach(pl => {
            if (pl.find(t => t.videoId === track.videoId)) inPlaylist = true;
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
        const allKnown =[...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || []), ...(window.OCTAVE.queue ||[])];
        const uniqueKnown = Array.from(new Map(allKnown.map(t =>[t.videoId, t])).values());
        
        let topSeeds = uniqueKnown
            .filter(t => !window.OCTAVE.sessionHistory.includes(t.videoId))
            .sort((a, b) => window.calculateTrackScore(b) - window.calculateTrackScore(a))
            .slice(0, 3);
            
        if (topSeeds.length === 0 && window.OCTAVE.recentPlayed.length > 0) {
            topSeeds.push(window.OCTAVE.recentPlayed[0]);
        }

        let candidatePool =[];

        // METHOD 1: Fetch recommended videos aggressively across safe instances
        if (topSeeds.length > 0) {
            for (const seed of topSeeds) {
                for (let i = 0; i < window.INVIDIOUS.length; i++) {
                    const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
                    try {
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), 3500); 
                        const r = await fetch(`${base}/api/v1/videos/${seed.videoId}?fields=recommendedVideos`, { signal: controller.signal });
                        clearTimeout(id);
                        if (r.ok) {
                            const d = await r.json();
                            if (d.recommendedVideos && d.recommendedVideos.length > 0) {
                                candidatePool.push(...d.recommendedVideos);
                                break; 
                            }
                        }
                    } catch (e) { continue; }
                }
            }
        }

        // METHOD 2: Robust Fallback -> Use the working Search API for the seed artists
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
                try {
                    const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
                    const r = await fetch(`${base}/api/v1/popular?videoCategory=10`);
                    if (r.ok) {
                        const d = await r.json();
                        if (d && d.length > 0) {
                            candidatePool.push(...d);
                            break;
                        }
                    }
                } catch(e) { continue; }
            }
        }

        // --- MILITARY-GRADE MUSIC FIREWALL ---
        const badWords = [
            'tutorial', 'vlog', 'news', 'podcast', 'interview', 'review', 'unboxing', 
            'live', 'type beat', 'full album', 'documentary', 'short', 'shorts', 
            'tiktok', 'meme', 'reaction', 'gameplay', 'how to', 'bts', 'behind the scenes', 
            'teaser', 'trailer', 'audiobook', 'karaoke', 'prank', 'funny', 'compilation'
        ];
        
        const freshRecs = candidatePool.filter(v => {
            // STRICT TIME BOUNDS: Must be between 2 minutes (120s) and 7 minutes (420s). Kills shorts & albums.
            const isMusicLength = v.lengthSeconds && v.lengthSeconds >= 120 && v.lengthSeconds <= 420; 
            const notPlayedThisSession = !window.OCTAVE.sessionHistory.includes(v.videoId);
            const notPenalized = window.calculateTrackScore({ videoId: v.videoId }) >= -5; 
            
            const titleLower = (v.title || '').toLowerCase();
            const authorLower = (v.author || '').toLowerCase();
            const noBadWords = !badWords.some(bw => titleLower.includes(bw) || authorLower.includes(bw));

            const notInQueue = !window.OCTAVE.queue.some(q => q.videoId === v.videoId);

            return isMusicLength && notPlayedThisSession && notPenalized && noBadWords && notInQueue;
        });

        // Deduplicate and Randomize
        const uniqueRecs = Array.from(new Map(freshRecs.map(t =>[t.videoId, t])).values());
        uniqueRecs.sort(() => 0.5 - Math.random());
        
        const next5 = uniqueRecs.slice(0, 5).map(pick => ({
            videoId: pick.videoId, 
            title: pick.title, 
            author: pick.author,
            thumb: pick.videoId ? `https://i.ytimg.com/vi/${pick.videoId}/hqdefault.jpg` : pick.thumb
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

// Queue Interceptor
setTimeout(() => {
    if (window.playTrackByIndex) {
        const originalPlayTrackByIndex = window.playTrackByIndex;
        window.playTrackByIndex = (index) => {
            originalPlayTrackByIndex(index);
            if (window.OCTAVE.queue.length - index <= 2) {
                setTimeout(() => {
                    window.fetchAutoDjBatch();
                }, 2000);
            }
        };
    }
}, 500); 

window.playNextLogic = async () => {
    if (window.OCTAVE.isTransitioning) return;
    
    if (window.OCTAVE.currentIndex >= window.OCTAVE.queue.length - 1) {
        const fpPlay = document.querySelector('#fp-play i');
        if (fpPlay) fpPlay.className = 'fa-solid fa-spinner fa-spin'; 
        await window.fetchAutoDjBatch();
    }

    if (window.OCTAVE.currentIndex < window.OCTAVE.queue.length - 1) {
        window.OCTAVE.isNextTrackManual = false; 
        window.playTrackByIndex(window.OCTAVE.currentIndex + 1);
    } else {
        window.OCTAVE.isPlaying = false;
        const fpPlay = document.querySelector('#fp-play i');
        if (fpPlay) fpPlay.className = 'fa-solid fa-play';
    }
};
window.playNext = window.playNextLogic; 

window.generateDiscoverMix = async () => {
    const allKnown =[...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || [])];
    if (allKnown.length === 0) {
        alert("Play or like some songs first to build your taste profile!");
        return;
    }

    const dynamicView = document.getElementById('dynamic-view');
    
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

    const backupQueue = [...window.OCTAVE.queue];
    const backupIndex = window.OCTAVE.currentIndex;

    window.OCTAVE.queue =[];
    window.OCTAVE.currentIndex = -1;
    
    await window.fetchAutoDjBatch(); 

    if (window.OCTAVE.queue.length > 0) {
        window.OCTAVE.isNextTrackManual = true; 
        window.playTrackByIndex(0);
        const homeTab = document.querySelector('.nav-item[data-tab="home"]');
        if (homeTab) homeTab.click();
    } else {
        window.OCTAVE.queue = backupQueue;
        window.OCTAVE.currentIndex = backupIndex;
        alert("Algorithm failed to connect to network. Try again.");
        const homeTab = document.querySelector('.nav-item[data-tab="home"]');
        if (homeTab) homeTab.click(); 
    }
};

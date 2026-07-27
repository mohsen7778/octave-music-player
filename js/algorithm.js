// ========================================
// FILE: js/algorithm.js
// ========================================

// ============================================================
// algorithm.js — Octave 10/10 AI Recommendation & Scoring Engine
// Phase 4: Lifetime Taste Vector + Adaptive Weight Learning + Tournament
// ============================================================

if (!window.escapeHTML) {
    window.escapeHTML = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
}

// Invidious backup instances array
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

// Initialize state structures inside OCTAVE context
if (window.OCTAVE) {
    if (!window.OCTAVE.artistStats) window.OCTAVE.artistStats = {};
    
    // Lifetime Taste Profile
    if (!window.OCTAVE.tasteProfile) {
        window.OCTAVE.tasteProfile = {
            energy: 0.5, valence: 0.5, danceability: 0.5,
            tempo: 120, acousticness: 0.5, instrumentalness: 0.0,
            totalCompleted: 0
        };
    }
    
    // Session Vector (EMA)
    if (!window.OCTAVE.sessionVector) {
        window.OCTAVE.sessionVector = null;
    }

    // Phase 4: Dynamic Adaptive Feature Weights
    if (!window.OCTAVE.userWeights) {
        window.OCTAVE.userWeights = {
            energy: 0.30,
            valence: 0.30,
            danceability: 0.20,
            tempo: 0.20
        };
    }
}

// ============================================================
// 1. ADAPTIVE WEIGHT LEARNING & TASTE VECTOR ENGINE
// ============================================================

window.updateAdaptiveWeights = (audioFeatures, isSkip) => {
    if (!audioFeatures || !window.OCTAVE || !window.OCTAVE.userWeights) return;
    const w = window.OCTAVE.userWeights;
    const lr = 0.02; // Learning rate for weight tuning

    // If user skips a track with extreme traits, adjust weights to avoid similar profile
    if (isSkip) {
        if ((audioFeatures.energy || 0.5) > 0.7) w.energy = Math.max(0.1, w.energy - lr);
        if ((audioFeatures.tempo || 120) > 130) w.tempo = Math.max(0.1, w.tempo - lr);
    } else {
        // Successful completion reinforces feature sensitivity
        w.energy = Math.min(0.45, w.energy + (lr * 0.5));
        w.valence = Math.min(0.45, w.valence + (lr * 0.5));
    }

    if (typeof window.saveCache === 'function') window.saveCache();
};

window.updateSessionVector = (audioFeatures) => {
    if (!audioFeatures || !window.OCTAVE) return;

    const alpha = 0.35; // Smoothing factor (35% weight to newest track)

    if (!window.OCTAVE.sessionVector) {
        window.OCTAVE.sessionVector = {
            energy: audioFeatures.energy || 0.5,
            valence: audioFeatures.valence || 0.5,
            danceability: audioFeatures.danceability || 0.5,
            tempo: audioFeatures.tempo || 120,
            acousticness: audioFeatures.acousticness || 0.5,
            instrumentalness: audioFeatures.instrumentalness || 0.0
        };
    } else {
        const sv = window.OCTAVE.sessionVector;
        sv.energy = (alpha * (audioFeatures.energy || 0.5)) + ((1 - alpha) * sv.energy);
        sv.valence = (alpha * (audioFeatures.valence || 0.5)) + ((1 - alpha) * sv.valence);
        sv.danceability = (alpha * (audioFeatures.danceability || 0.5)) + ((1 - alpha) * sv.danceability);
        sv.tempo = (alpha * (audioFeatures.tempo || 120)) + ((1 - alpha) * sv.tempo);
        sv.acousticness = (alpha * (audioFeatures.acousticness || 0.5)) + ((1 - alpha) * sv.acousticness);
        sv.instrumentalness = (alpha * (audioFeatures.instrumentalness || 0.0)) + ((1 - alpha) * sv.instrumentalness);
    }
};

window.updateArtistStats = (artistName, action) => {
    if (!artistName || !window.OCTAVE) return;
    const cleanArtist = artistName.replace(/ - Topic$/i, '').trim();

    if (!window.OCTAVE.artistStats[cleanArtist]) {
        window.OCTAVE.artistStats[cleanArtist] = { plays: 0, likes: 0, skips: 0, completes: 0 };
    }

    const stats = window.OCTAVE.artistStats[cleanArtist];
    if (action === 'play') stats.plays++;
    if (action === 'like') stats.likes++;
    if (action === 'skip') stats.skips++;
    if (action === 'complete') stats.completes++;

    if (typeof window.saveCache === 'function') window.saveCache();
};

window.updateTasteProfile = (audioFeatures) => {
    if (!audioFeatures || !window.OCTAVE || !window.OCTAVE.tasteProfile) return;

    // 1. Update Active Session Vector
    window.updateSessionVector(audioFeatures);

    // 2. Tune Adaptive Weights (Positive Completion)
    window.updateAdaptiveWeights(audioFeatures, false);

    // 3. Update Lifetime Taste Profile (Moving Average)
    const tp = window.OCTAVE.tasteProfile;
    const n = tp.totalCompleted || 0;

    tp.energy = ((tp.energy * n) + (audioFeatures.energy || 0.5)) / (n + 1);
    tp.valence = ((tp.valence * n) + (audioFeatures.valence || 0.5)) / (n + 1);
    tp.danceability = ((tp.danceability * n) + (audioFeatures.danceability || 0.5)) / (n + 1);
    tp.tempo = ((tp.tempo * n) + (audioFeatures.tempo || 120)) / (n + 1);
    tp.acousticness = ((tp.acousticness * n) + (audioFeatures.acousticness || 0.5)) / (n + 1);
    tp.instrumentalness = ((tp.instrumentalness * n) + (audioFeatures.instrumentalness || 0.0)) / (n + 1);
    tp.totalCompleted = n + 1;

    if (typeof window.saveCache === 'function') window.saveCache();
};

// ============================================================
// 2. VECTOR DISTANCE & ADAPTIVE WEIGHTING
// ============================================================

function computeAudioDistance(featA, featB) {
    if (!featA || !featB) return 0.5;

    const w = (window.OCTAVE && window.OCTAVE.userWeights) 
        ? window.OCTAVE.userWeights 
        : { energy: 0.30, valence: 0.30, danceability: 0.20, tempo: 0.20 };

    const dEnergy = Math.abs((featA.energy || 0.5) - (featB.energy || 0.5));
    const dValence = Math.abs((featA.valence || 0.5) - (featB.valence || 0.5));
    const dDance = Math.abs((featA.danceability || 0.5) - (featB.danceability || 0.5));
    const dTempo = Math.min(1, Math.abs((featA.tempo || 120) - (featB.tempo || 120)) / 60);

    // Apply Dynamic Weights
    const weightedDistance = (dEnergy * w.energy) + (dValence * w.valence) + (dDance * w.danceability) + (dTempo * w.tempo);
    return Math.max(0, 1 - weightedDistance); // 0 (dissimilar) to 1 (identical)
}

function computeBlendedTargetVector() {
    const octave = window.OCTAVE || {};
    const sv = octave.sessionVector;
    const tp = octave.tasteProfile;

    if (!sv) return tp; // Fallback to lifetime if session is new

    // Phase 4 Blend: 70% Active Session + 30% Lifetime Profile
    return {
        energy: (0.70 * sv.energy) + (0.30 * tp.energy),
        valence: (0.70 * sv.valence) + (0.30 * tp.valence),
        danceability: (0.70 * sv.danceability) + (0.30 * tp.danceability),
        tempo: (0.70 * sv.tempo) + (0.30 * tp.tempo),
        acousticness: (0.70 * sv.acousticness) + (0.30 * tp.acousticness),
        instrumentalness: (0.70 * sv.instrumentalness) + (0.30 * tp.instrumentalness)
    };
}

function evaluateNonMusicConfidence(title, author, durationMs) {
    const badWords = [
        'tutorial', 'vlog', 'news', 'podcast', 'interview', 'review', 'unboxing',
        'live', 'type beat', 'full album', 'documentary', 'short', 'shorts',
        'tiktok', 'meme', 'reaction', 'gameplay', 'how to', 'bts', 'behind the scenes',
        'teaser', 'trailer', 'audiobook', 'karaoke', 'prank', 'funny', 'compilation'
    ];

    const text = `${title} ${author}`.toLowerCase();
    let confidenceScore = 100;

    badWords.forEach(word => {
        if (text.includes(word)) confidenceScore -= 40;
    });

    if (durationMs > 0) {
        const sec = durationMs / 1000;
        if (sec < 100 || sec > 480) confidenceScore -= 50;
    }

    return confidenceScore;
}

// ============================================================
// 3. CANDIDATE TOURNAMENT (Blended Target + Adaptive Weights)
// ============================================================

async function runCandidateTournament(candidates, currentTrack, currentAudioFeatures) {
    if (!candidates || candidates.length === 0) return [];

    const octave = window.OCTAVE || {};
    const playStats = octave.playStats || {};
    const artistStats = octave.artistStats || {};
    const liked = octave.liked || {};
    const recentPlayed = octave.recentPlayed || [];
    const sessionHistory = octave.sessionHistory || [];
    const queue = octave.queue || [];

    const targetVector = computeBlendedTargetVector();

    const hour = new Date().getHours();
    const currentTod = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'night';

    // Batch resolve audio features via identity layer
    const candidateRbIds = candidates.map(c => c.rbId).filter(Boolean);
    const candidateFeaturesMap = window.resolveAudioFeaturesBatch
        ? await window.resolveAudioFeaturesBatch(candidateRbIds)
        : {};

    const scoredCandidates = [];

    for (const cand of candidates) {
        // Quality Confidence Check
        const confidence = evaluateNonMusicConfidence(cand.title, cand.author, cand.durationMs);
        if (confidence < 50) continue;

        let score = 0;
        const candFeat = candidateFeaturesMap[cand.rbId];

        // 1. Blended Target Similarity (+35 max)
        if (candFeat && targetVector) {
            const targetSim = computeAudioDistance(targetVector, candFeat);
            score += (targetSim * 35);
        } else if (candFeat && currentAudioFeatures) {
            const trackSim = computeAudioDistance(currentAudioFeatures, candFeat);
            score += (trackSim * 25);
        }

        // 2. Canonical Identity Matching
        const isLiked = Object.values(liked).some(l => (l.rbId && l.rbId === cand.rbId) || l.title === cand.title);
        if (isLiked) score += 25;

        // 3. User History & Time-of-Day Match
        const matchedStatKey = Object.keys(playStats).find(k => (playStats[k] && playStats[k].rbId === cand.rbId) || playStats[k].title === cand.title);
        if (matchedStatKey) {
            const st = playStats[matchedStatKey];
            score += Math.min(15, (st.completes || 0) * 4);
            score -= Math.min(30, (st.skips || 0) * 10);
            if (st.lastPlayedTimeOfDay === currentTod) score += 5;
        }

        // 4. Artist Affinity & Fatigue
        const cleanArtist = (cand.author || '').replace(/ - Topic$/i, '').trim();
        if (artistStats[cleanArtist]) {
            const aSt = artistStats[cleanArtist];
            score += Math.min(15, (aSt.completes || 0) * 3);
            score -= Math.min(20, (aSt.skips || 0) * 5);
        }

        // Artist Fatigue Penalty
        const recentArtistCount = queue.slice(-3).filter(q => q.author && q.author.includes(cleanArtist)).length;
        if (recentArtistCount > 0) score -= (recentArtistCount * 15);

        // 5. Memory Decay (Recency Penalty)
        const recentIdx = recentPlayed.findIndex(r => (r.rbId && r.rbId === cand.rbId) || r.title === cand.title);
        if (recentIdx === 0) score -= 40;
        else if (recentIdx > 0 && recentIdx < 5) score -= 20;
        else if (recentIdx >= 5 && recentIdx < 15) score -= 10;

        // 6. Session Exclusion
        if (sessionHistory.some(sId => (playStats[sId] && playStats[sId].rbId === cand.rbId) || (playStats[sId] && playStats[sId].title === cand.title))) {
            continue;
        }

        // 7. Popularity Weight (±5)
        if (cand.popularity) {
            score += ((cand.popularity - 50) / 10);
        }

        scoredCandidates.push({ candidate: cand, score });
    }

    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates.slice(0, 10).map(sc => sc.candidate);
}

// ============================================================
// 4. MAIN AUTO-DJ ENGINE WITH IDENTITY LAYER
// ============================================================

window.isFetchingBatch = false;

window.fetchAutoDjBatch = async () => {
    if (window.isFetchingBatch) return;
    window.isFetchingBatch = true;

    try {
        const octave = window.OCTAVE || {};
        const liked = octave.liked || {};
        const recentPlayed = octave.recentPlayed || [];
        const queue = octave.queue || [];
        const currentIndex = octave.currentIndex;

        const currentTrack = currentIndex >= 0 ? queue[currentIndex] : (recentPlayed[0] || null);

        // Step A: Build Multi-Seed Set
        const seedSet = [];
        if (currentTrack) seedSet.push(currentTrack);

        const likedList = Object.values(liked);
        if (likedList.length > 0) seedSet.push(likedList[Math.floor(Math.random() * likedList.length)]);
        if (recentPlayed.length > 0) seedSet.push(recentPlayed[0]);

        // Resolve rbIds for seeds using identity layer
        const seedRbIds = [];
        for (const seed of seedSet) {
            if (window.resolveTrackToRbId) {
                const rbId = await window.resolveTrackToRbId(seed);
                if (rbId) seedRbIds.push(rbId);
            }
        }

        // Step B: Resolve Current Track Audio Features
        let currentAudioFeatures = null;
        if (currentTrack && currentTrack.rbId) {
            const featMap = window.resolveAudioFeaturesBatch
                ? await window.resolveAudioFeaturesBatch([currentTrack.rbId])
                : {};
            currentAudioFeatures = featMap[currentTrack.rbId] || null;
        }

        let candidates = [];
        let reccoBeatsSuccess = false;

        // Step C: PRIMARY — ReccoBeats Identity Recommendation Fetch
        if (seedRbIds.length > 0 && window.resolveReccoCandidates) {
            try {
                console.log("Octave Alg Engine: Resolving recommendations via ReccoBeats...");
                candidates = await window.resolveReccoCandidates(seedRbIds);
                if (candidates.length >= 5) reccoBeatsSuccess = true;
            } catch (e) {
                console.warn("Octave Alg Engine: ReccoBeats primary failed. Falling back.", e);
            }
        }

        // Step D: SECONDARY BACKUP — Legacy Invidious Fetcher
        if (!reccoBeatsSuccess || candidates.length < 5) {
            console.log("Octave Alg Engine: Running Backup Candidate Pool...");
            for (const seed of seedSet) {
                if (!seed.videoId) continue;
                for (let i = 0; i < window.INVIDIOUS.length; i++) {
                    const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
                    const rawUrl = `${base}/api/v1/videos/${seed.videoId}?fields=recommendedVideos`;
                    const urlsToTry = [rawUrl, `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`];

                    let fetched = false;
                    for (const fetchUrl of urlsToTry) {
                        try {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), 5000);
                            const r = await fetch(fetchUrl, { signal: controller.signal });
                            clearTimeout(id);
                            if (r.ok) {
                                const d = await r.json();
                                if (d.recommendedVideos && d.recommendedVideos.length > 0) {
                                    d.recommendedVideos.forEach(v => {
                                        candidates.push({
                                            videoId: v.videoId,
                                            title: v.title,
                                            author: v.author,
                                            durationMs: (v.lengthSeconds || 0) * 1000
                                        });
                                    });
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

        // Step E: CANDIDATE TOURNAMENT
        const rankedCandidates = await runCandidateTournament(candidates, currentTrack, currentAudioFeatures);

        // Step F: Resolve Winners to Playable YouTube Streams
        const resolvedWinners = [];
        for (const winner of rankedCandidates.slice(0, 6)) {
            if (winner.videoId) {
                resolvedWinners.push(winner);
            } else {
                try {
                    const searchResults = await window.performSearch(`${winner.title} ${winner.author || ''}`);
                    if (searchResults && searchResults.length > 0) {
                        const winnerTrack = searchResults[0];
                        winnerTrack.rbId = winner.rbId;
                        resolvedWinners.push(winnerTrack);
                    }
                } catch (e) {}
            }
            if (resolvedWinners.length >= 5) break;
        }

        // Step G: Append Winners to Queue
        if (resolvedWinners.length > 0 && window.OCTAVE && Array.isArray(window.OCTAVE.queue)) {
            const filteredWinners = resolvedWinners.filter(w => !window.OCTAVE.queue.some(q => q.videoId === w.videoId));
            window.OCTAVE.queue.push(...filteredWinners.map(w => ({
                videoId: w.videoId,
                rbId: w.rbId || null,
                title: w.title,
                author: w.author,
                thumb: w.videoId ? `https://i.ytimg.com/vi/${w.videoId}/hqdefault.jpg` : (w.thumb || '')
            })));
            if (typeof window.saveCache === 'function') window.saveCache();
            console.log(`Octave Alg Engine: Queued ${filteredWinners.length} target-blended tracks.`);
        }

    } catch (e) {
        console.warn("Octave Alg Engine: Auto-DJ batch execution error.", e);
    } finally {
        window.isFetchingBatch = false;
    }
};

// Queue listener: Auto-triggers next batch when nearing end of queue
setTimeout(() => {
    if (window.playTrackByIndex) {
        const originalPlayTrackByIndex = window.playTrackByIndex;
        window.playTrackByIndex = (index) => {
            originalPlayTrackByIndex(index);
            if (window.OCTAVE && window.OCTAVE.queue && (window.OCTAVE.queue.length - index <= 2)) {
                setTimeout(() => {
                    window.fetchAutoDjBatch();
                }, 1500);
            }
        };
    }
}, 500);

// --- DISCOVER MIX GENERATOR ---
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
                <p style="color:var(--text-secondary);font-size:14px;margin-top:10px;">Running Candidate Tournament via Adaptive Weight Matrix.</p>
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

// --- DAILY RECOMMENDATIONS ---
window.fetchDailyRecommendations = async () => {
    if (!window.OCTAVE) return;
    const now = Date.now();
    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

    if (window.OCTAVE.dailyRecs && window.OCTAVE.dailyRecs.tracks && window.OCTAVE.dailyRecs.tracks.length > 0) {
        const usesBadThumbs = window.OCTAVE.dailyRecs.tracks.some(t => t.thumb && !t.thumb.includes('ytimg.com'));
        if (!usesBadThumbs && (now - window.OCTAVE.dailyRecs.timestamp < FIVE_DAYS)) return;
    }

    const allKnown = [...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || [])];
    let candidateList = [];

    if (allKnown.length > 0 && window.resolveReccoCandidates) {
        const seed = allKnown[Math.floor(Math.random() * allKnown.length)];
        const rbId = seed.rbId || (window.resolveTrackToRbId ? await window.resolveTrackToRbId(seed) : null);
        if (rbId) candidateList = await window.resolveReccoCandidates([rbId]);
    }

    const ranked = await runCandidateTournament(candidateList, null, null);
    const resolvedRecs = [];

    for (const item of ranked.slice(0, 10)) {
        try {
            const res = await window.performSearch(`${item.title} ${item.author || ''}`);
            if (res && res.length > 0) resolvedRecs.push(res[0]);
        } catch (e) {}
    }

    if (resolvedRecs.length > 0) {
        window.OCTAVE.dailyRecs = {
            timestamp: now,
            tracks: resolvedRecs.map(rec => ({
                videoId: rec.videoId,
                title: rec.title,
                author: rec.author,
                thumb: rec.videoId ? `https://i.ytimg.com/vi/${rec.videoId}/hqdefault.jpg` : (rec.thumb || '')
            }))
        };
        if (typeof window.saveCache === 'function') window.saveCache();
        const activeTab = document.querySelector('.nav-item.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'home' && typeof window.renderHome === 'function') {
            window.renderHome();
        }
    }
};

// --- TRENDING MUSIC CHARTS ---
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
    } catch (e) {
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
            const countA = (window.OCTAVE.playStats && window.OCTAVE.playStats[a.videoId]) ? window.OCTAVE.playStats[a.videoId].plays : 0;
            const countB = (window.OCTAVE.playStats && window.OCTAVE.playStats[b.videoId]) ? window.OCTAVE.playStats[b.videoId].plays : 0;
            if (countB !== countA) return countB - countA;
            return 0.5 - Math.random();
        });
        window.OCTAVE.queue = sorted;
        window.OCTAVE.isNextTrackManual = true;
        if (typeof window.playTrackByIndex === 'function') window.playTrackByIndex(0);
    }
};

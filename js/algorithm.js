// ========================================
// FILE: js/algorithm.js
// ========================================

// ============================================================
// algorithm.js — Octave 10/10 AI Recommendation Engine
// FIXED: Strictly Prevents Replaying Recent Tracks & Next Queue Batching
// ============================================================

if (!window.escapeHTML) {
    window.escapeHTML = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
}

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

if (window.OCTAVE) {
    if (!window.OCTAVE.artistStats) window.OCTAVE.artistStats = {};
    if (!window.OCTAVE.tasteProfile) {
        window.OCTAVE.tasteProfile = {
            energy: 0.5, valence: 0.5, danceability: 0.5,
            tempo: 120, acousticness: 0.5, instrumentalness: 0.0,
            totalCompleted: 0
        };
    }
    if (!window.OCTAVE.sessionVector) window.OCTAVE.sessionVector = null;
    if (!window.OCTAVE.userWeights) {
        window.OCTAVE.userWeights = { energy: 0.30, valence: 0.30, danceability: 0.20, tempo: 0.20 };
    }
}

// --- HARMONIC KEY & DJ TRANSITION FLOW ---
function computeHarmonicCompatibility(keyA, modeA, keyB, modeB) {
    if (keyA === undefined || keyB === undefined || keyA < 0 || keyB < 0) return 0;
    const posA = (keyA * 7) % 12;
    const posB = (keyB * 7) % 12;
    const circleDist = Math.min(Math.abs(posA - posB), 12 - Math.abs(posA - posB));

    if (keyA === keyB && modeA === modeB) return 15;
    if (keyA === keyB && modeA !== modeB) return 10;
    if (circleDist === 1 && modeA === modeB) return 8;
    if (circleDist >= 4) return -10;
    return 0;
}

function computeTransitionFlowScore(currentFeat, candFeat) {
    if (!currentFeat || !candFeat) return 0;
    let flowScore = 0;

    const tempoDelta = Math.abs((currentFeat.tempo || 120) - (candFeat.tempo || 120));
    if (tempoDelta <= 10) flowScore += 10;
    else if (tempoDelta > 35) flowScore -= 15;

    const energyDelta = Math.abs((currentFeat.energy || 0.5) - (candFeat.energy || 0.5));
    if (energyDelta <= 0.15) flowScore += 10;
    else if (energyDelta >= 0.45) flowScore -= 20;

    flowScore += computeHarmonicCompatibility(currentFeat.key, currentFeat.mode, candFeat.key, candFeat.mode);
    return flowScore;
}

// --- TASTE & SESSION UPDATES ---
window.updateAdaptiveWeights = (audioFeatures, isSkip) => {
    if (!audioFeatures || !window.OCTAVE || !window.OCTAVE.userWeights) return;
    const w = window.OCTAVE.userWeights;
    const lr = 0.02;

    if (isSkip) {
        if ((audioFeatures.energy || 0.5) > 0.7) w.energy = Math.max(0.1, w.energy - lr);
        if ((audioFeatures.tempo || 120) > 130) w.tempo = Math.max(0.1, w.tempo - lr);
    } else {
        w.energy = Math.min(0.45, w.energy + (lr * 0.5));
        w.valence = Math.min(0.45, w.valence + (lr * 0.5));
    }
    if (typeof window.saveCache === 'function') window.saveCache();
};

window.updateSessionVector = (audioFeatures) => {
    if (!audioFeatures || !window.OCTAVE) return;
    const alpha = 0.35;

    if (!window.OCTAVE.sessionVector) {
        window.OCTAVE.sessionVector = { ...audioFeatures };
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

window.updateTasteProfile = (audioFeatures, artistName) => {
    if (!audioFeatures || !window.OCTAVE || !window.OCTAVE.tasteProfile) return;

    window.updateSessionVector(audioFeatures);
    window.updateAdaptiveWeights(audioFeatures, false);

    if (window.reinforceTasteGraph && artistName) {
        window.reinforceTasteGraph(artistName, audioFeatures, 1.0);
    }

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

// --- CANDIDATE TOURNAMENT ---
function computeAudioDistance(featA, featB) {
    if (!featA || !featB) return 0.5;
    const w = (window.OCTAVE && window.OCTAVE.userWeights) ? window.OCTAVE.userWeights : { energy: 0.30, valence: 0.30, danceability: 0.20, tempo: 0.20 };

    const dEnergy = Math.abs((featA.energy || 0.5) - (featB.energy || 0.5));
    const dValence = Math.abs((featA.valence || 0.5) - (featB.valence || 0.5));
    const dDance = Math.abs((featA.danceability || 0.5) - (featB.danceability || 0.5));
    const dTempo = Math.min(1, Math.abs((featA.tempo || 120) - (featB.tempo || 120)) / 60);

    return Math.max(0, 1 - ((dEnergy * w.energy) + (dValence * w.valence) + (dDance * w.danceability) + (dTempo * w.tempo)));
}

function computeBlendedTargetVector() {
    const octave = window.OCTAVE || {};
    const sv = octave.sessionVector;
    const tp = octave.tasteProfile;

    if (!sv) return tp;
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
    const badWords = ['tutorial', 'vlog', 'news', 'podcast', 'interview', 'review', 'unboxing', 'live', 'type beat', 'full album', 'documentary', 'short', 'shorts', 'tiktok', 'meme', 'reaction', 'gameplay', 'how to', 'bts', 'behind the scenes', 'teaser', 'trailer', 'audiobook', 'karaoke', 'prank', 'funny', 'compilation'];
    const text = `${title} ${author}`.toLowerCase();
    let confidenceScore = 100;

    badWords.forEach(word => { if (text.includes(word)) confidenceScore -= 40; });
    if (durationMs > 0 && (durationMs / 1000 < 100 || durationMs / 1000 > 480)) confidenceScore -= 50;
    return confidenceScore;
}

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
    const candidateRbIds = candidates.map(c => c.rbId).filter(Boolean);
    const candidateFeaturesMap = window.resolveAudioFeaturesBatch ? await window.resolveAudioFeaturesBatch(candidateRbIds) : {};

    const scoredCandidates = [];

    for (const cand of candidates) {
        if (evaluateNonMusicConfidence(cand.title, cand.author, cand.durationMs) < 50) continue;

        let score = 0;
        const candFeat = candidateFeaturesMap[cand.rbId];

        // 1. Vector Similarity (+35 max)
        if (candFeat && targetVector) {
            score += (computeAudioDistance(targetVector, candFeat) * 35);
        }

        // 2. DJ Flow Transition (+25 max)
        if (candFeat && currentAudioFeatures) {
            score += computeTransitionFlowScore(currentAudioFeatures, candFeat);
        }

        // 3. TASTE GRAPH NODE AFFINITY (+20 max)
        if (candFeat && window.evaluateGraphAffinity) {
            score += window.evaluateGraphAffinity(cand.author, candFeat);
        }

        // 4. Like & Play Stats
        if (Object.values(liked).some(l => (l.rbId && l.rbId === cand.rbId) || (l.videoId && l.videoId === cand.videoId) || l.title === cand.title)) score += 25;

        const statEntry = (cand.videoId && playStats[cand.videoId]) || Object.values(playStats).find(st => st.title === cand.title);
        if (statEntry) {
            score += Math.min(15, (statEntry.completes || 0) * 4);
            score -= Math.min(30, (statEntry.skips || 0) * 10);
        }

        const cleanArtist = (cand.author || '').replace(/ - Topic$/i, '').trim();
        if (artistStats[cleanArtist]) {
            score += Math.min(15, (artistStats[cleanArtist].completes || 0) * 3);
            score -= Math.min(20, (artistStats[cleanArtist].skips || 0) * 5);
        }

        // Artist Fatigue
        const recentArtistCount = queue.slice(-3).filter(q => q.author && q.author.includes(cleanArtist)).length;
        if (recentArtistCount > 0) score -= (recentArtistCount * 15);

        // Heavy Penalty for Recently Played Tracks
        const cleanTitleLower = cand.title.toLowerCase().trim();
        const recentIdx = recentPlayed.findIndex(r => 
            (r.videoId && r.videoId === cand.videoId) || 
            (r.rbId && r.rbId === cand.rbId) || 
            (r.title && r.title.toLowerCase().trim() === cleanTitleLower)
        );
        if (recentIdx === 0) score -= 100;
        else if (recentIdx > 0 && recentIdx < 10) score -= 60;

        // SESSION DUP EXCLUSION: Strictly block tracks in active session or queue
        const inSessionHistory = sessionHistory.some(sId => sId === cand.videoId || (playStats[sId] && playStats[sId].title === cand.title));
        const inActiveQueue = queue.some(q => q.videoId === cand.videoId || (q.title && q.title.toLowerCase().trim() === cleanTitleLower));
        if (inSessionHistory || inActiveQueue) continue;

        if (score >= -10) {
            scoredCandidates.push({ candidate: cand, score, isUnplayedArtist: !artistStats[cleanArtist] });
        }
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    const safeWinners = scoredCandidates.slice(0, 4).map(sc => sc.candidate);
    const explorationCand = scoredCandidates.slice(4).find(sc => sc.isUnplayedArtist && sc.score >= 5);

    if (explorationCand) safeWinners.push(explorationCand.candidate);
    else if (scoredCandidates[4]) safeWinners.push(scoredCandidates[4].candidate);

    return safeWinners;
}

// --- MAIN AUTO-DJ ---
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

        const seedSet = [];
        if (currentTrack) seedSet.push(currentTrack);
        const likedList = Object.values(liked);
        if (likedList.length > 0) seedSet.push(likedList[Math.floor(Math.random() * likedList.length)]);

        const seedRbIds = [];
        for (const seed of seedSet) {
            if (window.resolveTrackToRbId) {
                const rbId = await window.resolveTrackToRbId(seed);
                if (rbId) seedRbIds.push(rbId);
            }
        }

        let currentAudioFeatures = null;
        if (currentTrack && currentTrack.rbId) {
            const featMap = window.resolveAudioFeaturesBatch ? await window.resolveAudioFeaturesBatch([currentTrack.rbId]) : {};
            currentAudioFeatures = featMap[currentTrack.rbId] || null;
        }

        let candidates = [];
        if (seedRbIds.length > 0 && window.resolveReccoCandidates) {
            candidates = await window.resolveReccoCandidates(seedRbIds);
        }

        // Secondary Fallback if ReccoBeats fails
        if (candidates.length < 5) {
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
                            const id = setTimeout(() => controller.abort(), 4000);
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

        const rankedCandidates = await runCandidateTournament(candidates, currentTrack, currentAudioFeatures);
        const resolvedWinners = [];

        for (const winner of rankedCandidates) {
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

        if (resolvedWinners.length > 0 && window.OCTAVE && Array.isArray(window.OCTAVE.queue)) {
            const filteredWinners = resolvedWinners.filter(w => !window.OCTAVE.queue.some(q => q.videoId === w.videoId || (q.title && q.title.toLowerCase().trim() === w.title.toLowerCase().trim())));
            window.OCTAVE.queue.push(...filteredWinners.map(w => ({
                videoId: w.videoId,
                rbId: w.rbId || null,
                title: w.title,
                author: w.author,
                thumb: w.videoId ? `https://i.ytimg.com/vi/${w.videoId}/hqdefault.jpg` : (w.thumb || '')
            })));
            if (typeof window.saveCache === 'function') window.saveCache();
        }

    } catch (e) {
        console.warn("Octave Alg Engine Error", e);
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
                setTimeout(() => window.fetchAutoDjBatch(), 1500);
            }
        };
    }
}, 500);

window.generateDiscoverMix = async () => {
    if (window.OCTAVE) {
        window.OCTAVE.queue = [];
        window.OCTAVE.currentIndex = -1;
    }
    await window.fetchAutoDjBatch();
    if (window.OCTAVE && window.OCTAVE.queue && window.OCTAVE.queue.length > 0) {
        window.playTrackByIndex(0);
    }
};

// --- DAILY RECOMMENDATIONS WITH FRESH-USER FALLBACK ---
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

    if (candidateList.length === 0) {
        for (let i = 0; i < window.INVIDIOUS.length; i++) {
            const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
            const rawUrl = `${base}/api/v1/popular?videoCategory=10`;
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
                        if (Array.isArray(d) && d.length > 0) {
                            candidateList = d.map(v => ({
                                videoId: v.videoId,
                                title: v.title,
                                author: v.author,
                                durationMs: (v.lengthSeconds || 0) * 1000
                            }));
                            fetched = true;
                            break;
                        }
                    }
                } catch (e) { continue; }
            }
            if (fetched) break;
        }
    }

    const ranked = await runCandidateTournament(candidateList, null, null);
    const resolvedRecs = [];

    for (const item of ranked.slice(0, 10)) {
        if (item.videoId) {
            resolvedRecs.push(item);
        } else {
            try {
                const res = await window.performSearch(`${item.title} ${item.author || ''}`);
                if (res && res.length > 0) resolvedRecs.push(res[0]);
            } catch (e) {}
        }
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
        const r = await fetch(`https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json?_t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) {
            const d = await r.json();
            if (d.feed && d.feed.results && d.feed.results.length > 0) {
                const newTracks = d.feed.results.map(item => ({
                    videoId: null,
                    title: item.name,
                    author: item.artistName,
                    thumb: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : ''
                }));

                if (newTracks.length > 0 && window.OCTAVE) {
                    window.OCTAVE.trendingData = {
                        timestamp: now,
                        tracks: newTracks
                    };
                    if (typeof window.saveCache === 'function') window.saveCache();
                    if (typeof window.renderTrendingTracks === 'function') {
                        window.renderTrendingTracks(newTracks, trendingGrid);
                    }
                    return;
                }
            }
        }
    } catch(e) {}

    try {
        for (let i = 0; i < window.INVIDIOUS.length; i++) {
            const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
            const rawUrl = `${base}/api/v1/popular?videoCategory=10`;
            const urlsToTry = [rawUrl, `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`];

            let success = false;
            for (const fetchUrl of urlsToTry) {
                try {
                    const controller = new AbortController();
                    const id = setTimeout(() => controller.abort(), 5000);
                    const r = await fetch(fetchUrl, { signal: controller.signal });
                    clearTimeout(id);
                    if (r.ok) {
                        const d = await r.json();
                        if (Array.isArray(d) && d.length > 0) {
                            const newTracks = d.map(v => ({
                                videoId: v.videoId,
                                title: v.title,
                                author: v.author,
                                thumb: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
                            }));
                            window.OCTAVE.trendingData = { timestamp: now, tracks: newTracks };
                            if (typeof window.saveCache === 'function') window.saveCache();
                            if (typeof window.renderTrendingTracks === 'function') {
                                window.renderTrendingTracks(newTracks, trendingGrid);
                            }
                            success = true;
                            break;
                        }
                    }
                } catch (e) { continue; }
            }
            if (success) return;
        }
    } catch(e) {}

    trendingGrid.innerHTML = '<div class="empty-state-text">Failed to load charts.</div>';
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

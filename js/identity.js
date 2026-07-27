// ========================================
// FILE: js/identity.js
// ========================================

// ============================================================
// identity.js — Octave Canonical Identity & Persistent Cache Engine
// FIXED: Indirect Artist-First Track Resolution & Defensive Parsing
// ============================================================

window.OCTAVE_IDENTITY = {
    videoToRb: new Map(),     // videoId -> rbId
    rbToTrack: new Map(),     // rbId -> canonical track metadata
    rbFeatures: new Map(),    // rbId -> audioFeatures
    rbRecs: new Map(),        // rbId -> candidate rbIds array
    queryToRb: new Map(),     // search query -> rbId
    
    STORAGE_KEY: 'octave_identity_vault_v1'
};

(function initIdentityEngine() {
    try {
        const stored = localStorage.getItem(window.OCTAVE_IDENTITY.STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.videoToRb) window.OCTAVE_IDENTITY.videoToRb = new Map(parsed.videoToRb);
            if (parsed.rbToTrack) window.OCTAVE_IDENTITY.rbToTrack = new Map(parsed.rbToTrack);
            if (parsed.rbFeatures) window.OCTAVE_IDENTITY.rbFeatures = new Map(parsed.rbFeatures);
            if (parsed.queryToRb) window.OCTAVE_IDENTITY.queryToRb = new Map(parsed.queryToRb);
            console.log(`Octave Identity: Loaded ${window.OCTAVE_IDENTITY.rbToTrack.size} cached identities.`);
        }
    } catch(e) {
        console.warn("Octave Identity: Cache load error, starting clean.", e);
    }
})();

window.saveIdentityCache = () => {
    try {
        if (window.OCTAVE_IDENTITY.rbToTrack.size > 500) {
            const keys = Array.from(window.OCTAVE_IDENTITY.rbToTrack.keys()).slice(0, 250);
            keys.forEach(k => {
                window.OCTAVE_IDENTITY.rbToTrack.delete(k);
                window.OCTAVE_IDENTITY.rbFeatures.delete(k);
            });
        }

        const serialized = JSON.stringify({
            videoToRb: Array.from(window.OCTAVE_IDENTITY.videoToRb.entries()),
            rbToTrack: Array.from(window.OCTAVE_IDENTITY.rbToTrack.entries()),
            rbFeatures: Array.from(window.OCTAVE_IDENTITY.rbFeatures.entries()),
            queryToRb: Array.from(window.OCTAVE_IDENTITY.queryToRb.entries())
        });
        localStorage.setItem(window.OCTAVE_IDENTITY.STORAGE_KEY, serialized);
    } catch(e) {}
};

setInterval(() => {
    window.saveIdentityCache();
}, 45000);

// Helper for CORS-resilient API fetches
async function fetchWithCorsFallback(rawUrl, timeoutMs = 5000) {
    const urlsToTry = [
        rawUrl,
        `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`
    ];

    for (const url of urlsToTry) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

window.getCanonicalTrack = (track) => {
    if (!track) return null;
    
    let rbId = track.rbId || (track.videoId ? window.OCTAVE_IDENTITY.videoToRb.get(track.videoId) : null);
    let cachedTrack = rbId ? window.OCTAVE_IDENTITY.rbToTrack.get(rbId) : null;
    let cachedFeatures = rbId ? window.OCTAVE_IDENTITY.rbFeatures.get(rbId) : null;

    return {
        videoId: track.videoId || (cachedTrack ? cachedTrack.videoId : null),
        rbId: rbId || null,
        isrc: track.isrc || (cachedTrack ? cachedTrack.isrc : null),
        title: (cachedTrack ? cachedTrack.title : track.title) || '',
        author: (cachedTrack ? cachedTrack.author : track.author) || '',
        thumb: track.thumb || (track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg` : ''),
        audioFeatures: cachedFeatures || track.audioFeatures || null,
        cachedAt: (cachedTrack ? cachedTrack.cachedAt : Date.now())
    };
};

// Helper string normalizer for title fuzzy matching
function normalizeStr(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[\(\[\^].*?[\)\]\$]/g, '') // strip (official audio), [lyric video], etc.
        .replace(/[^a-z0-9]/g, '')           // remove special chars
        .trim();
}

// RESOLVE TRACK TO RB ID via Artist-First Lookup
window.resolveTrackToRbId = async (track) => {
    if (!track) return null;
    if (track.rbId) return track.rbId;
    if (track.videoId && window.OCTAVE_IDENTITY.videoToRb.has(track.videoId)) {
        return window.OCTAVE_IDENTITY.videoToRb.get(track.videoId);
    }

    const cleanTitle = (track.title || '').replace(/[\(\[\^].*?[\)\]\$]/g, '').trim();
    const cleanArtist = (track.author || '').replace(/ - Topic$/i, '').replace(/vevo$/i, '').trim();
    const queryKey = `${cleanTitle} ${cleanArtist}`.toLowerCase();

    if (window.OCTAVE_IDENTITY.queryToRb.has(queryKey)) {
        const rbId = window.OCTAVE_IDENTITY.queryToRb.get(queryKey);
        if (track.videoId) window.OCTAVE_IDENTITY.videoToRb.set(track.videoId, rbId);
        return rbId;
    }

    if (!cleanArtist) return null;

    try {
        // Step 1: Artist Search
        const artistUrl = `https://api.reccobeats.com/v1/artist/search?searchText=${encodeURIComponent(cleanArtist)}`;
        const artistData = await fetchWithCorsFallback(artistUrl, 4000);

        const artistList = artistData?.content || artistData?.data || (Array.isArray(artistData) ? artistData : []);
        if (artistList.length === 0) return null;

        const bestArtist = artistList[0];
        const artistId = bestArtist?.id || bestArtist?.artistId;

        if (!artistId) return null;

        // Step 2: Fetch Artist Tracks
        const tracksUrl = `https://api.reccobeats.com/v1/artist/${artistId}/track`;
        const tracksData = await fetchWithCorsFallback(tracksUrl, 5000);

        const trackList = tracksData?.content || tracksData?.data || (Array.isArray(tracksData) ? tracksData : []);
        if (trackList.length === 0) return null;

        // Step 3: Fuzzy Track Matching
        const targetNormalized = normalizeStr(cleanTitle);
        let bestMatchedTrack = null;

        for (const t of trackList) {
            const candTitle = t.trackTitle || t.title || t.name || '';
            const candNormalized = normalizeStr(candTitle);

            if (candNormalized === targetNormalized || candNormalized.includes(targetNormalized) || targetNormalized.includes(candNormalized)) {
                bestMatchedTrack = t;
                break;
            }
        }

        if (bestMatchedTrack && bestMatchedTrack.id) {
            const rbId = bestMatchedTrack.id;
            const isrc = bestMatchedTrack.isrc || null;
            const officialTitle = bestMatchedTrack.trackTitle || bestMatchedTrack.title || track.title;
            const officialArtist = bestMatchedTrack.artistName || (bestMatchedTrack.artists && bestMatchedTrack.artists[0] ? bestMatchedTrack.artists[0].name : '') || track.author;

            // Bind Cache Mappings
            if (track.videoId) window.OCTAVE_IDENTITY.videoToRb.set(track.videoId, rbId);
            window.OCTAVE_IDENTITY.queryToRb.set(queryKey, rbId);

            window.OCTAVE_IDENTITY.rbToTrack.set(rbId, {
                rbId: rbId,
                videoId: track.videoId || null,
                isrc: isrc,
                title: officialTitle,
                author: officialArtist,
                cachedAt: Date.now()
            });

            window.saveIdentityCache();
            console.log(`Octave Identity: Mapped "${track.title}" -> ReccoBeats rbId: ${rbId}`);
            return rbId;
        }

    } catch(e) {
        console.warn("Octave Identity: Artist-first resolution error", e);
    }

    return null;
};

// BATCH AUDIO FEATURES RESOLUTION
window.resolveAudioFeaturesBatch = async (rbIds) => {
    if (!rbIds || !Array.isArray(rbIds) || rbIds.length === 0) return {};

    const missingIds = [];
    const resultMap = {};

    rbIds.forEach(id => {
        if (!id) return;
        if (window.OCTAVE_IDENTITY.rbFeatures.has(id)) {
            resultMap[id] = window.OCTAVE_IDENTITY.rbFeatures.get(id);
        } else {
            missingIds.push(id);
        }
    });

    if (missingIds.length === 0) return resultMap;

    const chunks = [];
    for (let i = 0; i < missingIds.length; i += 40) {
        chunks.push(missingIds.slice(i, i + 40));
    }

    for (const chunk of chunks) {
        try {
            const url = `https://api.reccobeats.com/v1/audio-features?ids=${encodeURIComponent(chunk.join(','))}`;
            const data = await fetchWithCorsFallback(url, 5000);

            if (data) {
                const list = data.content || data.data || (Array.isArray(data) ? data : []);
                list.forEach(feat => {
                    if (feat && (feat.id || feat.trackId)) {
                        const featId = feat.id || feat.trackId;
                        const parsedFeatures = {
                            danceability: feat.danceability ?? 0.5,
                            energy: feat.energy ?? 0.5,
                            valence: feat.valence ?? 0.5,
                            tempo: feat.tempo ?? 120,
                            acousticness: feat.acousticness ?? 0.5,
                            instrumentalness: feat.instrumentalness ?? 0.0,
                            key: feat.key ?? 0,
                            mode: feat.mode ?? 1,
                            loudness: feat.loudness ?? -6.0
                        };
                        window.OCTAVE_IDENTITY.rbFeatures.set(featId, parsedFeatures);
                        resultMap[featId] = parsedFeatures;
                    }
                });
                window.saveIdentityCache();
            }
        } catch(e) {}
    }

    return resultMap;
};

// RESOLVE RECOMMENDATIONS
window.resolveReccoCandidates = async (seedRbIds) => {
    const validSeeds = seedRbIds.filter(Boolean).slice(0, 5);
    if (validSeeds.length === 0) return [];

    const cacheKey = validSeeds.sort().join(',');
    if (window.OCTAVE_IDENTITY.rbRecs.has(cacheKey)) {
        return window.OCTAVE_IDENTITY.rbRecs.get(cacheKey);
    }

    try {
        const url = `https://api.reccobeats.com/v1/track/recommendation?seeds=${encodeURIComponent(validSeeds.join(','))}&size=40`;
        const data = await fetchWithCorsFallback(url, 6000);

        if (data) {
            const list = data.content || data.data || (Array.isArray(data) ? data : []);

            const candidates = list.map(item => {
                const rbId = item.id || item.trackId;
                const title = item.trackTitle || item.title || item.name || '';
                const author = item.artistName || (item.artists && item.artists[0] ? (item.artists[0].name || item.artists[0]) : '') || item.author || '';

                if (rbId && !window.OCTAVE_IDENTITY.rbToTrack.has(rbId)) {
                    window.OCTAVE_IDENTITY.rbToTrack.set(rbId, {
                        rbId: rbId,
                        videoId: null,
                        isrc: item.isrc || null,
                        title: title,
                        author: author,
                        cachedAt: Date.now()
                    });
                }

                return {
                    rbId: rbId,
                    title: title,
                    author: author,
                    popularity: item.popularity || 50,
                    durationMs: item.durationMs || item.duration_ms || 0
                };
            });

            window.OCTAVE_IDENTITY.rbRecs.set(cacheKey, candidates);
            window.saveIdentityCache();
            return candidates;
        }
    } catch(e) {}

    return [];
};

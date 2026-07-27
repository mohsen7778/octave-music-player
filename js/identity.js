// ========================================
// FILE: js/identity.js
// ========================================

// ============================================================
// identity.js — Octave Canonical Identity & Persistent Cache Engine
// Maps: videoId <-> rbId <-> ISRC <-> Audio Features <-> Stream
// ============================================================

window.OCTAVE_IDENTITY = {
    // In-memory caches for high-speed synchronous lookups
    videoToRb: new Map(),     // videoId -> rbId
    rbToTrack: new Map(),     // rbId -> canonical track metadata
    rbFeatures: new Map(),    // rbId -> audioFeatures
    rbRecs: new Map(),        // rbId -> candidate rbIds array
    queryToRb: new Map(),     // search query -> rbId
    
    // Persistent Storage Key
    STORAGE_KEY: 'octave_identity_vault_v1'
};

// --- INITIALIZATION & LOCALSTORAGE PERSISTENCE ---
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
        // Prune in-memory cache if it grows too large (Keep top 500 identities)
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
    } catch(e) {
        console.warn("Octave Identity: Save cache failed.", e);
    }
};

// Auto-persist identity vault periodically
setInterval(() => {
    window.saveIdentityCache();
}, 45000);

// --- CANONICAL TRACK NORMALIZER ---
window.getCanonicalTrack = (track) => {
    if (!track) return null;
    
    // Check if we already have a resolved canonical identity
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

// --- IDENTITY RESOLUTION APIS ---

// 1. Resolve raw Track (from YT / Search / Queue) to ReccoBeats Track ID (rbId)
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

    try {
        const url = `https://api.reccobeats.com/v1/track/search?searchText=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            const list = data.content || data.data || [];
            if (list.length > 0) {
                const bestMatch = list[0];
                const rbId = bestMatch.id;
                const isrc = bestMatch.isrc || null;

                // Bind mappings
                if (track.videoId) window.OCTAVE_IDENTITY.videoToRb.set(track.videoId, rbId);
                window.OCTAVE_IDENTITY.queryToRb.set(queryKey, rbId);
                
                window.OCTAVE_IDENTITY.rbToTrack.set(rbId, {
                    rbId: rbId,
                    videoId: track.videoId || null,
                    isrc: isrc,
                    title: bestMatch.trackTitle || track.title,
                    author: bestMatch.artistName || track.author,
                    cachedAt: Date.now()
                });

                window.saveIdentityCache();
                return rbId;
            }
        }
    } catch(e) {}
    
    return null;
};

// 2. Fetch & Cache Audio Features for a Batch of rbIds (Max 40 per call)
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

    // Batch in chunks of 40 IDs max
    const chunks = [];
    for (let i = 0; i < missingIds.length; i += 40) {
        chunks.push(missingIds.slice(i, i + 40));
    }

    for (const chunk of chunks) {
        try {
            const url = `https://api.reccobeats.com/v1/audio-features?ids=${encodeURIComponent(chunk.join(','))}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                const list = data.content || data.data || (Array.isArray(data) ? data : []);
                list.forEach(feat => {
                    if (feat && feat.id) {
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
                        window.OCTAVE_IDENTITY.rbFeatures.set(feat.id, parsedFeatures);
                        resultMap[feat.id] = parsedFeatures;
                    }
                });
                window.saveIdentityCache();
            }
        } catch(e) {}
    }

    return resultMap;
};

// 3. Resolve Recommendations for Seed rbIds with Cache
window.resolveReccoCandidates = async (seedRbIds) => {
    const validSeeds = seedRbIds.filter(Boolean).slice(0, 5);
    if (validSeeds.length === 0) return [];

    const cacheKey = validSeeds.sort().join(',');
    if (window.OCTAVE_IDENTITY.rbRecs.has(cacheKey)) {
        return window.OCTAVE_IDENTITY.rbRecs.get(cacheKey);
    }

    try {
        const url = `https://api.reccobeats.com/v1/track/recommendation?seedTrackIds=${encodeURIComponent(validSeeds.join(','))}&size=50`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            const list = data.content || data.data || (Array.isArray(data) ? data : []);
            
            const candidates = list.map(item => {
                const rbId = item.id;
                const title = item.trackTitle || item.title;
                const author = item.artistName || (item.artists && item.artists[0] ? item.artists[0].name : '') || item.author;
                
                // Cache identity details
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
                    durationMs: item.durationMs || 0
                };
            });

            window.OCTAVE_IDENTITY.rbRecs.set(cacheKey, candidates);
            window.saveIdentityCache();
            return candidates;
        }
    } catch(e) {}

    return [];
};

// ========================================
// FILE: js/graph.js
// ========================================

// ============================================================
// graph.js — Octave Listener Taste Graph Architecture
// Node Graph: Artist <-> Features <-> Key/Mode <-> Energy Envelope
// ============================================================

window.OCTAVE_GRAPH = {
    nodes: {}, // nodeKey -> weight
    edges: {}, // nodeKeyA:nodeKeyB -> weight
    STORAGE_KEY: 'octave_taste_graph_v1'
};

(function initGraphEngine() {
    try {
        const stored = localStorage.getItem(window.OCTAVE_GRAPH.STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            window.OCTAVE_GRAPH.nodes = parsed.nodes || {};
            window.OCTAVE_GRAPH.edges = parsed.edges || {};
            console.log(`Octave Graph: Loaded taste graph with ${Object.keys(window.OCTAVE_GRAPH.nodes).length} nodes.`);
        }
    } catch(e) {
        console.warn("Octave Graph: Failed to load graph cache.", e);
    }
})();

window.saveTasteGraph = () => {
    try {
        localStorage.setItem(window.OCTAVE_GRAPH.STORAGE_KEY, JSON.stringify({
            nodes: window.OCTAVE_GRAPH.nodes,
            edges: window.OCTAVE_GRAPH.edges
        }));
    } catch(e) {}
};

// Helper: Discretize continuous features into graph buckets
function getBpmBucket(tempo) {
    if (!tempo) return 'bpm_mid';
    if (tempo < 90) return 'bpm_slow';
    if (tempo <= 125) return 'bpm_mid';
    if (tempo <= 150) return 'bpm_upbeat';
    return 'bpm_fast';
}

function getEnergyBucket(energy) {
    if (energy === undefined) return 'energy_mid';
    if (energy < 0.4) return 'energy_chill';
    if (energy <= 0.75) return 'energy_mid';
    return 'energy_high';
}

function getKeyNode(key, mode) {
    if (key === undefined || key < 0) return 'key_unknown';
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modeName = mode === 1 ? 'Maj' : 'Min';
    return `key_${keyNames[key % 12]}_${modeName}`;
}

// Sppread signal through node connections
window.reinforceTasteGraph = (artistName, audioFeatures, strength = 1.0) => {
    if (!artistName || !audioFeatures) return;

    const cleanArtist = `artist_${artistName.replace(/ - Topic$/i, '').trim().toLowerCase()}`;
    const bpmNode = getBpmBucket(audioFeatures.tempo);
    const energyNode = getEnergyBucket(audioFeatures.energy);
    const keyNode = getKeyNode(audioFeatures.key, audioFeatures.mode);

    const activeNodes = [cleanArtist, bpmNode, energyNode, keyNode];

    // 1. Reinforce Node Weights
    activeNodes.forEach(node => {
        window.OCTAVE_GRAPH.nodes[node] = (window.OCTAVE_GRAPH.nodes[node] || 0) + strength;
    });

    // 2. Reinforce Inter-Node Edges
    for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
            const edgeKey = `${activeNodes[i]}:${activeNodes[j]}`;
            window.OCTAVE_GRAPH.edges[edgeKey] = (window.OCTAVE_GRAPH.edges[edgeKey] || 0) + (strength * 0.5);
        }
    }

    window.saveTasteGraph();
};

// Evaluate candidate score boost via Graph Affinity
window.evaluateGraphAffinity = (artistName, audioFeatures) => {
    if (!artistName || !audioFeatures) return 0;

    const cleanArtist = `artist_${artistName.replace(/ - Topic$/i, '').trim().toLowerCase()}`;
    const bpmNode = getBpmBucket(audioFeatures.tempo);
    const energyNode = getEnergyBucket(audioFeatures.energy);
    const keyNode = getKeyNode(audioFeatures.key, audioFeatures.mode);

    const candidateNodes = [cleanArtist, bpmNode, energyNode, keyNode];
    let scoreBoost = 0;

    candidateNodes.forEach(node => {
        if (window.OCTAVE_GRAPH.nodes[node]) {
            scoreBoost += Math.min(10, window.OCTAVE_GRAPH.nodes[node] * 0.5);
        }
    });

    return Math.min(20, scoreBoost); // Cap graph bonus at +20
};
// ============================================================
// app.js — Octave Full Flagship Engine
// 100% Complete File - Extended Splash Window + Chrome Fixes Included
// ============================================================

(function() {
    const clearSplash = () => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
            setTimeout(() => splash.remove(), 400);
        }
    };
    // FIXED: Enforced a hard 1.8-second duration rule so your motto remains highly visible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(clearSplash, 1800);
        });
    } else {
        setTimeout(clearSplash, 1800);
    }
})();

let deferredInstallPrompt;

window.getSafeThumb = (track) => {
    if (!track) return '';
    if (track.videoId) return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
    return track.thumb || '';
};

if (!window.escapeHTML) {
    window.escapeHTML = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    
    if (!localStorage.getItem('installPromptDismissed')) {
        setTimeout(() => {
            const installModal = document.getElementById('install-modal');
            if (installModal) installModal.classList.add('active');
        }, 3000);
    }
});

document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const shareV = params.get('v');
    if (shareV) {
        const shareT = params.get('t') || 'Shared Track';
        const shareA = params.get('a') || 'Unknown Artist';
        const shareTh = params.get('th') || '';
        
        const sharedTrack = { videoId: shareV, title: shareT, author: shareA, thumb: shareTh };
        window.OCTAVE.queue =[sharedTrack];
        window.OCTAVE.currentIndex = 0;
        window.saveCache();
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => {
            if(window.playTrackByIndex) {
                window.playTrackByIndex(0);
                document.getElementById('full-player').classList.add('active');
            }
        }, 1000);
    }

    document.getElementById('close-install')?.addEventListener('click', () => {
        document.getElementById('install-modal').classList.remove('active');
        localStorage.setItem('installPromptDismissed', 'true');
    });

    document.getElementById('confirm-install')?.addEventListener('click', async () => {
        document.getElementById('install-modal').classList.remove('active');
        localStorage.setItem('installPromptDismissed', 'true'); 
        
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
        }
    });

    const dynamicView = document.getElementById('dynamic-view');
    const views = {
        home: dynamicView ? dynamicView.innerHTML : '',
        search: `
            <header class="search-header" style="padding: 40px 20px 20px 20px; background: var(--bg-deep);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h1 class="search-title" style="font-size: 24px; font-weight: 700; margin: 0;">Search</h1>
                    <button class="icon-btn" id="open-yt-import" style="display: flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: -0.5px; color: var(--text-primary);">
                        Add <i class="fa-brands fa-youtube" style="color: #ff0000; font-size: 24px; margin-left: 2px;"></i> YouTube Playlist
                    </button>
                </div>
                <div class="search-input-wrap" style="position: relative;">
                    <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                    <input type="text" id="searchInput" placeholder="Search tracks..." autocomplete="off" style="width: 100%; background: var(--bg-surface); border: 1px solid var(--glass-border); padding: 14px 14px 14px 44px; border-radius: 8px; color: var(--text-primary); font-size: 14px; outline: none;">
                </div>
            </header>
            <div id="searchResults" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
                <div id="search-default-view">
                    <h3 style="font-size: 16px; margin-bottom: 16px;">Recently Searched</h3>
                    <div class="vertical-list" id="search-recent-list" style="padding-right: 0;"></div>
                </div>
            </div>
            <div class="bottom-spacer"></div>
        `,
        library: `
            <header class="search-header" style="padding: 40px 20px 20px 20px; display: flex; justify-content: space-between; align-items: center;">
                <h1 class="search-title" style="font-size: 24px; font-weight: 700;">Library</h1>
                <button class="icon-btn" id="open-yt-import" style="display: flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: -0.5px; color: var(--text-primary);">
                    Add <i class="fa-brands fa-youtube" style="color: #ff0000; font-size: 24px; margin-left: 2px;"></i> YouTube Playlist
                </button>
            </header>
            <div id="lib-playlists" class="vertical-list" style="padding: 20px;"></div>
            <div class="bottom-spacer"></div>
        `,
        premium: `
            <div style="padding: 80px 20px; text-align: center;">
                <img src="logo.png" style="width: 80px; height: 80px; border-radius: 16px; margin-bottom: 24px;" onerror="this.style.display='none'">
                <h2 style="font-size: 24px; margin-bottom: 12px;">Octave Premium</h2>
                <p style="color: var(--text-secondary); font-size: 14px;">Ad-free background listening activated.</p>
            </div>
        `
    };

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const currentActive = document.querySelector('.nav-item.active');
            if (currentActive) currentActive.classList.remove('active');
            item.classList.add('active');
            const tab = item.getAttribute('data-tab');

            const viewDiv = document.getElementById('dynamic-view');
            if (!viewDiv) return;

            if (tab === 'home') {
                viewDiv.innerHTML = views.home;
                if(window.renderHome) window.renderHome();
            } else {
                viewDiv.innerHTML = views[tab];
                if (tab === 'search') {
                    if(window.bindSearch) window.bindSearch();
                    if(window.renderRecentSearches) window.renderRecentSearches(); 
                }
                if (tab === 'library') {
                    if(window.renderLibrary) window.renderLibrary();
                }
            }
        });
    });

    handleBravePrompt();
    if(window.renderHome) window.renderHome();

    document.getElementById('close-playlist')?.addEventListener('click', () => document.getElementById('playlist-modal').classList.remove('active'));
    document.getElementById('save-playlist')?.addEventListener('click', () => {
        const name = document.getElementById('playlist-name').value.trim();
        if (name !== '' && window.OCTAVE && !window.OCTAVE.playlists[name]) {
            window.OCTAVE.playlists[name] =[];
            window.saveCache();
            document.getElementById('playlist-name').value = '';
            document.getElementById('playlist-modal').classList.remove('active');
            if(window.renderHome) window.renderHome();
        }
    });

    document.querySelector('.mini-inner')?.addEventListener('click', () => document.getElementById('full-player').classList.add('active'));
    document.getElementById('close-fp')?.addEventListener('click', () => document.getElementById('full-player').classList.remove('active'));
    document.getElementById('close-track-options')?.addEventListener('click', () => document.getElementById('track-options-modal').classList.remove('active'));
    document.getElementById('close-select-playlist')?.addEventListener('click', () => document.getElementById('select-playlist-modal').classList.remove('active'));
    
    document.getElementById('close-yt-import')?.addEventListener('click', () => document.getElementById('yt-import-modal').classList.remove('active'));
    document.getElementById('close-ai-mix')?.addEventListener('click', () => document.getElementById('ai-mix-modal').classList.remove('active'));

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// --- GLOBAL EVENT DELEGATION ---
document.body.addEventListener('click', async (e) => {
    if (e.target.closest('#menu-btn')) {
        document.getElementById('side-menu').classList.add('active');
        document.getElementById('menu-backdrop').classList.add('active');
    }
    if (e.target.closest('#close-menu') || e.target.closest('#menu-backdrop')) {
        document.getElementById('side-menu').classList.remove('active');
        document.getElementById('menu-backdrop').classList.remove('active');
    }
    if (e.target.closest('#open-yt-import')) {
        document.getElementById('yt-import-modal').classList.add('active');
    }
    if (e.target.closest('#open-create-playlist')) {
        document.getElementById('playlist-modal').classList.add('active');
    }
    if (e.target.closest('#open-ai-mix') || e.target.closest('#open-ai-mix-large')) {
        document.getElementById('ai-mix-modal').classList.add('active');
    }
    
    if (e.target.closest('#open-discover-mix')) {
        if (window.generateDiscoverMix) window.generateDiscoverMix();
    }
    if (e.target.closest('#open-liked-songs')) {
        if (window.renderLikedSongs) window.renderLikedSongs();
    }

    if (e.target.closest('#open-routing-settings')) {
        document.getElementById('side-menu').classList.remove('active');
        document.getElementById('menu-backdrop').classList.remove('active');

        const savedToken = localStorage.getItem('octave_tg_token');
        if (savedToken) {
            const parts = savedToken.split(':');
            if (parts.length === 2) {
                document.getElementById('tg-bot-token').value = parts[0].substring(0, 4) + '********:AA************' + parts[1].substring(parts[1].length - 10);
            } else {
                document.getElementById('tg-bot-token').value = savedToken;
            }
        } else {
            document.getElementById('tg-bot-token').value = '';
        }

        document.getElementById('tg-chat-id').value = localStorage.getItem('octave_tg_chat_id') || '';

        const currentRoute = localStorage.getItem('octave_routing_mode') || 'local';
        document.querySelectorAll('.route-card').forEach(c => {
            c.classList.remove('active');
            if (c.getAttribute('data-val') === currentRoute) c.classList.add('active');
        });

        document.getElementById('routing-panel').classList.add('active');
    }
    
    if (e.target.closest('#close-routing-panel')) {
        document.getElementById('routing-panel').classList.remove('active');
    }

    if (e.target.closest('.route-card')) {
        document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.route-card').classList.add('active');
    }

    if (e.target.closest('#paste-tg-token')) {
        try {
            const text = await navigator.clipboard.readText();
            document.getElementById('tg-bot-token').value = text;
        } catch(err) {
            alert("Clipboard blocked by browser. Please paste manually.");
        }
    }

    if (e.target.closest('#fetch-chat-id')) {
        const btn = e.target.closest('#fetch-chat-id');
        let tokenInput = document.getElementById('tg-bot-token').value.trim();
        
        if (tokenInput.includes('********')) tokenInput = localStorage.getItem('octave_tg_token');

        if (!tokenInput) {
            alert("Please paste your Bot Token first!");
            return;
        }

        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
            const r = await fetch(`https://api.telegram.org/bot${tokenInput}/getUpdates`);
            const d = await r.json();
            if (!d.ok) throw new Error("Invalid token");
            if (!d.result || d.result.length === 0) {
                alert("No chat history found! CRITICAL: Make sure you searched for your new bot in Telegram and hit START first. Then try again here.");
            } else {
                const chatId = d.result[d.result.length - 1].message.chat.id;
                document.getElementById('tg-chat-id').value = chatId;
            }
        } catch(err) {
            alert("Error: " + err.message);
        } finally {
            btn.innerHTML = origText;
        }
    }

    if (e.target.closest('#save-routing')) {
        const route = document.querySelector('.route-card.active').getAttribute('data-val');
        let tokenInput = document.getElementById('tg-bot-token').value.trim();
        let finalToken = tokenInput.includes('********') ? localStorage.getItem('octave_tg_token') : tokenInput;
        const chatId = document.getElementById('tg-chat-id').value.trim();

        if ((route === 'telegram' || route === 'both') && (!finalToken || !chatId)) {
            alert("You must provide both your Bot Token and your Chat ID for Telegram delivery to work!");
            return;
        }

        const btn = document.getElementById('save-routing');
        const origText = btn.innerHTML;

        if ((route === 'telegram' || route === 'both') && finalToken && chatId) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing Bot...';
            try {
                const r = await fetch(`https://api.telegram.org/bot${finalToken}/sendMessage`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "✅ *Octave Routing Engine*\nTelegram bot successfully connected! Downloaded songs will appear here.",
                        parse_mode: "Markdown"
                    })
                });
                const d = await r.json();
                if (!d.ok) throw new Error(d.description);
                alert("Settings Saved! Telegram Bot is successfully connected. A test message was sent to your bot.");
            } catch(err) {
                alert("Settings saved, BUT failed to send test message to Telegram. Check your Bot Token and Chat ID. Error: " + err.message);
            } finally {
                btn.innerHTML = origText;
            }
        } else {
            alert("Routing settings saved successfully (Local Delivery).");
        }

        localStorage.setItem('octave_tg_token', finalToken || '');
        localStorage.setItem('octave_tg_chat_id', chatId || '');
        localStorage.setItem('octave_routing_mode', route);

        if (finalToken) {
            const parts = finalToken.split(':');
            if (parts.length === 2) {
                document.getElementById('tg-bot-token').value = parts[0].substring(0, 4) + '********:AA************' + parts[1].substring(parts[1].length - 10);
            }
        }
        document.getElementById('routing-panel').classList.remove('active');
    }

    if (e.target.closest('#clear-routing-cache')) {
        if(confirm("Clear all Telegram routing settings?")) {
            localStorage.removeItem('octave_tg_token');
            localStorage.removeItem('octave_tg_chat_id');
            localStorage.setItem('octave_routing_mode', 'local');
            document.getElementById('tg-bot-token').value = '';
            document.getElementById('tg-chat-id').value = '';
            document.querySelectorAll('.route-card').forEach(c => {
                c.classList.remove('active');
                if (c.getAttribute('data-val') === 'local') c.classList.add('active');
            });
        }
    }

    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
        document.getElementById('side-menu').classList.remove('active');
        document.getElementById('menu-backdrop').classList.remove('active');
        const url = pageBtn.getAttribute('data-page');
        const dynamicView = document.getElementById('dynamic-view');
        if (!dynamicView) return;
        dynamicView.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--accent);"></i></div>';
        try {
            const r = await fetch(url);
            const html = await r.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            dynamicView.innerHTML = doc.querySelector('.mobile-app').innerHTML;
            const backBtn = dynamicView.querySelector('a[href="index.html"]');
            if (backBtn) {
                backBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    const homeTab = document.querySelector('.nav-item[data-tab="home"]');
                    if (homeTab) homeTab.click();
                });
            }
        } catch (err) {
            dynamicView.innerHTML = '<div class="empty-state-text">Failed to load.</div>';
        }
    }
});

// --- AI MIX ENGINE ---
async function generateAiMix() {
    const promptInput = document.getElementById('ai-prompt').value.trim();
    const lang = document.getElementById('ai-lang').value;
    if (!promptInput) return;

    const btn = document.getElementById('generate-ai-mix');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Brewing...';
    btn.disabled = true;

    try {
        let tasteContext = "";
        if (window.OCTAVE && typeof window.calculateTrackScore === 'function') {
            const allKnown =[...Object.values(window.OCTAVE.liked || {}), ...(window.OCTAVE.recentPlayed || [])];
            const uniqueTracks = Array.from(new Map(allKnown.map(t => [t.videoId, t])).values());
            const topScored = uniqueTracks.sort((a, b) => window.calculateTrackScore(b) - window.calculateTrackScore(a)).slice(0, 5);
            
            if (topScored.length > 0) {
                const cleanNames = topScored.map(t => `${t.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30)} by ${t.author.replace(/[^a-zA-Z0-9 ]/g, '')}`).join(", ");
                tasteContext = `\nContext: The user recently played:[${cleanNames}]. If these are actual songs, use them to gauge their taste. IF THEY ARE TUTORIALS, NEWS, PODCASTS, OR YOUTUBE VIDEOS, COMPLETELY IGNORE THEM.\n`;
            }
        }

        const systemPrompt = `You are an elite music curator API. 
Task: Recommend exactly 15 highly melodic MUSIC TRACKS based on the vibe: "${promptInput}". 
Language: ${lang}. ${tasteContext}

CRITICAL RULES:
1. Output strictly in this format: Song Title - Artist Name
2. Recommend ONLY actual music tracks (songs). NEVER recommend tutorials, news, podcasts, HTML coding, or conversational videos.
3. Do NOT include numbers, quotes, bullet points, HTML tags, or any other text.`;
        
        const response = await fetch(`https://text.pollinations.ai/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages:[{ role: 'system', content: systemPrompt }]
            })
        });
        const text = await response.text();

        const lines = text.split('\n')
            .map(l => l.replace(/^[\d\.\)\-*]+\s*/, '').replace(/["'*_<>]/g, '').trim()) 
            .filter(l => l.match(/[-–—]/) && l.length < 80 && !l.toLowerCase().includes('tutorial') && !l.toLowerCase().includes('html'));

        if (lines.length === 0) throw new Error("Format invalid. Please try a different prompt.");

        const playableTracks =[];
        for (const line of lines.slice(0, 15)) {
            const parts = line.split(/[-–—]/);
            if(parts.length < 2) continue;
            
            const title = parts[0].trim();
            const artist = parts[1].trim();
            if(!title || !artist) continue;

            const results = await window.performSearch(`${title} ${artist}`);
            if (results && results.length > 0) playableTracks.push(results[0]);
        }

        if (playableTracks.length === 0) throw new Error("Tracks not found. Try a different vibe.");

        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const finalName = `AI Mix: ${promptInput.substring(0, 10)} [${dateStr}]`;
        
        if (window.OCTAVE) {
            window.OCTAVE.playlists[finalName] = playableTracks;
            window.saveCache();
        }

        document.getElementById('ai-mix-modal').classList.remove('active');
        document.getElementById('ai-prompt').value = '';
        
        const activeNav = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
        if(activeNav === 'home') {
            if(window.renderHome) window.renderHome();
        }
        
        alert(`Successfully generated "${finalName}" with ${playableTracks.length} tracks!`);

    } catch (e) {
        alert("AI Error: " + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
document.getElementById('generate-ai-mix')?.addEventListener('click', generateAiMix);

window.openTrackOptions = (track) => {
    window.OCTAVE.activeTrackForOptions = track;
    const infoDiv = document.getElementById('opt-track-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <img src="${window.getSafeThumb(track)}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.escapeHTML(track.title)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${window.escapeHTML(track.author)}</div>
            </div>
        `;
    }
    document.getElementById('track-options-modal').classList.add('active');
};

document.getElementById('export-vault-btn')?.addEventListener('click', () => {
    document.getElementById('side-menu').classList.remove('active');
    document.getElementById('menu-backdrop').classList.remove('active');
    if (window.exportVault) window.exportVault();
});
document.getElementById('import-vault-btn')?.addEventListener('click', () => {
    document.getElementById('import-vault-input').click();
});
document.getElementById('import-vault-input')?.addEventListener('change', window.importVault);

const fpPanel = document.getElementById('fp-overlay-panel');
const fpContent = document.getElementById('fp-overlay-content');
const fpTitle = document.getElementById('fp-overlay-title');
document.getElementById('close-fp-overlay')?.addEventListener('click', () => fpPanel.classList.remove('active'));

document.getElementById('fp-lyrics-btn')?.addEventListener('click', async () => {
    if (!window.OCTAVE || window.OCTAVE.currentIndex < 0) return;
    if (fpTitle) fpTitle.innerText = 'Lyrics';
    if (fpContent) fpContent.innerHTML = '<div style="text-align:center; margin-top: 40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--accent);"></i></div>';
    if (fpPanel) fpPanel.classList.add('active');

    const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
    const html = await window.fetchLyrics(track.author, track.title);

    const fonts =[
        { name: 'Modern', css: 'Plus Jakarta Sans' },
        { name: 'Clean', css: 'Inter' },
        { name: 'Classic', css: 'Lora' },
        { name: 'Elegant', css: 'Playfair Display' },
        { name: 'Bold', css: 'Montserrat' },
        { name: 'Heavy', css: 'Kanit' },
        { name: 'Typewriter', css: 'Roboto Mono' },
        { name: 'Cursive', css: 'Dancing Script' },
        { name: 'Sharp', css: 'Oswald' },
        { name: 'Impact', css: 'Bebas Neue' }
    ];

    let fontHeader = `<div class="lyrics-font-selector scroll-x">`;
    fonts.forEach(f => {
        const activeClass = window.OCTAVE.selectedFont === f.css ? 'active' : '';
        fontHeader += `<div class="font-option ${activeClass}" style="font-family: '${f.css}', sans-serif;" onclick="window.setLyricsFont('${f.css}', this)">${f.name}</div>`;
    });
    fontHeader += `</div>`;

    if (fpContent) fpContent.innerHTML = fontHeader + `<div id="lyrics-content">${html}</div>`;
});

document.getElementById('fp-share-btn')?.addEventListener('click', () => {
    if (window.OCTAVE && window.OCTAVE.currentIndex >= 0) {
        const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('v', track.videoId);
        url.searchParams.set('t', track.title);
        url.searchParams.set('a', track.author);
        url.searchParams.set('th', window.getSafeThumb(track));
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert("Track link copied to clipboard!");
        }).catch(() => {
            alert("Failed to copy link.");
        });
    }
});

window.setLyricsFont = (fontCss, el) => {
    window.OCTAVE.selectedFont = fontCss;
    localStorage.setItem('octave_font', fontCss);
    document.querySelectorAll('.font-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    const container = document.getElementById('lyrics-content');
    if (container && container.firstChild) {
        container.firstChild.style.fontFamily = `'${fontCss}', sans-serif`;
    }
};

function handleBravePrompt() {
    if (!localStorage.getItem('bravePromptShown')) setTimeout(() => document.getElementById('brave-modal')?.classList.add('active'), 1500);
    const dismissBrave = () => {
        localStorage.setItem('bravePromptShown', 'true');
        document.getElementById('brave-modal')?.classList.remove('active');
    };
    document.getElementById('close-brave')?.addEventListener('click', dismissBrave);
    document.getElementById('get-brave')?.addEventListener('click', dismissBrave);
}

document.getElementById('opt-share-track')?.addEventListener('click', () => {
    if (window.OCTAVE && window.OCTAVE.activeTrackForOptions) {
        const track = window.OCTAVE.activeTrackForOptions;
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('v', track.videoId);
        url.searchParams.set('t', track.title);
        url.searchParams.set('a', track.author);
        url.searchParams.set('th', window.getSafeThumb(track));
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert("Track link copied to clipboard!");
        }).catch(() => {
            alert("Failed to copy link.");
        });
        document.getElementById('track-options-modal').classList.remove('active');
    }
});

document.getElementById('opt-like-track')?.addEventListener('click', () => {
    if (window.OCTAVE && window.OCTAVE.activeTrackForOptions) {
        window.toggleLike(window.OCTAVE.activeTrackForOptions);
        document.getElementById('track-options-modal').classList.remove('active');
    }
});

document.getElementById('opt-add-playlist')?.addEventListener('click', () => {
    if (!window.OCTAVE) return;
    document.getElementById('track-options-modal').classList.remove('active');
    const plModal = document.getElementById('select-playlist-modal');
    const list = document.getElementById('playlist-selection-list');
    if (!list || !plModal) return;
    if (Object.keys(window.OCTAVE.playlists).length === 0) {
        list.innerHTML = '<div class="empty-state-text">No playlists.</div>';
    } else {
        list.innerHTML = '';
        Object.keys(window.OCTAVE.playlists).forEach(plName => {
            const el = document.createElement('div');
            el.className = 'drawer-item';
            el.innerHTML = `<i class="fa-solid fa-list"></i> <span>${window.escapeHTML(plName)}</span>`;
            el.addEventListener('click', () => {
                window.OCTAVE.playlists[plName].push(window.OCTAVE.activeTrackForOptions);
                window.saveCache();
                plModal.classList.remove('active');
                if (window.renderPlaylistDetail && document.querySelector('h1')?.textContent === plName) window.renderPlaylistDetail(plName);
            });
            list.appendChild(el);
        });
    }
    plModal.classList.add('active');
});

// ============================================================
// --- Restored Download Extraction & Telegram Routing Pipeline ---
// ============================================================

window.getDownloadedTracks = () => {
    try {
        return JSON.parse(localStorage.getItem('octave_downloads')) || {};
    } catch (e) {
        return {};
    }
};

window.markTrackDownloaded = (videoId) => {
    const dls = window.getDownloadedTracks();
    dls[videoId] = Date.now();
    localStorage.setItem('octave_downloads', JSON.stringify(dls));
};

window.isTrackDownloaded = (videoId) => {
    const dls = window.getDownloadedTracks();
    return !!dls[videoId];
};

window.downloadTrack = async (track, btnElement) => {
    if (!track) return;
    
    if (window.isTrackDownloaded(track.videoId)) {
        alert("You have already downloaded this track!");
        return;
    }

    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Extracting...</span>';
    btnElement.style.pointerEvents = 'none';

    const TELEGRAM_BOT_TOKEN = '7967587608:AAFmy_hxZvnkPl3g2h6Bj0WN58Qn2X0FIaE';
    const TELEGRAM_CHAT_ID = '7746909110';

    async function devLog(phase, details = "") {
        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.startsWith('YOUR_')) return;
        const msg = `🐛 <b>DEV LOG</b>\n<b>Phase:</b> ${phase}\n<b>Track:</b> ${track.title}\n<b>Details:</b> <pre>${window.escapeHTML(typeof details === 'object' ? JSON.stringify(details, null, 2) : details)}</pre>`;
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' })
            });
        } catch(e) { console.error("Log failed", e); }
    }

    await devLog("1. INIT", "Download button clicked. RapidAPI pipeline starting...");

    try {
        await devLog("2. WORKER_PING", "Sending POST to octavecd9.bdra77367.workers.dev...");
        
        const response = await fetch('https://octavecd9.bdra77367.workers.dev', {
            method: 'POST',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ videoId: track.videoId })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Worker HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();
        await devLog("3. WORKER_RESPONSE", data);

        const targetUrl = data.url;
        if (!targetUrl) throw new Error("Worker JSON missing 'url' property.");

        const routeMode = localStorage.getItem('octave_routing_mode') || 'local';
        const userTgToken = localStorage.getItem('octave_tg_token');
        const userChatId = localStorage.getItem('octave_tg_chat_id');
        const filename = `${track.author.replace(/[\\/:*?"<>|]/g, "")} - ${track.title.replace(/[\\/:*?"<>|]/g, "")}.mp3`;

        let tgSuccess = false;

        if ((routeMode === 'telegram' || routeMode === 'both') && userTgToken && userChatId) {
            btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending TG...</span>';
            await devLog("4. TG_DELIVERY", "Instructing Telegram to fetch URL directly (CORS Bypass)...");
            
            try {
                const tgRes = await fetch(`https://api.telegram.org/bot${userTgToken}/sendAudio?chat_id=${userChatId}&audio=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(track.title)}&performer=${encodeURIComponent(track.author)}`);
                
                if (tgRes.ok) {
                    tgSuccess = true;
                    await devLog("TG_DELIVERY_SUCCESS", "MP3 Sent to Bot via URL!");
                } else {
                    const tgErr = await tgRes.text();
                    await devLog("TG_DELIVERY_FAIL_AUDIO", tgErr);
                    
                    await devLog("TG_DELIVERY_RETRY", "Trying sendDocument fallback with URL...");
                    const tgDocRes = await fetch(`https://api.telegram.org/bot${userTgToken}/sendDocument?chat_id=${userChatId}&document=${encodeURIComponent(targetUrl)}`);
                    
                    if (tgDocRes.ok) {
                        tgSuccess = true;
                        await devLog("TG_DELIVERY_SUCCESS_DOC", "MP3 Sent to Bot as raw Document URL!");
                    } else {
                        const tgDocErr = await tgDocRes.text();
                        await devLog("TG_DELIVERY_FAIL_DOC", tgDocErr);
                        throw new Error("Telegram rejected URL via both endpoints.");
                    }
                }
            } catch (e) {
                await devLog("TG_DELIVERY_ERROR", e.message);
                console.error("Telegram Upload Error:", e);
            }
        }

        if (routeMode === 'local' || routeMode === 'both' || (routeMode === 'telegram' && !tgSuccess)) {
            btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving Local...</span>';
            await devLog("5. LOCAL_DOWNLOAD", "Attempting local device download...");

            try {
                const fileResponse = await fetch(targetUrl);
                if (!fileResponse.ok) throw new Error(`RapidAPI CDN HTTP ${fileResponse.status}`);
                const fileBlob = await fileResponse.blob();
                const localBlobUrl = window.URL.createObjectURL(fileBlob);
                const a = document.createElement('a');
                a.href = localBlobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(localBlobUrl);
            } catch (networkError) {
                await devLog("5.5 LOCAL_CORS_FALLBACK", `CORS block detected. Triggering native fallback.`);
                const a = document.createElement('a');
                a.href = targetUrl;
                a.download = filename;
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            
            if (routeMode === 'telegram' && !tgSuccess) {
                alert("Telegram delivery failed. File downloaded to device storage instead. Check Bot Token and Chat ID.");
            }
        }
        
        window.markTrackDownloaded(track.videoId);
        await devLog("6. COMPLETE", "MP3 routing and delivery finished successfully.");
        document.getElementById('track-options-modal').classList.remove('active');
        
    } catch (error) {
        console.error("Extraction Error:", error);
        await devLog("FATAL_CRASH", `Name: ${error.name}\nMessage: ${error.message}`);
        alert("Download failed. Check Telegram dev logs.");
    } finally {
        btnElement.innerHTML = originalHTML;
        btnElement.style.pointerEvents = 'auto';
    }
};

document.getElementById('opt-download-track')?.addEventListener('click', (e) => {
    if (window.OCTAVE && window.OCTAVE.activeTrackForOptions && window.downloadTrack) {
        window.downloadTrack(window.OCTAVE.activeTrackForOptions, e.currentTarget);
    }
});

document.getElementById('start-yt-import')?.addEventListener('click', async () => {
    const urlInput = document.getElementById('yt-playlist-url');
    if (!urlInput || !window.OCTAVE) return;
    const urlValue = urlInput.value.trim();
    if (!urlValue) return;
    let playlistId = '';
    try {
        const urlObj = new URL(urlValue);
        playlistId = urlObj.searchParams.get('list');
    } catch (e) {
        if (urlValue.startsWith('PL') && urlValue.length > 15) {
            playlistId = urlValue;
        }
    }
    if (!playlistId) {
        alert("Invalid URL.");
        return;
    }
    const btn = document.getElementById('start-yt-import');
    if (!btn) return;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    let success = false;
    for (let i = 0; i < window.INVIDIOUS.length; i++) {
        const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const r = await fetch(`${base}/api/v1/playlists/${playlistId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (r.ok) {
                const data = await r.json();
                if (data.videos && data.videos.length > 0) {
                    let finalName = data.title || "Imported";
                    let count = 1;
                    while (window.OCTAVE.playlists[finalName]) {
                        finalName = `${data.title} (${count})`;
                        count++;
                    }
                    window.OCTAVE.playlists[finalName] = data.videos.map(v => ({
                        videoId: v.videoId,
                        title: v.title,
                        author: v.author,
                        thumb: (v.videoThumbnails && v.videoThumbnails.length > 0) ? v.videoThumbnails[0].url : ''
                    }));
                    window.saveCache();
                    success = true;
                    alert(`Imported ${data.videos.length} tracks!`);
                    document.getElementById('yt-import-modal').classList.remove('active');
                    urlInput.value = '';
                    if(window.renderHome) window.renderHome();
                    break;
                }
            }
        } catch (e) {
            continue;
        }
    }
    if (!success) alert("Failed.");
    btn.innerHTML = 'Import';
    btn.disabled = false;
});

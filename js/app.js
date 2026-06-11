// ============================================================
// app.js — Octave Full Flagship Engine
// 100% Complete File - Search Typo Fixed
// ============================================================

(function() {
    const clearSplash = () => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
            setTimeout(() => splash.remove(), 300);
        }
    };
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

window.renderArtistPage = async (artistName) => {
    document.getElementById('full-player').classList.remove('active');
    document.getElementById('fp-overlay-panel').classList.remove('active');
    const dynamicView = document.getElementById('dynamic-view');
    if (!dynamicView) return;
    dynamicView.innerHTML = '<div style="padding: 100px 20px; text-align:center;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 40px; color: var(--accent);"></i></div>';

    const profile = await window.fetchFullArtistProfile(artistName);
    let tracksHTML = '';
    if (profile.tracks.length > 0) {
        profile.tracks.forEach((track, index) => {
            tracksHTML += `
                <div class="artist-track-item" style="display: flex; align-items: center; gap: 14px; padding: 12px; background: var(--bg-surface); border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
                    <img src="${window.getSafeThumb(track)}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${window.escapeHTML(track.title)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${window.escapeHTML(track.author)}</div>
                    </div>
                    <button class="icon-btn" style="color: var(--accent);"><i class="fa-solid fa-play"></i></button>
                </div>
            `;
        });
    } else {
        tracksHTML = '<div class="empty-state-text">No tracks found.</div>';
    }

    const bannerStyle = profile.banner ? `background-image: url('${profile.banner}'); background-size: cover; background-position: center;` : `background: linear-gradient(135deg, var(--bg-deep), var(--glass-bg));`;

    dynamicView.innerHTML = `
        <div style="position: relative; width: 100%; height: 250px; ${bannerStyle}">
            <div style="position: absolute; inset: 0; background: linear-gradient(0deg, var(--bg-deep) 0%, transparent 100%);"></div>
            <button class="icon-btn" onclick="const ht = document.querySelector('.nav-item[data-tab=\\'home\\']'); if(ht) ht.click();" style="position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.5); border-radius: 50%; padding: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-arrow-left"></i></button>
            <div style="position: absolute; bottom: 20px; left: 20px;">
                <h1 style="font-size: 32px; font-weight: 800; text-shadow: 0 4px 10px rgba(0,0,0,0.8); margin:0;">${window.escapeHTML(profile.name)}</h1>
            </div>
        </div>
        <div style="padding: 20px;">
            <div style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 16px; border-radius: 12px;">${window.escapeHTML(profile.bio)}</div>
            <h2 class="section-title" style="margin-bottom: 16px;">Top Tracks</h2>
            <div class="vertical-list" id="artist-tracks-list">${tracksHTML}</div>
        </div>
        <div class="bottom-spacer"></div>
    `;

    if (profile.tracks.length > 0) {
        document.querySelectorAll('.artist-track-item').forEach((node, idx) => {
            node.addEventListener('click', () => {
                window.OCTAVE.queue =[...profile.tracks];
                window.playTrackByIndex(idx);
            });
        });
    }
};

document.getElementById('fp-artist')?.addEventListener('click', () => {
    if (window.OCTAVE && window.OCTAVE.currentIndex >= 0) window.renderArtistPage(window.OCTAVE.queue[window.OCTAVE.currentIndex].author);
});

document.getElementById('fp-queue-btn')?.addEventListener('click', () => {
    if (!window.OCTAVE || window.OCTAVE.currentIndex < 0) return;
    if (fpTitle) fpTitle.innerText = 'Up Next';
    if (fpContent) fpContent.innerHTML = '';
    if (fpPanel) fpPanel.classList.add('active');
    const q = window.OCTAVE.queue;
    for (let i = window.OCTAVE.currentIndex; i < q.length; i++) {
        const track = q[i];
        const isPlaying = i === window.OCTAVE.currentIndex;
        const el = document.createElement('div');
        el.style.cssText = `display: flex; align-items: center; gap: 14px; padding: 12px; background: ${isPlaying ? 'rgba(30,215,96,0.1)' : 'var(--bg-surface)'}; border-radius: 8px; margin-bottom: 12px; border: ${isPlaying ? '1px solid var(--accent)' : '1px solid transparent'};`;
        el.innerHTML = `
            <img src="${window.getSafeThumb(track)}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 600; color: ${isPlaying ? 'var(--accent)' : 'var(--text-primary)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.escapeHTML(track.title)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${window.escapeHTML(track.author)}</div>
            </div>
            ${isPlaying ? '<i class="fa-solid fa-volume-high" style="color: var(--accent);"></i>' : ''}
        `;
        if (fpContent) fpContent.appendChild(el);
    }
});

document.getElementById('opt-sleep-timer')?.addEventListener('click', () => {
    document.getElementById('track-options-modal').classList.remove('active');
    document.getElementById('timer-modal').classList.add('active');
});

document.getElementById('close-timer')?.addEventListener('click', () => document.getElementById('timer-modal').classList.remove('active'));

if (document.getElementById('fp-options')) {
    document.getElementById('fp-options').addEventListener('click', () => {
        if (window.OCTAVE && window.OCTAVE.currentIndex >= 0) {
            window.openTrackOptions(window.OCTAVE.queue[window.OCTAVE.currentIndex]);
        }
    });
}

window.renderPlaylistDetail = (plName) => {
    const dynamicView = document.getElementById('dynamic-view');
    if (!dynamicView || !window.OCTAVE) return;
    const tracks = window.OCTAVE.playlists[plName] ||[];
    let html = `
        <div style="padding: 20px;">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; margin-top: 10px;">
                <button class="icon-btn" onclick="const ht = document.querySelector('.nav-item[data-tab=\\'home\\']'); if(ht) ht.click();"><i class="fa-solid fa-arrow-left"></i></button>
                <h1 style="font-size: 24px; font-weight: 700; margin: 0;">${window.escapeHTML(plName)}</h1>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <button class="btn-primary" style="flex: 1;" onclick="window.playPlaylist('${window.escapeHTML(plName)}')"><i class="fa-solid fa-play"></i> Play</button>
                <button class="btn-secondary" style="flex: 1;" onclick="if(window.smartShufflePlaylist) window.smartShufflePlaylist('${window.escapeHTML(plName)}')"><i class="fa-solid fa-shuffle"></i> Shuffle</button>
                <button class="icon-btn" style="color: #ff4444; width: 44px; background: var(--bg-surface); border-radius: 12px;" onclick="window.deletePlaylist('${window.escapeHTML(plName)}')"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="vertical-list">
    `;
    if (tracks.length === 0) {
        html += `<div class="empty-state-text">Playlist is empty.</div>`;
    } else {
        tracks.forEach((track, idx) => {
            html += `
                <div class="list-item" style="position: relative;">
                    <img src="${window.getSafeThumb(track)}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;" onclick="window.OCTAVE.queue =[...window.OCTAVE.playlists['${window.escapeHTML(plName)}']]; window.playTrackByIndex(${idx});">
                    <div class="list-info" style="cursor: pointer;" onclick="window.OCTAVE.queue =[...window.OCTAVE.playlists['${window.escapeHTML(plName)}']]; window.playTrackByIndex(${idx});">
                        <div class="list-title">${window.escapeHTML(track.title)}</div>
                        <div class="list-subtitle">${window.escapeHTML(track.author)}</div>
                    </div>
                    <button class="icon-btn" style="color: var(--text-secondary); position: absolute; right: 0; padding: 10px;" onclick="window.removeFromPlaylist('${window.escapeHTML(plName)}', ${idx})"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `;
        });
    }
    html += `</div></div><div class="bottom-spacer"></div>`;
    dynamicView.innerHTML = html;
};

window.renderLikedSongs = () => {
    const dynamicView = document.getElementById('dynamic-view');
    if (!dynamicView || !window.OCTAVE) return;
    const tracks = Object.values(window.OCTAVE.liked);
    let html = `
        <div style="padding: 20px;">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; margin-top: 10px;">
                <button class="icon-btn" onclick="const ht = document.querySelector('.nav-item[data-tab=\\'home\\']'); if(ht) ht.click();"><i class="fa-solid fa-arrow-left"></i></button>
                <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Liked Songs</h1>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <button class="btn-primary" style="flex: 1;" onclick="window.OCTAVE.queue = Object.values(window.OCTAVE.liked); window.playTrackByIndex(0);"><i class="fa-solid fa-play"></i> Play</button>
            </div>
            <div class="vertical-list">
    `;
    if (tracks.length === 0) {
        html += `<div class="empty-state-text">No liked songs yet.</div>`;
    } else {
        tracks.forEach((track, idx) => {
            html += `
                <div class="list-item" style="position: relative;">
                    <img src="${window.getSafeThumb(track)}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;" onclick="window.playTrack(track)">
                    <div class="list-info" style="cursor: pointer;" onclick="window.playTrack(track)">
                        <div class="list-title">${window.escapeHTML(track.title)}</div>
                        <div class="list-subtitle">${window.escapeHTML(track.author)}</div>
                    </div>
                    <button class="icon-btn" style="color: var(--accent); position: absolute; right: 0; padding: 10px;" onclick="window.removeFromLiked('${track.videoId}')"><i class="fa-solid fa-heart"></i></button>
                </div>
            `;
        });
    }
    html += `</div></div><div class="bottom-spacer"></div>`;
    dynamicView.innerHTML = html;
};

window.renderHome = () => {
    if (!window.OCTAVE) return;
    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl = document.getElementById('time-greeting');
    if (greetEl) greetEl.textContent = greeting;

    const recentGrid = document.getElementById('home-recent-grid');
    const playlistsDiv = document.getElementById('home-playlists');
    if (!recentGrid || !playlistsDiv) return;

    if (window.OCTAVE.recentPlayed && window.OCTAVE.recentPlayed.length > 0) {
        recentGrid.innerHTML = '';
        window.OCTAVE.recentPlayed.forEach(track => {
            const el = document.createElement('div');
            el.className = 'square-card';
            el.innerHTML = `<div class="card-art shadow-heavy" style="background-image: url('${window.getSafeThumb(track)}'); background-size: cover;"></div><div class="card-title">${window.escapeHTML(track.title)}</div>`;
            el.addEventListener('click', () => window.playTrack(track));
            recentGrid.appendChild(el);
        });
    }

    if (window.fetchTrendingMusic) window.fetchTrendingMusic();

    const recsGrid = document.getElementById('home-recs-grid');
    if (recsGrid && window.OCTAVE.dailyRecs?.tracks && window.OCTAVE.dailyRecs.tracks.length > 0) {
        recsGrid.innerHTML = '';
        window.OCTAVE.dailyRecs.tracks.forEach(track => {
            const el = document.createElement('div'); el.className = 'square-card';
            el.innerHTML = `<div class="card-art shadow-heavy" style="background-image: url('${window.getSafeThumb(track)}'); background-size: cover;"></div><div class="card-title">${window.escapeHTML(track.title)}</div>`;
            el.addEventListener('click', () => window.playTrack(track));
            recsGrid.appendChild(el);
        });
    }

    if (window.fetchDailyRecommendations) window.fetchDailyRecommendations();

    const likedCount = window.OCTAVE.liked ? Object.keys(window.OCTAVE.liked).length : 0;
    
    playlistsDiv.innerHTML = `
        <div class="list-item" id="open-discover-mix" style="margin-bottom: 8px; cursor: pointer;">
            <div class="list-art shadow-heavy" style="background: linear-gradient(135deg, #8a2387, #e94057, #f27121); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff;"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <div class="list-info"><div class="list-title">Auto-DJ Discover Mix</div><div class="list-subtitle">Endless tracks based on taste</div></div>
        </div>
        <div class="list-item" id="open-ai-mix-large" style="margin-bottom: 8px; cursor: pointer;">
            <div class="list-art shadow-heavy" style="background: linear-gradient(135deg, #00c6ff, #0072ff); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff;"><i class="fa-solid fa-robot"></i></div>
            <div class="list-info"><div class="list-title">AI Custom Mix</div><div class="list-subtitle">Describe a vibe, AI builds it</div></div>
        </div>
        <div class="list-item" id="open-liked-songs" style="cursor: pointer;">
            <div class="list-art shadow-heavy" style="background: linear-gradient(135deg, var(--accent), #0b5c26); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff;"><i class="fa-solid fa-heart"></i></div>
            <div class="list-info"><div class="list-title">Liked Songs</div><div class="list-subtitle">${likedCount} tracks saved</div></div>
        </div>
    `;

    if (window.OCTAVE.playlists) {
        Object.keys(window.OCTAVE.playlists).reverse().forEach(plName => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.cursor = 'pointer';
            el.innerHTML = `
                <div class="list-art shadow-heavy" style="background: #2a2d36; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--text-secondary);">
                    <i class="fa-solid fa-list"></i>
                </div>
                <div class="list-info">
                    <div class="list-title">${window.escapeHTML(plName)}</div>
                    <div class="list-subtitle">${window.OCTAVE.playlists[plName].length} tracks</div>
                </div>
                <button class="icon-btn"><i class="fa-solid fa-chevron-right"></i></button>
            `;
            
            el.addEventListener('click', () => window.renderPlaylistDetail(plName));
            playlistsDiv.appendChild(el);
        });
    }
};

function renderLibrary() {
    const lib = document.getElementById('lib-playlists');
    if (!lib || !window.OCTAVE || !window.OCTAVE.playlists) return;
    lib.innerHTML = Object.keys(window.OCTAVE.playlists).length > 0 ? '' : '<div class="empty-state-text">Create or import a playlist.</div>';
    Object.keys(window.OCTAVE.playlists).forEach(plName => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.style.cursor = 'pointer';
        el.innerHTML = `
            <div class="list-art shadow-heavy" style="background: #2a2d36; display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--text-secondary);">
                <i class="fa-solid fa-list"></i>
            </div>
            <div class="list-info">
                <div class="list-title">${window.escapeHTML(plName)}</div>
                <div class="list-subtitle">${window.OCTAVE.playlists[plName].length} tracks</div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: var(--text-secondary);"></i>
        `;
        
        el.addEventListener('click', () => window.renderPlaylistDetail(plName));
        lib.appendChild(el);
    });
}

window.renderRecentSearches = () => {
    const recentList = document.getElementById('search-recent-list');
    if (!recentList || !window.OCTAVE) return;

    if (window.OCTAVE.recentSearches && window.OCTAVE.recentSearches.length > 0) {
        recentList.innerHTML = '';
        window.OCTAVE.recentSearches.forEach(track => {
            const el = document.createElement('div'); 
            el.className = 'list-item';
            el.innerHTML = `
                <img src="${window.getSafeThumb(track)}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover; cursor: pointer;">
                <div class="list-info" style="cursor: pointer;">
                    <div class="list-title">${window.escapeHTML(track.title)}</div>
                    <div class="list-subtitle">${window.escapeHTML(track.author)}</div>
                </div>
            `;
            el.addEventListener('click', () => window.playTrack(track));
            recentList.appendChild(el);
        });
    } else {
        recentList.innerHTML = '<div class="empty-state-text" style="padding-top: 10px;">No recent searches yet.</div>';
    }
};

window.performSearch = async (query) => {
    for (let i = 0; i < window.INVIDIOUS.length; i++) {
        const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length]; // FIXED TYPO HERE
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        try {
            const r = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,videoThumbnails,lengthSeconds`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!r.ok) continue;
            const d = await r.json();
            window.invIdx = (window.invIdx + i) % window.INVIDIOUS.length;
            return d.filter(item => item.lengthSeconds && item.lengthSeconds < 600).map(item => ({
                videoId: item.videoId,
                title: item.title,
                author: item.author,
                thumb: (item.videoThumbnails && item.videoThumbnails.length > 0) ? item.videoThumbnails[0].url : ''
            }));
        } catch (e) {
            continue;
        }
    }
    return[];
};

window.setSleepTimer = (minutes) => {
    if (sleepTimerId) clearTimeout(sleepTimerId);
    if (minutes === 0) {
        alert('Sleep timer cancelled');
        document.getElementById('timer-modal')?.classList.remove('active');
        return;
    }
    alert(`Sleep timer set Audio will pause in ${minutes} minutes`);
    document.getElementById('timer-modal')?.classList.remove('active');
    sleepTimerId = setTimeout(() => {
        if (window.OCTAVE.isPlaying) window.togglePlay();
    }, minutes * 60000);
};

window.fetchLyrics = async (artist, title) => {
    const cleanTitle = title
        .replace(/[\(\[【].*?[\)\]】]/g, '')
        .replace(/(feat\.|ft\.|remix|official|video|music video|lyric|audio|live).*/gi, '')
        .replace(/["']/g, '')
        .trim();

    const cleanArtist = artist
        .replace(/ - Topic/gi, '')
        .replace(/VEVO/gi, '')
        .split(/,|&| ft\.| feat\.| x | with /i)[0]
        .trim();

    try {
        const query = `${cleanArtist} ${cleanTitle}`;
        const r1 = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
        if (r1.ok) {
            const data = await r1.json();
            if (data && data.length > 0) {
                const bestMatch = data.find(item =>
                    item.trackName.toLowerCase().includes(cleanTitle.toLowerCase())
                ) || data[0];

                const rawLyrics = bestMatch.syncedLyrics || bestMatch.plainLyrics || "";
                if (rawLyrics) {
                    const cleanLines = rawLyrics
                        .replace(/\[\d+:\d+\.\d+\]/g, '')
                        .split('\n')
                        .filter(l => l.trim() !== "");

                    let html = `<div style="padding: 20px 0 160px 0; font-family: '${window.OCTAVE.selectedFont}', sans-serif; display: flex; flex-direction: column; gap: 16px;">`;
                    cleanLines.forEach(line => {
                        html += `<div class="lyric-line">${window.escapeHTML(line)}</div>`;
                    });
                    html += '</div>';
                    return html;
                }
            }
        }
    } catch (e) {}
    return `<div style="text-align:center; padding: 40px; color: var(--text-secondary);">Lyrics not found for this track.</div>`;
};

window.fetchFullArtistProfile = async (artist) => {
    const cleanArtist = artist
        .replace(/ - Topic/gi, '')
        .replace(/VEVO/gi, '')
        .split(/,|&| ft\.| feat\.| x | with /i)[0]
        .trim();
    
    if (window.OCTAVE.artistCache && window.OCTAVE.artistCache[cleanArtist]) {
        if (window.OCTAVE.artistCache[cleanArtist].bio !== "Artist biography not available.") {
            return window.OCTAVE.artistCache[cleanArtist];
        } else {
            delete window.OCTAVE.artistCache[cleanArtist];
        }
    }

    let profile = {
        name: cleanArtist,
        bio: "Artist biography not available.",
        banner: "",
        tracks:[]
    };

    try {
        const r1 = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(cleanArtist)}`);
        if (r1.ok) {
            const data = await r1.json();
            if (data.artists && data.artists[0]) {
                const art = data.artists[0];
                if (art.strBiographyEN) profile.bio = art.strBiographyEN.substring(0, 1000) + "...";
                if (art.strArtistFanart) profile.banner = art.strArtistFanart;
                else if (art.strArtistThumb) profile.banner = art.strArtistThumb;
            }
        }
    } catch (e) {}
    
    if (profile.bio === "Artist biography not available.") {
        try {
            const w1 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanArtist)}`);
            if (w1.ok) {
                const d1 = await w1.json();
                if (d1.extract && !d1.extract.includes("may refer to")) {
                    profile.bio = d1.extract;
                }
            }
            
            if (profile.bio === "Artist biography not available.") {
                const w2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(cleanArtist)}&origin=*`);
                if (w2.ok) {
                    const d2 = await w2.json();
                    const pages = d2.query.pages;
                    const pageId = Object.keys(pages)[0];
                    if (pageId !== "-1" && pages[pageId].extract && !pages[pageId].extract.includes("may refer to")) {
                        profile.bio = pages[pageId].extract;
                    }
                }
            }
        } catch (e) {}
    }

    for (let i = 0; i < window.INVIDIOUS.length; i++) {
        const base = window.INVIDIOUS[(window.invIdx + i) % window.INVIDIOUS.length];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        try {
            const r3 = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(cleanArtist)}&type=video&sort_by=view_count&fields=videoId,title,author,videoThumbnails,lengthSeconds`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (r3.ok) {
                const d = await r3.json();
                if (d && d.length > 0) {
                    profile.tracks = d.filter(item => item.lengthSeconds && item.lengthSeconds < 600).slice(0, 10).map(item => ({
                        videoId: item.videoId,
                        title: item.title,
                        author: item.author,
                        thumb: (item.videoThumbnails && item.videoThumbnails.length > 0) ? item.videoThumbnails[0].url : ''
                    }));
                    window.invIdx = (window.invIdx + i) % window.INVIDIOUS.length;
                    break;
                }
            }
        } catch (e) {
            continue;
        }
    }
    
    if (!window.OCTAVE.artistCache) window.OCTAVE.artistCache = {};
    window.OCTAVE.artistCache[cleanArtist] = profile;
    window.saveCache();

    return profile;
};

document.addEventListener('DOMContentLoaded', () => {
    
    if (window.OCTAVE.currentIndex === -1 && window.OCTAVE.recentPlayed.length > 0) {
        window.OCTAVE.queue =[window.OCTAVE.recentPlayed[0]];
        window.OCTAVE.currentIndex = 0;
        window.saveCache();
    }

    if (window.OCTAVE.currentIndex >= 0 && window.OCTAVE.queue.length > 0) {
        const track = window.OCTAVE.queue[window.OCTAVE.currentIndex];
        updatePlayerUI(track);
        updateMediaSession(track); 
    }

    document.querySelector('.mini-player')?.addEventListener('click', (e) => {
        const rect = document.querySelector('.mini-player').getBoundingClientRect();
        if (e.clientY - rect.top <= 10) {
            e.stopPropagation();
            seekToPosition(e, document.querySelector('.mini-player'), true);
        } else {
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
});

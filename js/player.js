// Preserving Velvet Core Logic
const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacyredirect.com',
  'https://invidious.nerdvpn.de',
  'https://iv.melmac.space',
  'https://invidious.io.lol',
  'https://yt.cdaut.de'
];
let invIdx = 0;
const inv = () => INVIDIOUS[invIdx % INVIDIOUS.length];

const S = {
  queue: [], recent: [], liked: new Set(), banned: new Set(),
  scores: {}, playCount: {}, currentIndex: -1, isPlaying: false,
  volume: 85, duration: 0, currentTime: 0
};

let YTP = null;
let ytReady = false;

// Inject YouTube API
const script = document.createElement('script');
script.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(script);

window.onYouTubeIframeAPIReady = () => {
    const container = document.createElement('div');
    container.id = 'yt-hidden-frame';
    container.style.position = 'fixed';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.bottom = '0';
    container.style.right = '0';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    YTP = new YT.Player('yt-hidden-frame', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
            onReady: e => { ytReady = true; e.target.setVolume(S.volume); },
            onStateChange: onYTS
        }
    });
};

function onYTS(e) {
    const playBtnIcon = document.querySelector('.play-btn-mini i');
    if (!playBtnIcon) return;
    
    if (e.data === YT.PlayerState.PLAYING) {
        S.isPlaying = true;
        playBtnIcon.className = 'fa-solid fa-pause';
    } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
        S.isPlaying = false;
        playBtnIcon.className = 'fa-solid fa-play';
    }
}

// Mini Player Controls
document.querySelector('.play-btn-mini').addEventListener('click', () => {
    if (!YTP) return;
    S.isPlaying ? YTP.pauseVideo() : YTP.playVideo();
});

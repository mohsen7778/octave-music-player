# Octave — Private Music Player

A fully private Spotify alternative that runs entirely in your browser with zero backend.

## Preview

![Screenshot 1](./screenshot/screenshot1.jpg)
![Screenshot 2](./screenshot/screenshot2.jpg)

👉 Live Demo: https://mohsen7778.github.io/octavemusicapp/

This link is provided as a demo. Do not rely on it for personal usage. Deploy your own instance for best performance.

---

## What is Octave

Octave is a high performance client side music player that connects directly to public audio APIs.

No login. No backend. No tracking.

Everything including your playlists liked songs and history is stored locally in your browser. Nothing is sent to any server controlled by this project.

---

## Features

- Fully client side architecture  
- No backend required  
- Privacy focused design  
- Smart shuffle based on listening behavior  
- Sleep timer support  
- Local storage based data system  
- Public API integration for audio lyrics and artist info  
- Clean mobile first UI  

---

## How it works

Octave acts as a client interface between you and public APIs.

User Input  
↓  
Octave Client  
↓  
Search → Invidious API  
Playback → YouTube IFrame API  
Lyrics → LRCLIB  
Artist Info → TheAudioDB and Wikipedia  
Storage → Browser localStorage  

No data is stored on any server owned by this project.

---

## Deploy Your Own

You should deploy your own instance for stable performance.

### GitHub Pages
1. Fork the repository  
2. Go to Settings → Pages  
3. Select branch and save  

### Cloudflare Pages
1. Go to pages.cloudflare.com  
2. Connect your repository  
3. Deploy with default settings  

### Netlify
Connect repository and deploy without build configuration.

---

## Legal Notice

This project is provided for educational and personal use.

You are allowed to use modify and deploy this project for non commercial purposes only.

You are not allowed to sell resell sublicense or use this project or any modified version of it for commercial gain without explicit permission from the author.

This project does not host store or distribute any media. All content is fetched from third party public APIs.

The developer has no control over external content and is not responsible for any copyright issues or service interruptions.

By using or deploying this project you accept full responsibility for compliance with applicable laws and third party terms.

This software is provided as is without any warranty.

---

## Support

Telegram: https://t.me/ucvezw

---

If you like this project, consider giving it a star.

# Octave — Private Music Player

A fully private Spotify alternative that runs entirely in your browser with zero backend.

<p align="center">
  <img src="./screenshot/screenshot1.jpg" width="45%">
  <img src="./screenshot/screenshot2.jpg" width="45%">
</p>

👉 Live Demo: https://mohsen7778.github.io/octavemusicapp/

This link is provided as a demo. Do not rely on it for personal usage. Deploy your own instance for best performance.

---

## Why Octave

Most music apps are heavy slow and track everything.

Octave is different.

- No account required  
- No tracking  
- No backend  
- No data collection  

Everything runs directly in your browser and stays on your device.

---

## What is Octave

Octave is a high performance client side music player that connects to public audio APIs in real time.

It does not store or host any media.

All user data including playlists liked songs history and preferences are stored locally using browser storage.

This means:
- Full control over your data  
- No external servers involved  
- No privacy concerns  

---

## Core Features

### Privacy First
No analytics no telemetry no hidden tracking. Your data never leaves your device.

### Fully Client Side
No servers no database no authentication system. Pure frontend architecture.

### Smart Music Engine
- Intelligent shuffle based on listening patterns  
- Auto generated recommendations  
- Continuous playback system


## Background Playback

Octave supports reliable background playback in Brave Browser.
Most mobile browsers pause audio when the tab is not active. Brave handles background audio correctly.
If background listening matters to you, use Brave Browser.

### Modern UI
- Glassmorphism design  
- Dynamic background based on album art  
- Smooth animations and transitions  

### Local Data System
- Playlists stored locally  
- Export and import data as JSON  
- Persistent session memory  

### API Powered
Uses public APIs:
- Invidious for search and audio  
- YouTube IFrame API for playback  
- LRCLIB for lyrics  
- TheAudioDB and Wikipedia for artist data  

---

## How it works

Octave acts as a bridge between your browser and public APIs.
User Input ↓ Octave Client ↓ Search → Invidious API Playback → YouTube IFrame API Lyrics → LRCLIB Artist Info → TheAudioDB / Wikipedia Storage → Browser localStorage

No data is stored on any server owned by this project.

---

## Performance

- Lightweight and fast  
- No server latency  
- Runs entirely in browser  
- Optimized for mobile devices  

Performance depends on public API availability.

---

## Deploy Your Own

For best experience deploy your own instance.

### GitHub Pages
1. Fork this repository  
2. Go to Settings → Pages  
3. Select branch and save  

### Cloudflare Pages
1. Go to pages.cloudflare.com  
2. Connect your repository  
3. Deploy with default settings  

### Netlify
Connect repository and deploy without build configuration.

---

## Use Cases

- Personal private music player  
- Lightweight alternative to streaming apps  
- Learning project for frontend and APIs  
- Self hosted music interface  

---

## Limitations

- Depends on public APIs  
- No offline playback  
- Performance may vary based on API response  

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

If you like this project consider giving it a star.

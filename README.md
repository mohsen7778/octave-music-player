<div align="center">

# 🎵 Octave — Private Music Player

**A fully private, client-side Spotify alternative running entirely in your browser with zero backend.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Privacy: 100%](https://img.shields.io/badge/Privacy-100%25-success.svg)](#)
[![Backend: None](https://img.shields.io/badge/Backend-Zero-blue.svg)](#)
[![Deployment: Vercel/Pages](https://img.shields.io/badge/Deploy-Everywhere-000000.svg)](#)

<p align="center">
  <img src="./screenshot/screenshot1.jpg" width="45%" style="border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">
  <img src="./screenshot/screenshot2.jpg" width="45%" style="border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">
</p>

**👉 Live Demo:** [https://mohsen7778.github.io/octavemusicapp/](https://mohsen7778.github.io/octavemusicapp/)  
*(Note: This link is provided as a demo. Do not rely on it for personal usage. Deploy your own instance for the best performance.)*

</div>

---

## 🚀 Why Octave?

Most modern music streaming apps are heavy, slow, and track your every click. **Octave is different.**

🚫 **No accounts required** 🚫 **No tracking or analytics** 🚫 **No backend servers** 🚫 **No data collection** Everything runs directly in your browser's local environment, meaning your music habits stay 100% on your device.

---

## 🧠 What is Octave?

Octave is a high-performance, open-source web music player that connects to public audio APIs (like Invidious) in real-time. **It does not store or host any media.** All user data—including playlists, liked songs, history, and algorithm preferences—is stored locally using browser storage (`localStorage`). 

**What this means for you:**
- **Absolute Control:** Your data is yours. Export it, import it, or delete it instantly.
- **Zero Middlemen:** No external servers processing your behavior.
- **Uncompromised Privacy:** No ads, no telemetry, no corporate tracking.

---

## ✨ Core Features

### 🎧 Native Background Playback (Upgraded!)
Unlike most web apps that die when you minimize them, **Octave supports reliable background playback across Chrome, Safari, and Brave.** - Built with a raw HTML5 `<audio>` proxy engine.
- Bypasses traditional IFrame restrictions.
- Full lock-screen media controls (Media Session API) with album art integration.

### 🤖 Advanced Predictive Algorithm
We built a "Spotify-level" addiction engine that runs entirely on your phone:
- **10-Point Granular Tracking:** Learns from your skips (penalties), full completions, and manual selections.
- **Time-of-Day Context:** Remembers what you like in the morning vs. late at night.
- **Strict No-Repeat Blacklist:** Your session history ensures you never hear the same song twice in one sitting.
- **Auto-DJ & Discover Mix:** Generates continuous, hyper-personalized queues based on your highest-scoring local tracks.

### 🎨 Premium "Liquid" UI
- **Vibrant Liquid Shadows:** Album art colors are extracted via a 5x5 grid algorithm to cast dynamic, highly saturated, animated glowing shadows across the player.
- **Glassmorphism Design:** Modern, frosted-glass aesthetics with smooth CSS transitions.

### 📂 Your Local Data Vault
- Create, edit, and manage custom playlists.
- **Export/Import System:** Back up your entire "brain" (stats, likes, playlists) as a portable JSON file to move across devices.

### 🎤 Rich Meta Integration
- **Synced Static Lyrics:** Fetches lyrics in real-time with a custom typography picker to match your aesthetic.
- **Bulletproof Artist Bios:** Instantly loads artist history and top tracks using a dual-fallback system (TheAudioDB + aggressive Wikipedia API redirects), saved directly to your local cache for instant load times.

---

## ⚙️ How it Works

Octave acts as a silent, lightning-fast bridge between your browser and public decentralized APIs.

```text
User Input 
   ↓ 
Octave Client (Your Browser) 
   ↓ 
Search & Stream → Proxied HTML5 Audio via Invidious API
Lyrics          → LRCLIB API
Artist Info     → TheAudioDB / Wikipedia API
Memory          → Browser localStorage (The Data Vault)

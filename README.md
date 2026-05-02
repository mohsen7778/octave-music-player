<div align="center">

# Octave — Private Audio Engine

**A fully private, high-performance client-side music architecture running entirely in your browser with zero backend infrastructure.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Privacy: 100%](https://img.shields.io/badge/Privacy-100%25-success.svg)](#)
[![Backend: None](https://img.shields.io/badge/Backend-Zero-blue.svg)](#)
[![Frontend: Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla_JS-f7df1e.svg)](#)

<br>

<p align="center">
  <img src="./screenshot/screenshot1.jpg" width="45%" style="border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" alt="Octave Player Interface">
  &nbsp;&nbsp;
  <img src="./screenshot/screenshot2.jpg" width="45%" style="border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" alt="Octave Playlist View">
</p>

<br>

**Live Demo:** [https://mohsen7778.github.io/octavemusicapp/](https://mohsen7778.github.io/octavemusicapp/)  
*(This link is provided as a technological demonstration. Do not rely on it for permanent usage. Deploy your own static instance for optimal API performance.)*

</div>

<hr>

## Overview & Philosophy

Most modern streaming applications are heavy, latency-prone, and actively track user behavior. Octave is a serverless, vanilla web technology platform designed for zero-latency streaming and uncompromising user privacy. 

By operating strictly at the edge and acting as a bridge to public APIs, Octave delivers a premium audio experience without traditional backend bloat.

* **No Account Required:** Instant access with zero onboarding.
* **No Telemetry:** Zero behavioral tracking or analytics pinging external servers.
* **No Database:** 100% of user data is isolated to your device.
* **Self-Sovereign Data:** Complete export/import control over your listening history.

## Strict Requirement for Background Playback: Brave Browser

Mobile operating systems and browsers like Google Chrome or Safari natively restrict background media execution to preserve battery life. Because Octave is a pure client-side application without a dedicated backend server, Chrome **will aggressively pause** your music and kill the JavaScript stream-fetcher the moment your screen turns off.

To bypass this and achieve uninterrupted background playback with the screen locked, **you MUST use the Brave Browser**. 

Brave's native architecture respects media session threads and prevents the OS from freezing background JavaScript execution. Octave automatically detects Brave and routes audio through a highly optimized, instant-loading IFrame engine designed specifically to survive background throttling. If you want background play, Brave is strictly required.

## Core Features

### Predictive Local Algorithm
Octave features a 10-point behavioral tracking system that runs entirely client-side to build your taste profile:
* **Action Tracking:** Algorithm scores adjust dynamically based on immediate skips, full completions, and manual track selections.
* **Temporal Context:** Automatically analyzes listening habits by time of day (morning, afternoon, night).
* **Session Memory:** Ensures zero track repetition during an active listening session for a true "Auto-DJ" experience.

### Premium UI/UX Rendering
* **Dynamic Liquid Shadows:** Real-time canvas sampling extracts exact color values from album art to generate continuously flowing, color-matched ambient shadow DOM elements.
* **Glassmorphism Design:** Built with high-end, frosted-glass aesthetics, hardware-accelerated CSS transitions, and minimalist typography.

### Aggregated OSINT Integration
* **Synced Lyrics:** Real-time lyric fetching utilizing the LRCLIB API with a customizable typography engine.
* **Artist Biographies:** Utilizes a dual-fallback system (TheAudioDB + targeted Wikipedia API redirects) to pull accurate artist history, caching it locally for instant subsequent load times.

### Data Vault Protocol
* **Complete Ownership:** Export and import your entire ecosystem—listening history, local algorithmic stats, liked tracks, and custom playlists—via an encrypted JSON blob directly to your local file system.

## Deployment Guide

Octave is a purely static application. It requires zero build steps, node modules, or server configurations. It can be deployed in under 60 seconds.

**GitHub Pages**
1. Fork this repository.
2. Navigate to `Settings` > `Pages`.
3. Select the `main` branch and click save.

**Cloudflare Pages / Netlify / Vercel**
1. Connect your repository to your edge hosting provider.
2. Ensure `Framework Preset` is set to `None` or `Static`.
3. Clear any default build commands.
4. Set the publish directory to the root folder (`/`).
5. Deploy.

## Architecture Flow

Octave does not store or host any media. It acts entirely as a client-side interface connecting your browser to public APIs:

* **Search & Audio Stream:** Proxied via public Invidious instances.
* **Playback Control:** Forced IFrame Engine + Media Session API.
* **Lyrics:** LRCLIB API.
* **Artist Info:** TheAudioDB / Wikipedia API.
* **Storage Engine:** Browser `localStorage`.

## Legal Disclaimer & DMCA Compliance

This software is provided strictly for educational purposes and personal technological demonstration. 

* **No Content Hosting:** Octave does not host, store, upload, or distribute any copyrighted media files. 
* **No DRM Circumvention:** This application does not decrypt, rip, download, or permanently save proprietary audio streams. 
* **API Utilization:** The software acts solely as a client-side aggregator, executing standard HTTP requests to public, third-party APIs directly from the end-user's local IP address. 
* **Commercial Restriction:** You are allowed to use, modify, and deploy this project for non-commercial purposes only. You are strictly prohibited from selling, reselling, sublicensing, or monetizing this project or any modified version of it without explicit permission from the original author.
* **User Responsibility:** The creators and contributors of Octave hold no liability for how end-users utilize this client-side tool or what public APIs they connect to through their local network. By deploying or utilizing this software, you assume all responsibility for compliance with applicable laws and third-party terms of service.

## Support & Contact

For technical inquiries or project support, reach out via Telegram: [https://t.me/ucvezw](https://t.me/ucvezw)

<hr>

*If you found this architecture useful, consider starring the repository.*

# SpeakEasy

English speaking practice tool. Import any English content — text, subtitles, or Bilibili video links — then practice sentence by sentence with instant feedback.

## Features

- **Import anything**: Paste text, upload SRT/VTT subtitle files, or paste a Bilibili video link to auto-fetch English subtitles
- **Sentence deep practice**: Listen, write, and speak each sentence in any order — get word-by-word feedback after each action
- **Shadow reading**: Auto-play + auto-record loop for full-text shadowing practice, adjustable speed and manual/auto mode
- **Smart sentence splitting**: Handles punctuation, newline-separated, and raw text — auto-chunks long sentences by word count
- **Offline-ready**: All data stored in IndexedDB, no backend required

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in **Chrome** (required for speech recognition).

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Web Speech API (SpeechRecognition + SpeechSynthesis)
- Dexie.js (IndexedDB)
- Bilibili subtitle proxy (Vite dev proxy)

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Text import | ✅ | ✅ | ✅ | ✅ |
| TTS playback | ✅ | ✅ | ✅ | ✅ |
| Speech recognition | ✅ | ✅ | ⚠️ | ⚠️ |
| Shadow reading | ✅ | ✅ | ⚠️ | ⚠️ |

## Project Structure

```
src/
├── components/     # SentencePractice, ShadowMode, Layout
├── pages/          # HomePage, LibraryPage, PracticePage, ReportPage
├── utils/          # parser, diff, speech, storage, bilibili
└── types/          # TypeScript definitions
```

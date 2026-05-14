# SpeakEasy

Practice English with content you love — import subtitles, text, or Bilibili videos, then listen, write, and speak.

[中文版](README_CN.md)

## Features

- **Import anything**: Paste text, upload SRT/VTT files, or paste a Bilibili link to auto-fetch subtitles
- **Full-text listening**: Default view shows the complete text. Toggle blind mode to hide text and reveal a voice waveform on the progress bar
- **Translation**: View Chinese translation alongside the original — auto-fetch from Bilibili, AI translate via LLM, or paste your own
- **Sentence dictation**: Listen to each sentence and write it from memory, with word-by-word feedback
- **Shadow reading**: Auto-play + auto-record loop for immersive full-text practice, adjustable speed
- **Progress tracking**: Library shows your latest dictation and shadow scores per material
- **AI-powered**: Optional LLM integration for subtitle translation and mistake explanations (bring your own API key)
- **Offline-ready**: All data in IndexedDB. No backend required.

## Quick Start

```bash
npm install
npm run dev
```

Open in **Chrome** (speech recognition requires Chrome/Edge).

## How It Works

```
Import content → Material Library (with scores) → Full-text Listening
                                                      ├─ Blind mode + waveform
                                                      ├─ Translation
                                                      ├─ Sentence Dictation
                                                      └─ Shadow Reading
```

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (Warm Academic theme)
- Web Speech API (SpeechRecognition + SpeechSynthesis)
- Dexie.js (IndexedDB)
- OpenAI-compatible LLM (user-provided key)

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Text import / TTS | ✅ | ✅ | ✅ | ✅ |
| Speech recognition | ✅ | ✅ | ⚠️ | ⚠️ |
| Blind mode waveform | ✅ | ✅ | ✅ | ✅ |
| LLM features | ✅ | ✅ | ✅ | ✅ |

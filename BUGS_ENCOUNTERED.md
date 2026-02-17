# Bugs Encountered 🐛

This document outlines technical issues and bugs identified in the FluxDrop application, specifically focusing on the reported "double download" behavior and state management inconsistencies.

## 1. Redundant Audio Stream Download
- **Location**: `src/services/downloadService.ts` (Line 106)
- **Bug**: When a specific format (chip) is selected in the UI, the application appends `+bestaudio/best` to the `yt-dlp` format argument.
- **Effect**: If the selected format already contains audio (e.g., standard 720p/360p MP4s), `yt-dlp` is forced to download a separate best audio stream and merge it. This results in the audio being downloaded twice—once inside the video container and once as a standalone stream.

## 2. Multi-Phase Progress UI Misinterpretation
- **Location**: `src/renderer/renderer.ts` (Line 165)
- **Bug**: The progress bar logic does not differentiate between the video download phase and the audio download phase of `yt-dlp`.
- **Effect**: When downloading high-quality video, `yt-dlp` downloads the video file first (0-100%) and then the audio file (0-100%). The UI progress bar fills up to 100% and then resets to 0% for the second phase, giving the user the impression that the video is "downloading twice" when it is actually just downloading the components separately.

## 3. Persistent `selectedFormatId` State
- **Location**: `src/renderer/renderer.ts` (Line 22 & 44)
- **Bug**: The `selectedFormatId` variable is not cleared when a new URL is entered or when the quality dropdown is changed.
- **Effect**: If a user selects a specific quality chip for one video and then pastes a new URL, the app attempts to use the previous video's format ID for the new download. If the IDs don't match or the new video doesn't support that specific format, it may lead to errors or unintended format fallbacks.

## 4. MP3 Quality Mode Precedence
- **Location**: `src/services/downloadService.ts` (Line 104-107)
- **Bug**: The logic for checking `options.formatId` takes precedence over the check for `options.format === 'mp3'`.
- **Effect**: If a format chip was previously selected (setting `formatId`), and the user then switches to "Audio MP3" mode, the app will still try to download the video format associated with that `formatId` instead of extracting audio, resulting in an MP4 file being created when an MP3 was expected.

import { BrowserWindow, app } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';

export interface DownloadOptions {
    format: 'mp4' | 'mp3';
    quality: string;
}

export interface StructuredError {
    type: 'NETWORK_ERROR' | 'INVALID_URL' | 'UNAVAILABLE_VIDEO' | 'SYSTEM_ERROR' | 'UNKNOWN';
    message: string;
}

export class DownloadService {
    private isDownloading: boolean = false;

    async startDownload(win: BrowserWindow, url: string, options: DownloadOptions) {
        if (this.isDownloading) {
            this.sendError(win, {
                type: 'SYSTEM_ERROR',
                message: 'A download is already in progress.'
            });
            return;
        }

        if (!url) {
            this.sendError(win, {
                type: 'INVALID_URL',
                message: 'No URL provided.'
            });
            return;
        }

        this.isDownloading = true;
        const downloadPath = app.getPath('downloads');

        // Build arguments for yt-dlp
        const args = [
            '--newline',
            '--progress',
            '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
            '--output', path.join(downloadPath, '%(title)s.%(ext)s'),
            url
        ];

        if (options.format === 'mp3') {
            args.push('--extract-audio', '--audio-format', 'mp3');
        } else {
            // Video formats
            if (options.quality === '1080') {
                args.push('-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best');
            } else if (options.quality === '720') {
                args.push('-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best');
            } else {
                args.push('-f', 'bestvideo+bestaudio/best');
            }
            args.push('--merge-output-format', 'mp4');
        }

        const child = spawn('yt-dlp', args);

        child.stdout.on('data', (data) => {
            const line = data.toString().trim();
            this.parseProgress(win, line);
        });

        child.stderr.on('data', (data) => {
            const errorMsg = data.toString();
            console.error(`yt-dlp stderr: ${errorMsg}`);
            // We process errors in 'close' but log stderr for debugging
        });

        child.on('close', (code) => {
            this.isDownloading = false;
            if (code === 0) {
                win.webContents.send('download:status', {
                    status: 'Completed',
                    message: 'Download finished successfully.'
                });
            } else {
                this.sendError(win, {
                    type: 'UNKNOWN',
                    message: `Download failed with exit code ${code}. Check if URL is valid or yt-dlp is installed.`
                });
            }
        });

        child.on('error', (err: any) => {
            this.isDownloading = false;
            if (err.code === 'ENOENT') {
                this.sendError(win, {
                    type: 'SYSTEM_ERROR',
                    message: 'yt-dlp not found. Please ensure it is installed and in your system PATH.'
                });
            } else {
                this.sendError(win, {
                    type: 'UNKNOWN',
                    message: err.message || 'An unexpected error occurred.'
                });
            }
        });
    }

    private parseProgress(win: BrowserWindow, line: string) {
        // Expected template: 45.2%|1.2MiB/s|00:05
        const parts = line.split('|');
        if (parts.length === 3) {
            const percentageStr = parts[0]?.replace('%', '').trim();
            const percentage = parseFloat(percentageStr || '0');
            const speed = parts[1]?.trim() || '---';
            const eta = parts[2]?.trim() || '---';

            if (!isNaN(percentage)) {
                win.webContents.send('download:progress', {
                    percentage,
                    speed,
                    eta
                });
            }
        }
    }

    private sendError(win: BrowserWindow, error: StructuredError) {
        win.webContents.send('download:status', {
            status: 'Failed',
            type: error.type,
            message: error.message
        });
    }
}

export const downloadService = new DownloadService();

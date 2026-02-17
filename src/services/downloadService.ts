import { BrowserWindow } from 'electron';

export interface DownloadOptions {
    format: 'mp4' | 'mp3';
    quality: string;
}

export class DownloadService {
    private isDownloading: boolean = false;

    async startDownload(win: BrowserWindow, url: string, options: DownloadOptions) {
        if (this.isDownloading) {
            win.webContents.send('download:error', {
                type: 'ALREADY_DOWNLOADS',
                message: 'A download is already in progress.'
            });
            return;
        }

        this.isDownloading = true;

        // Mock download progress
        let percentage = 0;
        const interval = setInterval(() => {
            percentage += 5;

            win.webContents.send('download:progress', {
                percentage: percentage,
                speed: '1.2 MB/s',
                eta: '00:05'
            });

            if (percentage >= 100) {
                clearInterval(interval);
                this.isDownloading = false;
                win.webContents.send('download:status', {
                    status: 'Completed',
                    message: 'Mock download finished successfully.'
                });
            }
        }, 200);
    }
}

export const downloadService = new DownloadService();

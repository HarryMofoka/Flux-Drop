import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    windowControl: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close'),
    },
    download: {
        start: (url: string, options: any) => ipcRenderer.send('download-start', { url, options }),
        onProgress: (callback: (data: any) => void) => ipcRenderer.on('download-progress', (_event, value) => callback(value)),
        onStatus: (callback: (data: any) => void) => ipcRenderer.on('download-status', (_event, value) => callback(value)),
    }
});

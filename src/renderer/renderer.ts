const urlInput = document.getElementById('url-input') as HTMLInputElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const formatBtns = document.querySelectorAll('.selector-btn');
const progressArea = document.getElementById('progress-area');
const progressBar = document.getElementById('progress-bar');
const percentageText = document.getElementById('percentage-text');
const speedText = document.getElementById('speed-text');
const etaText = document.getElementById('eta-text');
const statusText = document.getElementById('status-text');
const notification = document.getElementById('notification');
const qualityDropdown = document.getElementById('quality-dropdown') as HTMLSelectElement;

let selectedFormat = 'mp4';

// Window Controls
document.getElementById('min-btn')?.addEventListener('click', () => (window as any).api.windowControl.minimize());
document.getElementById('max-btn')?.addEventListener('click', () => (window as any).api.windowControl.maximize());
document.getElementById('close-btn')?.addEventListener('click', () => (window as any).api.windowControl.close());

// Format Selector
formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = (btn as HTMLElement).dataset.value || 'mp4';
    });
});

// Download Action
downloadBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }

    setUIState(true);

    (window as any).api.download.start(url, {
        format: selectedFormat,
        quality: qualityDropdown.value
    });
});

// Cancel Action
cancelBtn?.addEventListener('click', () => {
    (window as any).api.download.cancel();
});

function setUIState(isDownloading: boolean) {
    if (isDownloading) {
        progressArea?.classList.remove('hidden');
        downloadBtn.disabled = true;
        urlInput.disabled = true;
        qualityDropdown.disabled = true;
        formatBtns.forEach(btn => (btn as HTMLButtonElement).disabled = true);
        downloadBtn.style.opacity = '0.5';
    } else {
        downloadBtn.disabled = false;
        urlInput.disabled = false;
        qualityDropdown.disabled = false;
        formatBtns.forEach(btn => (btn as HTMLButtonElement).disabled = false);
        downloadBtn.style.opacity = '1';
    }
}

// Download Progress Updates
(window as any).api.download.onProgress((data: any) => {
    if (progressBar) progressBar.style.width = `${data.percentage}%`;
    if (percentageText) percentageText.innerText = `${Math.round(data.percentage)}%`;
    if (speedText) speedText.innerText = data.speed;
    if (etaText) etaText.innerText = `ETA: ${data.eta}`;
});

(window as any).api.download.onStatus((data: any) => {
    if (statusText) statusText.innerText = data.status;

    if (data.status === 'Completed' || data.status === 'Failed' || data.status === 'Cancelled') {
        setUIState(false);
        showNotification(data.message || `Download ${data.status.toLowerCase()}`, data.status === 'Completed' ? 'success' : 'error');

        if (data.status === 'Completed') {
            setTimeout(() => {
                if (!urlInput.disabled) { // Only hide if we haven't started another one
                    progressArea?.classList.add('hidden');
                }
            }, 5000);
        }
    }
});

function showNotification(message: string, type: 'success' | 'error') {
    if (!notification) return;
    notification.innerText = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4000);
}

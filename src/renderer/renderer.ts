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

// Preview Elements
const videoPreview = document.getElementById('video-preview');
const videoThumbnail = document.getElementById('video-thumbnail') as HTMLImageElement;
const videoTitle = document.getElementById('video-title');
const videoUploader = document.getElementById('video-uploader');
const formatList = document.getElementById('format-list');

let selectedFormat = 'mp4';
let selectedFormatId: string | null = null;
let fetchTimeout: any = null;

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

        // Reset selected format ID when switching between mp4/mp3
        selectedFormatId = null;
        updateFormatChips();
    });
});

// URL Input Monitoring (Debounced)
urlInput.addEventListener('input', () => {
    const url = urlInput.value.trim();
    if (fetchTimeout) clearTimeout(fetchTimeout);

    if (!url || !url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
        videoPreview?.classList.add('hidden');
        return;
    }

    fetchTimeout = setTimeout(fetchVideoMetadata, 800);
});

async function fetchVideoMetadata() {
    const url = urlInput.value.trim();
    if (!url) return;

    try {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.5';

        const info = await (window as any).api.video.getInfo(url);

        if (info) {
            displayVideoInfo(info);
        }
    } catch (error) {
        console.error('Failed to fetch metadata:', error);
        showNotification('Invalid video URL or network issue', 'error');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
    }
}

function displayVideoInfo(info: any) {
    if (!videoPreview || !videoThumbnail || !videoTitle || !videoUploader || !formatList) return;

    videoThumbnail.src = info.thumbnail;
    videoTitle.innerText = info.title;
    videoUploader.innerText = info.uploader;

    // Store formats and render them
    renderFormatChips(info.formats);

    videoPreview.classList.remove('hidden');
}

function getQualityLabel(resolution: string): string {
    if (resolution.includes('2160') || resolution.toLowerCase().includes('4k')) return '4K Ultra HD';
    if (resolution.includes('1440') || resolution.toLowerCase().includes('2k')) return '1440p 2K QHD';
    if (resolution.includes('1080')) return '1080p Full HD';
    if (resolution.includes('720')) return '720p HD';
    if (resolution.includes('480')) return '480p SD';
    if (resolution.includes('360')) return '360p';
    if (resolution === 'audio') return 'Audio Only';
    return resolution;
}

function renderFormatChips(formats: any[]) {
    if (!formatList) return;
    formatList.innerHTML = '';

    // Group and filter formats to keep it clean
    const filteredFormats = formats
        .filter(f => selectedFormat === 'mp3' ? f.resolution === 'audio' : f.resolution !== 'audio')
        .slice(0, 15); // Show a few more options

    filteredFormats.forEach(f => {
        const chip = document.createElement('div');
        chip.className = 'format-chip';
        const size = f.filesize ? `(${(f.filesize / 1024 / 1024).toFixed(1)}MB)` : '';
        const qualityLabel = getQualityLabel(f.resolution);
        chip.innerText = `${qualityLabel} - ${f.ext} ${size}`;
        chip.dataset.id = f.id;

        chip.addEventListener('click', () => {
            document.querySelectorAll('.format-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedFormatId = f.id;
        });

        formatList.appendChild(chip);
    });
}

function updateFormatChips() {
    // If we have video info, re-render chips based on new format (mp4/mp3)
    // This is a bit tricky without storing the full info, but for now let's just 
    // re-trigger fetch if needed or handle simple cases.
    // Simplifying: chips will refresh if user clicks "Fetch" or we store metadata.
}

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
        quality: qualityDropdown.value,
        formatId: selectedFormatId
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

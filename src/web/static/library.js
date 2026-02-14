// Library page — URL/text submission + status polling

const urlInput = document.getElementById('url-input');
const addUrlBtn = document.getElementById('add-url-btn');

// Submit URL on Enter
urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitUrl();
    }
});

async function submitUrl() {
    const url = urlInput.value.trim();
    if (!url) return;

    addUrlBtn.disabled = true;
    addUrlBtn.textContent = 'Adding...';

    try {
        const response = await fetch('/library/submit-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        const data = await response.json();

        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            urlInput.value = '';
            // Reload page to show new item
            window.location.reload();
        }
    } catch (err) {
        alert('Failed to submit URL: ' + err.message);
    } finally {
        addUrlBtn.disabled = false;
        addUrlBtn.textContent = 'Add';
    }
}

async function submitText() {
    const text = document.getElementById('text-content').value.trim();
    const title = document.getElementById('text-title').value.trim();
    if (!text) return;

    try {
        const response = await fetch('/library/submit-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, title: title || null }),
        });
        const data = await response.json();

        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            document.getElementById('text-content').value = '';
            document.getElementById('text-title').value = '';
            window.location.reload();
        }
    } catch (err) {
        alert('Failed to submit text: ' + err.message);
    }
}

async function deleteItem(itemId) {
    if (!confirm('Delete this item?')) return;

    try {
        await fetch(`/library/items/${itemId}`, { method: 'DELETE' });
        // Remove the card from DOM
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (card) card.remove();
    } catch (err) {
        alert('Failed to delete item: ' + err.message);
    }
}

function toggleTextInput() {
    const area = document.getElementById('text-input-area');
    const icon = document.getElementById('text-toggle-icon');
    const isHidden = area.classList.contains('hidden');
    area.classList.toggle('hidden');
    icon.style.transform = isHidden ? 'rotate(90deg)' : '';
}

// Poll for status updates every 3 seconds
function startStatusPolling() {
    const hasProcessingItems = document.querySelector('[data-status="pending"], [data-status="processing"]');
    if (!hasProcessingItems) return;

    setInterval(async () => {
        try {
            const response = await fetch('/library/status');
            const statuses = await response.json();

            let needsReload = false;
            for (const { id, status } of statuses) {
                const card = document.querySelector(`[data-item-id="${id}"]`);
                if (card && card.dataset.status !== status) {
                    if (status === 'done' || status === 'error') {
                        needsReload = true;
                        break;
                    }
                    // Update status indicator
                    card.dataset.status = status;
                    const dot = card.querySelector('span[class*="rounded-full"]');
                    if (dot) {
                        dot.className = getStatusDotClass(status);
                    }
                }
            }

            if (needsReload) {
                window.location.reload();
            }
        } catch (err) {
            // Silently ignore polling errors
        }
    }, 3000);
}

function getStatusDotClass(status) {
    const base = 'inline-block w-2 h-2 rounded-full';
    switch (status) {
        case 'pending': return `${base} bg-gray-500 animate-pulse-slow`;
        case 'processing': return `${base} bg-amber animate-pulse-slow`;
        case 'done': return `${base} bg-green-500`;
        case 'error': return `${base} bg-red-500`;
        default: return `${base} bg-gray-500`;
    }
}

// Start polling on page load
startStatusPolling();

// Navigator chat client — SSE via fetch + ReadableStream
let currentConversationId = null;
let isStreaming = false;

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const welcome = document.getElementById('welcome');
const conversationSelect = document.getElementById('conversation-select');

// Auto-resize textarea
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
});

// Send on Enter (Shift+Enter for newline)
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isStreaming) return;

    // Hide welcome
    if (welcome) welcome.style.display = 'none';

    // Add user message
    appendMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Disable input
    isStreaming = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    // Create assistant message placeholder
    const assistantDiv = appendMessage('assistant', '', true);
    const contentDiv = assistantDiv.querySelector('.chat-content');

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                conversation_id: currentConversationId,
            }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    var eventType = line.slice(7);
                } else if (line.startsWith('data: ') && eventType) {
                    const data = JSON.parse(line.slice(6));

                    if (eventType === 'conversation') {
                        currentConversationId = data.id;
                    } else if (eventType === 'message') {
                        fullContent += data.content;
                        contentDiv.innerHTML = renderMarkdown(fullContent);
                        scrollToBottom();
                    } else if (eventType === 'done') {
                        // Remove typing cursor
                        contentDiv.classList.remove('typing-cursor');
                    } else if (eventType === 'error') {
                        contentDiv.innerHTML = `<span class="text-red-400">Error: ${escapeHtml(data.error)}</span>`;
                    }
                    eventType = null;
                }
            }
        }
    } catch (err) {
        contentDiv.innerHTML = `<span class="text-red-400">Connection error: ${escapeHtml(err.message)}</span>`;
    } finally {
        isStreaming = false;
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
        contentDiv.classList.remove('typing-cursor');
    }
}

function appendMessage(role, content, isStreaming = false) {
    const div = document.createElement('div');

    if (role === 'user') {
        div.className = 'flex justify-end mb-4';
        div.innerHTML = `
            <div class="max-w-[70%] bg-amber-glow border border-amber/20 rounded-lg px-4 py-3">
                <p class="text-gray-200 text-sm whitespace-pre-wrap">${escapeHtml(content)}</p>
            </div>`;
    } else {
        div.className = 'flex mb-4';
        div.innerHTML = `
            <div class="max-w-[80%] flex">
                <div class="w-1 bg-amber rounded-full mr-3 shrink-0"></div>
                <div class="text-gray-300 text-sm leading-relaxed chat-content ${isStreaming ? 'typing-cursor' : ''}">
                    ${content ? renderMarkdown(content) : ''}
                </div>
            </div>`;
    }

    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadConversation(id) {
    if (!id) {
        currentConversationId = null;
        chatMessages.innerHTML = welcome.outerHTML;
        return;
    }

    currentConversationId = parseInt(id);
    chatMessages.innerHTML = '';
    if (welcome) welcome.style.display = 'none';

    try {
        const response = await fetch(`/conversations/${id}/messages`);
        const messages = await response.json();

        for (const msg of messages) {
            appendMessage(msg.role, msg.content);
        }
    } catch (err) {
        chatMessages.innerHTML = `<p class="text-red-400 text-sm p-4">Failed to load conversation</p>`;
    }
}

// Simple markdown rendering (bold, citations, paragraphs)
function renderMarkdown(text) {
    let html = escapeHtml(text);

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-100 font-medium">$1</strong>');

    // Citation badges: [1], [2], etc.
    html = html.replace(/\[(\d+)\]/g, '<span class="inline-flex items-center justify-center w-5 h-5 text-xs bg-amber/20 text-amber rounded border border-amber/30 font-mono mx-0.5">$1</span>');

    // Bullet points: lines starting with - or *
    html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');

    // Paragraphs: double newlines
    html = html.replace(/\n\n/g, '</p><p class="mb-2">');
    html = '<p class="mb-2">' + html + '</p>';

    // Single newlines within paragraphs
    html = html.replace(/\n/g, '<br>');

    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

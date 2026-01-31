(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildWidgetHtml(options) {
    const launcherText = escapeHtml(options.launcherText || 'Chat');
    const launcherImageUrl = escapeHtml(options.launcherImageUrl || './assets/img/chatbot.jpeg');

    return `
      <button id="vaLauncher" class="va-launcher" type="button" aria-label="Open virtual assistant">
        <img class="va-launcher-img" src="${launcherImageUrl}" alt="${launcherText}" onerror="this.remove();" />
        <span class="va-launcher-text">${launcherText}</span>
      </button>
      <section id="vaWidget" class="va-widget" aria-label="Virtual assistant" aria-hidden="true">
        <header class="va-header">
          <div>
            <div class="va-title">Virtual Assistant</div>
            <div class="va-subtitle">Ask a question</div>
          </div>
          <button id="vaClose" class="va-close" type="button" aria-label="Close">×</button>
        </header>

        <div class="va-controls">
          <div class="va-site">${escapeHtml(options.clientSite)}</div>
          <button id="clearBtn" type="button">Clear</button>
        </div>

        <div class="va-body">
          <div class="card">
            <div id="chat" aria-live="polite"></div>
            <form id="chatForm">
              <textarea id="prompt" placeholder="Ask a question… (Enter to send, Shift+Enter for a new line)"></textarea>
              <button id="sendBtn" type="submit">Send</button>
            </form>
          </div>

          <div class="hint">
            Calls <code>${escapeHtml(options.ragServerUrl)}</code>
          </div>
        </div>
      </section>
    `;
  }

  function init(userOptions = {}) {
    const options = {
      ragServerUrl: userOptions.ragServerUrl,
      launcherText: userOptions.launcherText || 'Chat',
      launcherImageUrl: userOptions.launcherImageUrl || './assets/img/chatbot.jpeg',
      clientSite: userOptions.clientSite,
      mountTo: userOptions.mountTo || document.body
    };

    if (!options.clientSite || typeof options.clientSite !== 'string') {
      throw new Error('VirtualAssistantWidget.init: clientSite is required (provide a string)');
    }

    // Avoid double-injecting
    if (document.getElementById('vaWidget') || document.getElementById('vaLauncher')) {
      console.warn('VirtualAssistantWidget: widget already exists on the page.');
      return;
    }

    const mount = typeof options.mountTo === 'string'
      ? document.querySelector(options.mountTo)
      : options.mountTo;

    if (!mount) {
      throw new Error('VirtualAssistantWidget.init: mountTo target not found');
    }

    const container = document.createElement('div');
    container.className = 'va-container';
    container.innerHTML = buildWidgetHtml(options);
    mount.appendChild(container);

    // Now wire up behavior
    const chatEl = document.getElementById('chat');
    const formEl = document.getElementById('chatForm');
    const promptEl = document.getElementById('prompt');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');

    const widgetEl = document.getElementById('vaWidget');
    const launcherEl = document.getElementById('vaLauncher');
    const closeEl = document.getElementById('vaClose');

    function openWidget() {
      if (!widgetEl) return;
      widgetEl.classList.add('is-open');
      widgetEl.setAttribute('aria-hidden', 'false');
      setTimeout(() => promptEl?.focus(), 0);
    }

    function closeWidget() {
      if (!widgetEl) return;
      widgetEl.classList.remove('is-open');
      widgetEl.setAttribute('aria-hidden', 'true');
    }

    function addMessage(role, text) {
      const wrap = document.createElement('div');
      const bubble = document.createElement('div');
      bubble.className = `msg ${role}`;
      bubble.textContent = text;

      wrap.appendChild(bubble);
      chatEl.appendChild(wrap);
      chatEl.scrollTop = chatEl.scrollHeight;
      return bubble;
    }

    function addSystemMessage(text) {
      addMessage('assistant', text);
    }

    function setBusy(isBusy) {
      sendBtn.disabled = isBusy;
      promptEl.disabled = isBusy;
    }

    async function sendPrompt(prompt) {
      const client_site = options.clientSite;
      addMessage('user', prompt);

      const thinkingBubble = addMessage('assistant', 'Thinking…');
      setBusy(true);

      try {
        const url = new URL(options.ragServerUrl);
        url.searchParams.set('client_site', client_site);
        url.searchParams.set('prompt', prompt);

        const resp = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const msg = data && (data.error || data.details)
            ? `${data.error || 'Error'}${data.details ? `\n${data.details}` : ''}`
            : `Request failed (${resp.status})`;
          thinkingBubble.textContent = msg;
          return;
        }

        thinkingBubble.textContent = data.answer ?? 'No answer returned.';
      } catch (err) {
        thinkingBubble.textContent = `Network error: ${err}`;
      } finally {
        setBusy(false);
        promptEl.focus();
      }
    }

    if (launcherEl) {
      launcherEl.addEventListener('click', () => {
        if (!widgetEl) return;
        const isOpen = widgetEl.classList.contains('is-open');
        if (isOpen) closeWidget();
        else openWidget();
      });
    }

    if (closeEl) {
      closeEl.addEventListener('click', closeWidget);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeWidget();
    });

    // Prevent navigation on submit
    window.addEventListener('submit', (e) => {
      if (e.target && e.target.id === 'chatForm') {
        e.preventDefault();
      }
    }, true);

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const prompt = (promptEl.value || '').trim();
      if (!prompt) return;
      promptEl.value = '';
      sendPrompt(prompt);
    });

    // Enter to send, Shift+Enter for newline
    promptEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        formEl.requestSubmit();
      }
    });

    clearBtn.addEventListener('click', () => {
      chatEl.innerHTML = '';
      promptEl.focus();
    });

    // Seed
    addMessage('assistant', 'Hi! Ask me something about the selected client site.');

    // Start closed
    closeWidget();

    // Optional: open immediately
    if (userOptions.openOnLoad) openWidget();

    return { open: openWidget, close: closeWidget };
  }

  window.VirtualAssistantWidget = { init };
})();

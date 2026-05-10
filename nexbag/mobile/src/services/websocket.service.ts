let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isIntentionallyClosed = false;
let wsCandidates: string[] = [];
let currentCandidateIndex = 0;

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

type EventCallback = (payload: any) => void;
const listeners = new Map<string, Set<EventCallback>>();

const ensureWsPath = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/ws';
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    if (/^wss?:\/\/[^/]+$/i.test(url)) {
      return `${url}/ws`;
    }
    if (/^wss?:\/\/[^/]+\/$/i.test(url)) {
      return `${url}ws`;
    }
    return url;
  }
};

export const webSocketService = {
  connect(url: string, token: string) {
    this.connectWithFallback([url], token);
  },

  connectWithFallback(urls: string[], token: string) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    isIntentionallyClosed = false;

    wsCandidates = Array.from(new Set(urls.map((u) => ensureWsPath(u)).filter(Boolean)));
    if (wsCandidates.length === 0) {
      return;
    }
    if (currentCandidateIndex >= wsCandidates.length) {
      currentCandidateIndex = 0;
    }

    // Use query param for token and preserve existing query params.
    const normalizedUrl = wsCandidates[currentCandidateIndex]!;
    const separator = normalizedUrl.includes('?') ? '&' : '?';
    const wsUrl = `${normalizedUrl}${separator}token=${encodeURIComponent(token)}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      currentCandidateIndex = 0;
      this.dispatchEvent('connection', { status: 'connected' });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event) {
          this.dispatchEvent(data.event, data.payload);
        }
      } catch (e) {
        console.warn('WebSocket message parsing warning', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.dispatchEvent('connection', { status: 'disconnected' });
      ws = null;
      if (!isIntentionallyClosed) {
        this.reconnect(token);
      }
    };

    ws.onerror = (error) => {
      // Intentionally silent: mobile WebSocket may emit frequent transient errors
      // during hotspot/IP changes. Reconnect logic in onclose handles recovery.
      this.dispatchEvent('connection', { status: 'error', detail: error });
    };
  },

  reconnect(token: string) {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    if (wsCandidates.length > 1) {
      currentCandidateIndex = (currentCandidateIndex + 1) % wsCandidates.length;
    }

    const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;

    console.log(`WebSocket attempting reconnect in ${delay}ms (candidate ${currentCandidateIndex + 1}/${Math.max(wsCandidates.length, 1)})`);
    reconnectTimeout = setTimeout(() => {
      this.connectWithFallback(wsCandidates, token);
    }, delay);
  },

  disconnect() {
    isIntentionallyClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) {
      ws.close();
      ws = null;
    }
    wsCandidates = [];
    currentCandidateIndex = 0;
    listeners.clear();
  },

  subscribe(event: string, callback: EventCallback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);
    
    return () => {
      this.unsubscribe(event, callback);
    };
  },

  unsubscribe(event: string, callback: EventCallback) {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  },

  dispatchEvent(event: string, payload: any) {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(cb => cb(payload));
    }
  }
};

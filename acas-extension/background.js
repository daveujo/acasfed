// A.C.A.S Extension Background Service Worker
// Handles WebSocket connections and storage to bypass CSP restrictions

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[ACAS Background]', ...args);
}

// WebSocket connection state
let ws = null;
let wsUrl = 'ws://localhost:8080/ws';
let wsReady = false;
let wsConnected = false;
let reconnectTimer = null;
let subscribedTabs = new Set();

// Tab-specific message handlers
const tabMessageQueue = new Map(); // tabId -> messages[]

// GM_* Storage API replacements using chrome.storage.local
async function gmGetValue(key, defaultValue) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (err) {
    log('Error in gmGetValue:', err);
    return defaultValue;
  }
}

async function gmSetValue(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (err) {
    log('Error in gmSetValue:', err);
    return false;
  }
}

async function gmDeleteValue(key) {
  try {
    await chrome.storage.local.remove(key);
    return true;
  } catch (err) {
    log('Error in gmDeleteValue:', err);
    return false;
  }
}

async function gmListValues() {
  try {
    const result = await chrome.storage.local.get(null);
    return Object.keys(result);
  } catch (err) {
    log('Error in gmListValues:', err);
    return [];
  }
}

// WebSocket Management
function connectWebSocket(url) {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    log('Already connected or connecting');
    return;
  }

  wsUrl = url || wsUrl;
  log('Connecting to', wsUrl);

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      log('✅ Connected');
      wsConnected = true;
      wsReady = false;
      
      // Subscribe to engine output
      ws.send('sub');
      
      // Query engine info
      ws.send('whoareyou');
      ws.send('whatengine');
      
      // Configure engine
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send('uci');
          ws.send('isready');
        }
      }, 100);
      
      // Notify all subscribed tabs
      broadcastToTabs({ type: 'ws-connected', connected: true });
    };

    ws.onmessage = (e) => {
      const data = e.data;
      log('Received:', data);

      if (data.startsWith('iam ')) {
        log('Server:', data);
      } else if (data.startsWith('engine ')) {
        log('Engine:', data);
      } else if (data === 'authok') {
        log('✅ Authenticated');
      } else if (data === 'autherr') {
        log('❌ Authentication failed');
      } else if (data === 'subok') {
        log('✅ Subscribed to engine output');
      } else if (data === 'readyok') {
        wsReady = true;
        log('✅ Ready!');
        broadcastToTabs({ type: 'ws-ready', ready: true });
      } else {
        // Route all other messages (info, bestmove) to subscribed tabs
        broadcastToTabs({ type: 'ws-message', data });
      }
    };

    ws.onerror = (err) => {
      log('❌ Error:', err);
      wsConnected = false;
      wsReady = false;
      broadcastToTabs({ type: 'ws-error', error: err.toString() });
    };

    ws.onclose = () => {
      log('Disconnected');
      wsConnected = false;
      wsReady = false;
      broadcastToTabs({ type: 'ws-disconnected', connected: false });
      
      // Auto-reconnect after 3 seconds
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        log('Auto-reconnecting...');
        connectWebSocket(wsUrl);
      }, 3000);
    };
  } catch (err) {
    log('Failed to connect:', err);
    wsConnected = false;
    wsReady = false;
  }
}

function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  wsConnected = false;
  wsReady = false;
  log('Disconnected');
  broadcastToTabs({ type: 'ws-disconnected', connected: false });
}

function sendToWebSocket(cmd) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    log('Sending:', cmd);
    ws.send(cmd);
    return true;
  }
  log('Cannot send, not connected');
  return false;
}

function getWebSocketStatus() {
  return {
    connected: wsConnected,
    ready: wsReady,
    url: wsUrl
  };
}

// Broadcast message to all subscribed tabs
function broadcastToTabs(message) {
  for (const tabId of subscribedTabs) {
    chrome.tabs.sendMessage(tabId, message).catch(err => {
      // Tab might be closed, remove it
      log('Failed to send to tab', tabId, '- removing from subscribed tabs');
      subscribedTabs.delete(tabId);
    });
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  
  log('Message from tab', tabId, ':', message.type);

  (async () => {
    try {
      switch (message.type) {
        case 'gm-getValue':
          const value = await gmGetValue(message.key, message.defaultValue);
          sendResponse({ success: true, value });
          break;

        case 'gm-setValue':
          const setSuccess = await gmSetValue(message.key, message.value);
          sendResponse({ success: setSuccess });
          break;

        case 'gm-deleteValue':
          const deleteSuccess = await gmDeleteValue(message.key);
          sendResponse({ success: deleteSuccess });
          break;

        case 'gm-listValues':
          const keys = await gmListValues();
          sendResponse({ success: true, value: keys });
          break;

        case 'gm-openInTab':
          chrome.tabs.create({ url: message.url, active: !message.background });
          sendResponse({ success: true });
          break;

        case 'gm-notification':
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'https://raw.githubusercontent.com/Federico98x/CHESS/main/assets/images/logo-192.png',
            title: message.title || 'A.C.A.S',
            message: message.text || ''
          });
          sendResponse({ success: true });
          break;

        case 'ws-subscribe':
          if (tabId) {
            subscribedTabs.add(tabId);
            log('Tab', tabId, 'subscribed. Total:', subscribedTabs.size);
          }
          sendResponse({ success: true });
          break;

        case 'ws-unsubscribe':
          if (tabId) {
            subscribedTabs.delete(tabId);
            log('Tab', tabId, 'unsubscribed. Total:', subscribedTabs.size);
          }
          sendResponse({ success: true });
          break;

        case 'ws-send':
          const sent = sendToWebSocket(message.command);
          sendResponse({ success: sent });
          break;

        case 'ws-set-url':
          wsUrl = message.url;
          log('WebSocket URL set to:', wsUrl);
          sendResponse({ success: true });
          break;

        case 'ws-connect':
          connectWebSocket(message.url);
          sendResponse({ success: true });
          break;

        case 'ws-disconnect':
          disconnectWebSocket();
          sendResponse({ success: true });
          break;

        case 'ws-status':
          const status = getWebSocketStatus();
          sendResponse({ success: true, status });
          break;

        default:
          log('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      log('Error handling message:', err);
      sendResponse({ success: false, error: err.toString() });
    }
  })();

  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (subscribedTabs.has(tabId)) {
    subscribedTabs.delete(tabId);
    log('Tab', tabId, 'closed and unsubscribed. Total:', subscribedTabs.size);
  }
});

log('Background service worker initialized');

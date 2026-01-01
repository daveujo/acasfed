# A.C.A.S Browser Extension Architecture

## Directory Structure
```
acas-extension/
├── manifest.json              # Manifest V3 configuration
├── background.js              # Service worker (WebSocket handler)
├── content.js                 # Content script (main logic)
├── icon.svg                   # Extension icon
├── README.md                  # Installation & usage guide
├── download-libs.sh           # Library download script
├── CommLinkjs.js              # Placeholder (to be downloaded)
└── UniversalBoardDrawerjs.js  # Placeholder (to be downloaded)
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Chess Site Tab (e.g., Lichess)             │     │
│  │                                                          │     │
│  │  ┌────────────────────────────────────────────────┐    │     │
│  │  │          Content Script (content.js)            │    │     │
│  │  │                                                  │    │     │
│  │  │  • Board detection                              │    │     │
│  │  │  • Move marking                                 │    │     │
│  │  │  • FEN generation                               │    │     │
│  │  │  • GM_* API wrappers                           │    │     │
│  │  │  • Sends messages to background →              │    │     │
│  │  │                                                  │    │     │
│  │  └──────────────────┬───────────────────────────────    │     │
│  │                     │ chrome.runtime.sendMessage    │     │
│  │                     │                               │     │
│  └─────────────────────┼───────────────────────────────┘     │
│                        │                                       │
│                        ↓                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │        Background Service Worker (background.js)         │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │          WebSocket Connection Manager             │   │  │
│  │  │  • Connects to ws://localhost:8080/ws            │   │  │
│  │  │  • Auto-reconnect with exponential backoff       │   │  │
│  │  │  • Routes messages to subscribed tabs             │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │          Storage Manager (GM_* API)               │   │  │
│  │  │  • chrome.storage.local for persistence          │   │  │
│  │  │  • getValue, setValue, deleteValue, listValues    │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │          Tab Manager                              │   │  │
│  │  │  • Tracks subscribed tabs                        │   │  │
│  │  │  • Cleans up on tab close                        │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  └─────────────────────┬─────────────────────────────────────  │
│                        │ WebSocket                             │
│                        ↓                                       │
└────────────────────────────────────────────────────────────────┘
                         │
                         ↓
              ┌──────────────────────┐
              │   External Engine     │
              │   ws://localhost:8080 │
              │                       │
              │  • Stockfish          │
              │  • Leela Chess        │
              │  • etc.               │
              └──────────────────────┘
```

## Message Flow

### 1. WebSocket Connection Request
```
Content Script                Background Worker               External Engine
     │                              │                               │
     │ ws-connect(url)              │                               │
     ├─────────────────────────────>│                               │
     │                              │ WebSocket.connect()           │
     │                              ├──────────────────────────────>│
     │                              │                               │
     │                              │<──────── onopen ──────────────│
     │<──── ws-connected ───────────│                               │
     │                              │                               │
```

### 2. Sending Engine Commands
```
Content Script                Background Worker               External Engine
     │                              │                               │
     │ ws-send("uci")               │                               │
     ├─────────────────────────────>│                               │
     │                              │ ws.send("uci")                │
     │                              ├──────────────────────────────>│
     │                              │                               │
```

### 3. Receiving Engine Output
```
Content Script                Background Worker               External Engine
     │                              │                               │
     │                              │<────── "readyok" ──────────────│
     │                              │                               │
     │<──── ws-message ─────────────│                               │
     │  (data: "readyok")           │                               │
     │                              │                               │
```

### 4. Storage Operations
```
Content Script                Background Worker
     │                              │
     │ gm-getValue("key")           │
     ├─────────────────────────────>│
     │                              │ chrome.storage.local.get()
     │                              │
     │<──── {value: ...} ───────────│
     │                              │
```

## CSP Bypass Mechanism

### Problem: Content Scripts are Subject to CSP
```
┌─────────────────────────────────────────────────┐
│           Lichess Page (Strict CSP)              │
│                                                  │
│  Content-Security-Policy:                       │
│    connect-src 'self' wss://socket.lichess.org  │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │   Content Script (content.js)           │    │
│  │                                          │    │
│  │   new WebSocket("ws://localhost:8080")  │    │
│  │         ❌ BLOCKED BY CSP                │    │
│  │                                          │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Solution: Service Worker Bypasses CSP
```
┌─────────────────────────────────────────────────┐
│           Lichess Page (Strict CSP)              │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │   Content Script (content.js)           │    │
│  │                                          │    │
│  │   chrome.runtime.sendMessage({          │    │
│  │     type: 'ws-connect',                 │    │
│  │     url: 'ws://localhost:8080'          │    │
│  │   })                                     │    │
│  │   ✅ Allowed - messaging API            │    │
│  │                                          │    │
│  └────────────────────────────────────────┘    │
│                        │                         │
└────────────────────────┼─────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│        Extension Context (No CSP)                │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │   Background Worker (background.js)     │    │
│  │                                          │    │
│  │   new WebSocket("ws://localhost:8080")  │    │
│  │   ✅ Allowed - extension context        │    │
│  │                                          │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Manifest V3
- Uses service workers instead of background pages
- More secure and efficient
- Required for new extensions

### 2. Async GM_* APIs
- Original userscript: `GM_getValue('key')` (synchronous)
- Extension: `await GM_getValue('key')` (asynchronous)
- Necessary because chrome.storage API is async

### 3. Exponential Backoff
- Prevents hammering the server on connection failures
- Delay: 3s → 6s → 12s → 24s → 30s (max)
- Resets on successful connection

### 4. Tab Subscription Model
- Multiple tabs can use the extension simultaneously
- Each tab subscribes to WebSocket messages
- Background worker broadcasts to all subscribed tabs
- Automatic cleanup on tab close

### 5. Local Icon
- Avoids external network requests
- More secure (no external dependencies)
- Works offline

## Security Features

1. **Localhost Only**: WebSocket connections only allowed to localhost/127.0.0.1/[::1]
2. **No Remote Connections**: Extension cannot connect to external servers via WebSocket
3. **Local Storage**: Settings stored in chrome.storage.local (isolated per-extension)
4. **Debug Mode Off**: Verbose logging disabled by default
5. **No eval()**: No dynamic code execution
6. **Content Security**: Service worker runs in isolated context

## Performance Considerations

1. **Message Passing Overhead**: Slight latency vs. direct WebSocket (negligible for chess)
2. **Service Worker Lifecycle**: May be suspended by browser (auto-wakes on message)
3. **Memory**: One WebSocket connection shared across all tabs (efficient)
4. **Storage**: chrome.storage.local has 10MB limit (more than sufficient)

## Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 88+ | ✅ Full | Manifest V3 native support |
| Edge 88+ | ✅ Full | Chromium-based |
| Firefox 109+ | ✅ Partial | Temporary install only (needs signing) |
| Safari 16.4+ | ⚠️ Limited | Requires conversion |
| Opera 74+ | ✅ Full | Chromium-based |

## Future Improvements

1. **Bundled Libraries**: Include CommLinkjs and UniversalBoardDrawer in the extension
2. **Options Page**: GUI for configuration instead of code editing
3. **Popup UI**: Status indicator and quick settings
4. **Context Menus**: Right-click menu commands
5. **Badge**: Connection status on extension icon
6. **Store Publishing**: Submit to Chrome Web Store
7. **Firefox Signing**: Get signed for permanent Firefox installation

## Troubleshooting

### Service Worker Suspended
- Service workers may be suspended by the browser after idle time
- They automatically wake up on incoming messages
- No user action required

### Message Delivery Failures
- If tab closes before response, sendResponse() fails silently
- Background worker removes dead tabs from subscription list
- Content script should handle timeout/failure cases

### Storage Quota
- chrome.storage.local: 10MB limit
- Current usage: < 1MB for typical configs
- Can request "unlimitedStorage" permission if needed

### WebSocket State
- Check `chrome://extensions` → Background page console
- Service worker console shows connection logs
- Content script console shows message sending/receiving

## References

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Service Workers](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

# A.C.A.S Browser Extension

This is the browser extension version of A.C.A.S (Advanced Chess Assistance System) that bypasses Content Security Policy (CSP) restrictions on chess sites like Lichess.

## Why the Extension is Needed

The original userscript version (`acas.user.js`) cannot connect to external chess engines via WebSocket on sites with strict CSP like Lichess. The CSP blocks WebSocket connections to localhost from the page context.

The browser extension solves this by:
- Moving WebSocket connections to a background service worker that runs in the extension context
- Service workers have elevated privileges and can make WebSocket connections regardless of the page's CSP
- Messages are passed between the content script and background worker via `chrome.runtime.sendMessage`

## Installation Instructions

### Prerequisites

Before installing the extension, you need to download the required JavaScript libraries:

1. **LegacyGMjs.js** - Download from: https://update.greasyfork.org/scripts/534637/LegacyGMjs.js
   - Save as `acas-extension/LegacyGMjs.js` (Note: currently not used in extension version)

2. **CommLinkjs.js** - Download from: https://update.greasyfork.org/scripts/470418/CommLinkjs.js
   - Save as `acas-extension/CommLinkjs.js`

3. **UniversalBoardDrawerjs.js** - Download from: https://update.greasyfork.org/scripts/470417/UniversalBoardDrawerjs.js
   - Save as `acas-extension/UniversalBoardDrawerjs.js`

Or use these commands to download them:

```bash
cd acas-extension
curl -o CommLinkjs.js "https://update.greasyfork.org/scripts/470418/CommLinkjs.js?acasv=2"
curl -o UniversalBoardDrawerjs.js "https://update.greasyfork.org/scripts/470417/UniversalBoardDrawerjs.js?acasv=1"
```

### Loading the Extension in Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked"
4. Select the `acas-extension` folder
5. The extension should now be installed and active

### Loading the Extension in Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the `acas-extension` folder and select the `manifest.json` file
4. The extension will be loaded temporarily (until Firefox restart)

Note: For permanent installation in Firefox, the extension needs to be signed by Mozilla.

## Using the External Engine

1. Start the external engine server (see `inter/README.md` for instructions)
2. Navigate to any supported chess site (e.g., lichess.org, chess.com)
3. The extension will automatically attempt to connect to `ws://localhost:8080/ws`
4. Configure the connection URL if needed through the A.C.A.S GUI

## Configuration

The extension uses `chrome.storage.local` for storing settings, which replaces the Greasemonkey/Tampermonkey GM_* storage APIs.

Settings are shared across all tabs and persist across browser sessions.

## Security Considerations

### WebSocket Permissions
The extension requires wildcard port permissions for localhost WebSocket connections (`ws://localhost:*/*`). This is necessary because the external chess engine can run on any port (default is 8080, but users may configure different ports).

**Security Notes:**
- Only localhost/127.0.0.1/[::1] addresses are permitted
- The extension does NOT connect to remote servers via WebSocket
- Users should ensure they trust the external engine server running on their machine
- Consider running the external engine server with authentication enabled (see `inter/README.md`)

### Debug Mode
Debug mode is disabled by default in production builds. If you need to enable debug logging for troubleshooting:
1. Edit `background.js` and set `DEBUG = true`
2. Edit `content.js` and set `debugModeActivated = true`
3. Reload the extension

## Features

- ✅ Bypasses CSP restrictions on strict sites like Lichess
- ✅ WebSocket connections handled by background service worker
- ✅ All original A.C.A.S features supported
- ✅ Auto-reconnect when connection drops
- ✅ Multiple tab support with proper message routing
- ✅ Storage API compatible with original userscript

## Differences from Userscript Version

1. **No @require directives**: Libraries must be downloaded separately
2. **No unsafeWindow**: Uses regular `window` object
3. **Async GM_* functions**: All GM_getValue, GM_setValue, etc. are async
4. **WebSocket in background**: Connection managed by service worker
5. **Notifications**: Uses Chrome notifications API instead of GM_notification

## Troubleshooting

### Extension not loading
- Make sure you're in Developer mode
- Check that all required files are present in the folder
- Check the browser console for errors

### Cannot connect to external engine
- Ensure the external engine server is running on `ws://localhost:8080/ws`
- Check that the background service worker is active in `chrome://extensions/`
- Open the service worker console to see connection logs

### Chess board not detected
- Refresh the page after loading the extension
- Check that the site is in the supported sites list
- Open the browser console to see debug messages (if debug mode is enabled)

## Supported Chess Sites

- chess.com
- lichess.org
- playstrategy.org
- pychess.org
- chess.org
- papergames.io
- immortal.game
- worldchess.com
- chess.net
- freechess.club
- chessclub.com
- gameknot.com
- chesstempo.com
- redhotpawn.com
- chessanytime.com
- simplechess.com
- chessworld.net
- app.edchess.io
- And more...

## License

GPL-3.0

## Credits

Original A.C.A.S by HKR
- Homepage: https://federico98x.github.io/CHESS/
- Greasyfork: https://greasyfork.org/en/scripts/471519

## Support

For issues and questions, visit:
- GitHub: https://github.com/Federico98x/CHESS
- Support URL: https://github.com/Federico98x/CHESS/tree/main#why-doesnt-it-work

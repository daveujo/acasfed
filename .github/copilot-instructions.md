# GitHub Copilot Instructions for A.C.A.S (Advanced Chess Assistance System)

## Project Overview

This repository contains A.C.A.S (Advanced Chess Assistance System), a chess assistance tool consisting of:
- **acas.user.js**: A browser userscript that integrates with chess websites
- **inter/**: A Go-based intermediary server for chess engine communication

## Code Style and Conventions

### JavaScript (Userscript)

- Use ES6+ features where appropriate
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous operations
- Follow existing naming conventions:
  - camelCase for variables and functions
  - PascalCase for classes
  - UPPERCASE for constants
- Maintain existing code structure and organization patterns
- Keep functions focused and modular
- Add comments only when necessary to explain complex logic

### Go (Intermediary Server)

- Follow standard Go conventions and idioms
- Use `gofmt` for code formatting
- Keep functions small and focused
- Use descriptive variable names
- Handle errors explicitly - never ignore them
- Use proper logging for debugging and monitoring

## Technical Context

### Userscript Components

- **CommLink**: Communication system between userscript and backend
- **BoardDrawer**: Chess board visualization and interaction
- **supportedSites**: Configuration for different chess websites
- **External Engine**: WebSocket-based connection to external chess engines

### Key Features

- Real-time move analysis
- Multi-site support (chess.com, lichess.org, and many others)
- External engine integration via WebSocket
- Board orientation detection
- FEN position handling

### Go Server Components

- WebSocket server for engine communication
- Authentication system with passkey
- UCI (Universal Chess Interface) command handling
- Engine output subscription system

## Development Guidelines

### When Modifying JavaScript

- Respect the existing site configuration structure in `supportedSites`
- Maintain compatibility with the external engine WebSocket protocol
- Preserve debug mode functionality (controlled by `debugModeActivated`)
- Keep GM_* (GreaseMonkey) API usage consistent
- Test across multiple chess sites when modifying core board detection

### When Modifying Go Server

- Maintain UCI protocol compliance
- Preserve authentication logic
- Keep WebSocket message format consistent
- Ensure thread-safe operations
- Document any new command line flags

## Building and Testing

### Userscript

- No build process required - direct JavaScript
- Install in a userscript manager (Tampermonkey, Greasemonkey, etc.)
- Test on supported chess websites listed in the script metadata
- Use browser console for debugging (check `debugModeActivated` flag)

### Go Server

```bash
cd inter
go build main.go
./main -engine ./stockfish
```

**Common flags:**
- `-addr <string>`: HTTP service address (default: localhost:8080)
- `-engine <string>`: Path to engine binary (default: stockfish)
- `-authwrite <bool>`: Require passkey for write access (default: true)
- `-authread <bool>`: Require passkey for read access (default: false)

## Important Notes

### Security and Ethics

- This tool is intended for educational and practice purposes only
- Using chess assistance during competitive play violates fair play rules
- The code includes warnings about potential rule violations
- Always maintain responsible use guidelines in any contributions

### Compatibility

- Userscript works with multiple chess platforms
- Each platform has specific selectors and detection logic
- External engine requires WebSocket support
- Go server requires UCI-compatible chess engines

## Common Tasks

### Adding Support for a New Chess Site

1. Add a new entry using `addSupportedChessSite(domain, config)`
2. Implement required functions: `boardElem`, `pieceElem`, `chessVariant`, `boardOrientation`, `pieceElemFen`, `pieceElemCoords`, `boardDimensions`, `isMutationNewMove`
3. Test thoroughly on the target site
4. Update documentation

### Debugging Connection Issues

- Check browser console for `[ACAS]` and `[ExtEngine]` messages
- Verify WebSocket connection state
- Ensure server is running and accessible
- Check passkey authentication if required

### Modifying Engine Communication

- Maintain WebSocket message format compatibility
- Update both client (userscript) and server (Go) sides
- Document protocol changes
- Test with different chess engines

## Resources

- UCI Protocol: Universal Chess Interface specification
- WebSocket Protocol: RFC 6455
- Userscript APIs: GreaseMonkey/Tampermonkey documentation

## Questions or Issues?

When working on this codebase:
- Preserve existing functionality unless explicitly changing it
- Match the coding style of surrounding code
- Test changes across multiple chess sites when applicable
- Consider backwards compatibility with existing configurations

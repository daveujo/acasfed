#!/bin/bash
# Download required JavaScript libraries for A.C.A.S Extension

echo "Downloading CommLinkjs.js..."
curl -o CommLinkjs.js "https://update.greasyfork.org/scripts/470418/CommLinkjs.js?acasv=2"

echo "Downloading UniversalBoardDrawerjs.js..."
curl -o UniversalBoardDrawerjs.js "https://update.greasyfork.org/scripts/470417/UniversalBoardDrawerjs.js?acasv=1"

echo "Done! Libraries downloaded."

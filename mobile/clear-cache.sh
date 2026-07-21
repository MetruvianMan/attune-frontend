#!/bin/bash

# Script to clear Expo cache and force a fresh reload

echo "🧹 Clearing Expo cache..."

# Clear Metro bundler cache
rm -rf .expo
rm -rf node_modules/.cache

# Clear watchman cache (if installed)
if command -v watchman &> /dev/null; then
    echo "🔄 Clearing Watchman cache..."
    watchman watch-del-all
fi

echo "✅ Cache cleared!"
echo ""
echo "Now restart your Expo dev server:"
echo "  npm start"
echo ""
echo "Then in the app, shake your device and choose 'Reload'"

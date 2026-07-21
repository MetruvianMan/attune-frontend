#!/bin/bash
echo "🔍 Attune Backend Diagnostic"
echo ""

# Check if backend is running
echo "1. Checking if backend is running on port 3000..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend is NOT running"
  echo "   Start it with: cd backend && npm run dev"
  exit 1
fi

# Check IP address
echo ""
echo "2. Your current IP addresses:"
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print "   " $2}'

echo ""
echo "3. Mobile .env is configured for:"
if [ -f mobile/.env ]; then
  grep EXPO_PUBLIC_BACKEND_URL mobile/.env | sed 's/^/   /'
else
  echo "   ❌ mobile/.env not found!"
fi

echo ""
echo "4. OpenAI API key status:"
if [ -f backend/.env ]; then
  if grep -q "OPENAI_API_KEY=sk-" backend/.env; then
    echo "   ✅ OPENAI_API_KEY is set in backend/.env"
  else
    echo "   ❌ OPENAI_API_KEY is missing or invalid in backend/.env"
  fi
else
  echo "   ❌ backend/.env not found!"
fi

echo ""
echo "5. Test OpenAI connection:"
echo "   Running: cd backend && node test-openai.js"
cd backend && node test-openai.js 2>&1 | grep -E "(✅|❌)" | sed 's/^/   /'
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If IPs don't match above:"
echo "  1. Update mobile/.env with your current IP"
echo "  2. Restart Expo (kill and restart 'npm start' in mobile/)"
echo ""
echo "To see backend logs:"
echo "  cd backend && npm run dev"
echo "  (Keep this terminal visible when testing voice log)"
echo ""
echo "Try voice log now and watch backend terminal for errors!"

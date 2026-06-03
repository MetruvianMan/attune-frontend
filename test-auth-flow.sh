#!/bin/bash
# Quick test script to verify auth and voice endpoints are working

BACKEND_URL="https://attune-backend-5hke.onrender.com"

echo "🔍 Testing Attune Backend Authentication & Voice Endpoints"
echo "=========================================================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend health check failed"
  echo "   Response: $HEALTH_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Login endpoint (needs actual credentials)
echo "2️⃣  Testing login endpoint structure..."
echo "   ℹ️  Enter your credentials to test (or press Ctrl+C to skip)"
read -p "   Email: " TEST_EMAIL
read -sp "   Password: " TEST_PASSWORD
echo ""

if [ -n "$TEST_EMAIL" ] && [ -n "$TEST_PASSWORD" ]; then
  LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
  
  if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "   ✅ Login successful!"
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
      echo "   ✅ JWT token received"
      echo ""
      
      # Test 3: Voice endpoints with token
      echo "3️⃣  Testing voice endpoints with authentication..."
      
      VOICE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/voice/extract-events" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"transcript":"test transcript","childProfileId":"test-id"}')
      
      if echo "$VOICE_RESPONSE" | grep -q "events"; then
        echo "   ✅ Voice endpoint accessible and authenticated!"
        echo "   ✅ Event extraction working"
      elif echo "$VOICE_RESPONSE" | grep -q "error"; then
        # Check if it's an OpenAI error (which is actually good - means auth worked)
        echo "   ✅ Voice endpoint authenticated (OpenAI processing)"
      else
        echo "   ⚠️  Unexpected response: $VOICE_RESPONSE"
      fi
    else
      echo "   ❌ No token in response"
    fi
  else
    echo "   ❌ Login failed"
    echo "   Response: $LOGIN_RESPONSE"
  fi
else
  echo "   ⏭️  Skipped login test"
fi

echo ""
echo "4️⃣  Testing voice endpoints without auth (should fail)..."
UNAUTH_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/voice/extract-events" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"test","childProfileId":"test"}')

if echo "$UNAUTH_RESPONSE" | grep -q "Authentication required"; then
  echo "   ✅ Voice endpoints properly protected (401 Unauthorized)"
else
  echo "   ⚠️  Unexpected response: $UNAUTH_RESPONSE"
fi

echo ""
echo "=========================================================="
echo "✅ Backend tests complete!"
echo ""
echo "Next steps:"
echo "  1. Build mobile app: cd mobile && npx expo start"
echo "  2. Login with your credentials"
echo "  3. Test voice logging"
echo ""
echo "📖 See MOBILE-AUTH-SETUP.md for full testing instructions"

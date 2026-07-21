#!/bin/bash
# Quick verification that voice endpoints are deployed

BACKEND_URL="https://attune-backend-5hke.onrender.com"

echo "Verifying Voice Endpoints Deployment"
echo "====================================="
echo ""

echo "Testing /api/voice/extract-events endpoint..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/voice/extract-events" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"test","childProfileId":"test"}')

if echo "$RESPONSE" | grep -q "Cannot POST"; then
  echo "❌ FAILED: Voice endpoints not deployed yet"
  echo "   Response: $RESPONSE"
  echo ""
  echo "Action: Wait for Render to finish deploying and try again"
elif echo "$RESPONSE" | grep -q "error"; then
  echo "✅ SUCCESS: Voice endpoint is deployed!"
  echo "   Response: $RESPONSE"
  echo ""
  echo "This is the expected response (401 or auth error is good)"
else
  echo "⚠️  Unexpected response: $RESPONSE"
fi

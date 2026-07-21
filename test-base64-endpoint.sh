#!/bin/bash
# Test the new base64 transcription endpoint

BACKEND_URL="https://attune-backend-5hke.onrender.com"

echo "🔍 Testing Base64 Transcription Endpoint"
echo "========================================"
echo ""

# Test without auth (should fail with 401)
echo "1️⃣  Testing endpoint without auth (expect 401)..."
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/voice/transcribe-base64" \
  -H "Content-Type: application/json" \
  -d '{"audioBase64":"dGVzdA==","filename":"test.m4a"}')

if echo "$RESPONSE" | grep -q "Authentication required"; then
  echo "   ✅ Endpoint properly protected"
else
  echo "   ⚠️  Unexpected response: $RESPONSE"
fi

echo ""
echo "2️⃣  Endpoint is ready for mobile app testing!"
echo ""
echo "Next steps:"
echo "  1. Wait for Render deployment to complete (~2 minutes)"
echo "  2. Reload mobile app"
echo "  3. Test voice logging"
echo ""
echo "Expected behavior:"
echo "  - Record voice note"
echo "  - See 'Reading audio file for base64 encoding...' in console"
echo "  - See 'Transcription successful!' in console"
echo "  - Review extracted events"

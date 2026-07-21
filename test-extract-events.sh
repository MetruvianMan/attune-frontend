#!/bin/bash

echo "🧪 Testing /api/voice/extract-events endpoint directly"
echo ""

# Get auth token (update with your actual credentials)
echo "Step 1: Logging in to get auth token..."
read -p "Enter your email: " EMAIL
read -sp "Enter your password: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test event extraction
echo "Step 2: Testing event extraction..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/voice/extract-events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "transcript": "Robbie had another great day today. He went to bike camp and had a good time. He came home and drew comics quietly at the table.",
    "childProfileId": "1"
  }')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "Check the backend terminal for detailed logs!"

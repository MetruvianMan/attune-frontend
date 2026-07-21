#!/bin/bash
# Test script for Attune voice endpoints

BACKEND_URL="https://attune-backend-5hke.onrender.com"

echo "Testing Attune Voice API Endpoints"
echo "===================================="
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "${BACKEND_URL}/health" | jq '.'
echo ""

# Test 2: Transcribe endpoint (without auth - should fail with 401)
echo "2. Testing transcribe endpoint (expect 401 Unauthorized)..."
curl -s -X POST "${BACKEND_URL}/api/voice/transcribe" \
  -F "audio=@test.m4a" 2>&1 | head -5
echo ""

# Test 3: Extract events endpoint (without auth - should fail with 401)
echo "3. Testing extract-events endpoint (expect 401 Unauthorized)..."
curl -s -X POST "${BACKEND_URL}/api/voice/extract-events" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"test","childProfileId":"test"}' | jq '.'
echo ""

echo "✅ Tests complete!"
echo ""
echo "Expected results:"
echo "  - Health check: should return {status: 'ok', timestamp: '...'}"
echo "  - Voice endpoints: should return 401 Unauthorized (auth required)"

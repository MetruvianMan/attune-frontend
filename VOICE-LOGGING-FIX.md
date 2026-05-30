# Voice Logging Fix - "Thank you thank you thank you" Issue

## Problem
When using voice logging in Attune (localhost:3002), the transcription returns "Thank you thank you thank you" instead of the actual spoken content. This is a known Whisper API behavior when audio quality is poor or the recording has issues.

## Root Cause
The MediaRecorder was using default audio settings without specifying quality parameters, resulting in:
- Low audio quality
- Potential silence or very quiet audio
- Poor codec selection
- No audio constraints for noise suppression

## Fixes Applied

### 1. Improved Audio Recording Quality (`src/ui/today-view.ts`)
- Added specific audio constraints:
  - `echoCancellation: true` - Reduces echo
  - `noiseSuppression: true` - Filters background noise
  - `autoGainControl: true` - Normalizes volume
  - `sampleRate: 48000` - High-quality sample rate
  - `channelCount: 1` - Mono recording (sufficient for speech)
- Added `audioBitsPerSecond: 128000` for better quality encoding
- Improved codec detection (tries opus first, then webm, then mp4)

### 2. Better Error Detection
- Added check for audio blob size (< 1KB indicates silence or error)
- Added console logging for debugging
- Shows clear error message if recording is too short

### 3. Enhanced Whisper API Call (`src/llm/browser-openai.ts`)
- Added context prompt to help Whisper understand the content
- Added detailed logging for debugging
- Better error messages

## Testing

### Quick Test
1. Open the test page: `open test-audio-recording.html`
2. Click "Start Recording"
3. Speak clearly for 5-10 seconds
4. Click "Stop Recording"
5. Check the recording size (should be > 10 KB for a 5-second recording)
6. Click "Play Recording" to verify audio was captured

### Full Test in Attune
1. Restart the dev server: `npm run dev`
2. Open http://localhost:3002
3. Navigate to Today view
4. Click "🎙️ Start Voice Log"
5. Speak clearly about Robbie's day
6. Click to stop recording
7. Check browser console for logs
8. Verify transcription is accurate

## Common Issues & Solutions

### Issue: "Recording too short or empty"
**Solution:** Make sure you're speaking loudly and clearly. Check microphone permissions.

### Issue: Still getting "Thank you thank you thank you"
**Possible causes:**
1. **Microphone too far away** - Speak closer to the device
2. **Background noise** - Record in a quieter environment
3. **API key expired** - Check `.env` file and verify key is valid
4. **Browser compatibility** - Try Chrome/Edge (best support) instead of Safari

### Issue: Transcription error
**Check:**
1. Browser console for detailed error messages
2. OpenAI API key in `.env` file
3. Network connection
4. OpenAI API status (https://status.openai.com)

## Debugging Tips

1. **Check browser console** - All audio details are logged
2. **Verify audio size** - Should be at least 10-20 KB for a 5-second recording
3. **Test microphone** - Use the test page to verify recording works
4. **Check API key** - Make sure it's not expired or rate-limited

## Technical Details

### Audio Format Priority
1. `audio/webm;codecs=opus` (best quality, Chrome/Edge)
2. `audio/webm` (fallback)
3. `audio/mp4` (Safari)

### Whisper API Parameters
- Model: `whisper-1`
- Language: `en`
- Prompt: Context about parent describing child's day
- Audio bitrate: 128 kbps

## Next Steps

If issues persist:
1. Check the browser console logs
2. Test with the diagnostic page
3. Verify the audio file size is reasonable
4. Try recording in a quieter environment
5. Speak more slowly and clearly
6. Check if the OpenAI API key has rate limits

## Port Clarification
- Frontend (Attune app): http://localhost:3002
- Backend (sync server): http://localhost:3000
- You mentioned port 3003 - please verify which port you're actually using

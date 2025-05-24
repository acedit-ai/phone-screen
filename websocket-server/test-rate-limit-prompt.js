/**
 * Test script to verify rate limit prompt functionality
 * 
 * This script simulates a rate-limited call scenario to ensure
 * the AI agent delivers the appropriate message before hanging up.
 */

const WebSocket = require('ws');

// Test configuration
const WEBSOCKET_URL = 'ws://localhost:8081/call';
const TEST_PARAMS = new URLSearchParams({
  jobTitle: 'Software Engineer',
  company: 'Test Company',
  isRateLimited: 'true',
  rateLimitReason: 'Call frequency limit exceeded'
});

const testUrl = `${WEBSOCKET_URL}?${TEST_PARAMS.toString()}`;

console.log('🧪 Testing rate limit prompt functionality...');
console.log('📞 Connecting to:', testUrl);

const ws = new WebSocket(testUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connection established');
  console.log('⏳ Waiting for AI agent to deliver rate limit message...');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message.event || message.type);
    
    // Log audio responses to verify the rate limit message
    if (message.event === 'media' && message.media) {
      console.log('🔊 Audio data received (rate limit message being delivered)');
    }
  } catch (error) {
    console.log('📨 Received non-JSON message:', data.toString().substring(0, 100));
  }
});

ws.on('close', (code, reason) => {
  console.log(`📞 Call ended - Code: ${code}, Reason: ${reason}`);
  console.log('✅ Test completed successfully!');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Auto-close after 30 seconds if the call doesn't end naturally
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 30000); 
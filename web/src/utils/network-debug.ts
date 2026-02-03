/**
 * Network debugging utilities for model downloads
 */

export async function testModelFileDownload(): Promise<void> {
  console.log('=== Testing Model File Download ===');
  
  // Test downloading a small model file to see if it's a general CDN issue
  const testUrls = [
    'https://huggingface.co/favicon.ico',
    'https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url);
      console.log(`  Status: ${response.status}`);
      console.log(`  Headers:`, {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'cache-control': response.headers.get('cache-control')
      });
      
      // Try to read the response
      const blob = await response.blob();
      console.log(`  Blob size: ${blob.size} bytes`);
      
      // Try to cache it
      try {
        const cache = await caches.open('test-model-download');
        await cache.add(url);
        console.log(`  ✅ Successfully cached`);
        await cache.delete(url);
      } catch (cacheError: any) {
        console.error(`  ❌ Cache.add() failed:`, cacheError);
        console.error(`     This is the same error you're seeing with model files`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fetch failed:`, error);
    }
    console.log('');
  }
  
  console.log('=== End Test ===');
}

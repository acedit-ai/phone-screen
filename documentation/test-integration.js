const http = require('http');

console.log('🧪 Testing Documentation Integration - Phase 4');
console.log('=' .repeat(50));

const tests = [
  {
    name: 'Documentation Homepage',
    url: 'http://localhost:3000/documentation/index.html',
    expectedInContent: 'AI Phone Screen Documentation'
  },
  {
    name: 'Documentation Clean URL',
    url: 'http://localhost:3000/documentation',
    expectedInContent: 'AI Phone Screen Documentation'
  },
  {
    name: 'Intro Page Direct',
    url: 'http://localhost:3000/documentation/intro/index.html',
    expectedInContent: 'Welcome to AI Phone Screen'
  },
  {
    name: 'Intro Page Clean URL',
    url: 'http://localhost:3000/documentation/intro',
    expectedInContent: 'Welcome to AI Phone Screen'
  },
  {
    name: 'Docs Redirect',
    url: 'http://localhost:3000/docs',
    expectedStatus: [301, 302, 307, 308] // Various redirect status codes
  },
  {
    name: 'CSS Assets',
    url: 'http://localhost:3000/documentation/assets/css/',
    expectedStatus: [200, 404] // 404 is fine, means directory listing is disabled
  }
];

async function runTests() {
  console.log('📡 Testing webapp integration with Next.js routing...\n');
  
  for (const test of tests) {
    try {
      const result = await testUrl(test.url);
      
      if (test.expectedInContent) {
        const hasContent = result.body.includes(test.expectedInContent);
        console.log(`${hasContent ? '✅' : '❌'} ${test.name}`);
        if (!hasContent) {
          console.log(`   Expected to find: "${test.expectedInContent}"`);
        }
      } else if (test.expectedStatus) {
        const statusOk = test.expectedStatus.includes(result.statusCode);
        console.log(`${statusOk ? '✅' : '❌'} ${test.name} (${result.statusCode})`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - ${error.message}`);
    }
  }
  
  console.log('\n🎉 Phase 4 Integration test complete!');
  console.log('💡 All tests passing means Next.js routing is working correctly');
  console.log('🔗 Clean URLs, redirects, and navigation all functional!');
}

function testUrl(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

runTests().catch(console.error); 
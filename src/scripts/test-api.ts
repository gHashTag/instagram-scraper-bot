/**
 * 🧪 Тестирование Instagram Scraper API
 * 
 * Проверяет все endpoints локально и на Vercel
 */

import fetch from 'node-fetch';

const LOCAL_URL = 'http://localhost:3002';
const VERCEL_URL = 'https://instagram-scraper-bot.vercel.app';

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

async function testEndpoint(baseUrl: string, endpoint: string, options: any = {}): Promise<TestResult> {
  const start = Date.now();
  const url = `${baseUrl}${endpoint}`;
  
  try {
    console.log(`🔍 Testing: ${url}`);
    
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    const result: TestResult = {
      endpoint,
      status: response.status,
      success: response.ok,
      data,
      duration
    };
    
    if (response.ok) {
      console.log(`✅ ${endpoint} - ${response.status} (${duration}ms)`);
    } else {
      console.log(`❌ ${endpoint} - ${response.status} (${duration}ms)`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    }
    
    return result;
    
  } catch (error: any) {
    const duration = Date.now() - start;
    console.log(`💥 ${endpoint} - ERROR (${duration}ms)`);
    console.log(`   ${error.message}`);
    
    return {
      endpoint,
      status: 0,
      success: false,
      error: error.message,
      duration
    };
  }
}

async function testAPI(baseUrl: string, name: string) {
  console.log(`\n🚀 Testing ${name}: ${baseUrl}`);
  console.log('='.repeat(50));
  
  const results: TestResult[] = [];
  
  // Health check
  results.push(await testEndpoint(baseUrl, '/health'));
  
  // API info
  results.push(await testEndpoint(baseUrl, '/api'));
  
  // Competitors
  results.push(await testEndpoint(baseUrl, '/api/competitors'));
  results.push(await testEndpoint(baseUrl, '/api/competitors/1/reels'));
  
  // Hashtags
  results.push(await testEndpoint(baseUrl, '/api/hashtags'));
  
  // Transcription (POST)
  results.push(await testEndpoint(baseUrl, '/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrl: 'https://example.com/video.mp4',
      language: 'en'
    })
  }));
  
  // Scraping (POST)
  results.push(await testEndpoint(baseUrl, '/api/scrape/competitors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      competitor: 'clinicajoelleofficial',
      minViews: 50000
    })
  }));
  
  results.push(await testEndpoint(baseUrl, '/api/scrape/hashtags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hashtag: 'botox',
      minViews: 50000
    })
  }));
  
  // 404 test
  results.push(await testEndpoint(baseUrl, '/api/nonexistent'));
  
  // Summary
  console.log(`\n📊 ${name} Summary:`);
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total);
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`⏱️ Average response time: ${avgDuration}ms`);
  
  if (successful === total) {
    console.log(`🎉 All tests passed for ${name}!`);
  } else {
    console.log(`⚠️ Some tests failed for ${name}`);
  }
  
  return results;
}

async function main() {
  console.log('🧪 Instagram Scraper API Testing');
  console.log('==================================');
  
  let localResults: TestResult[] = [];
  let vercelResults: TestResult[] = [];
  
  // Test local server
  try {
    localResults = await testAPI(LOCAL_URL, 'Local Server');
  } catch (error) {
    console.log(`💥 Local server test failed: ${error}`);
  }
  
  // Test Vercel deployment
  try {
    vercelResults = await testAPI(VERCEL_URL, 'Vercel Deployment');
  } catch (error) {
    console.log(`💥 Vercel test failed: ${error}`);
  }
  
  // Final summary
  console.log('\n🏁 Final Summary');
  console.log('================');
  
  if (localResults.length > 0) {
    const localSuccess = localResults.filter(r => r.success).length;
    console.log(`🏠 Local: ${localSuccess}/${localResults.length} tests passed`);
  }
  
  if (vercelResults.length > 0) {
    const vercelSuccess = vercelResults.filter(r => r.success).length;
    console.log(`☁️ Vercel: ${vercelSuccess}/${vercelResults.length} tests passed`);
  }
  
  // Test specific endpoints for demo
  console.log('\n🎯 Demo Data:');
  
  if (vercelResults.length > 0) {
    const competitorsTest = vercelResults.find(r => r.endpoint === '/api/competitors');
    if (competitorsTest?.success) {
      console.log(`📊 Found ${competitorsTest.data.total} competitors`);
      competitorsTest.data.data.forEach((comp: any) => {
        console.log(`   - ${comp.username}: ${comp.stats.total_reels} reels, ${comp.stats.avg_views} avg views`);
      });
    }
    
    const hashtagsTest = vercelResults.find(r => r.endpoint === '/api/hashtags');
    if (hashtagsTest?.success) {
      console.log(`🏷️ Found ${hashtagsTest.data.total} hashtags`);
      hashtagsTest.data.data.forEach((tag: any) => {
        console.log(`   - #${tag.tag_name}: ${tag.stats.total_reels} reels, score ${tag.stats.trending_score}`);
      });
    }
  }
  
  console.log('\n✅ API testing completed!');
}

// Запуск
if (require.main === module) {
  main().catch(console.error);
}

export { testAPI, testEndpoint };

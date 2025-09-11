const http = require('http');

async function testRegistration() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing user registration...');

    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      user_type: 'client',
      full_name: 'Test User'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      console.log('📡 Response Status:', res.statusCode);
      console.log('📡 Response Headers:', res.headers);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('📄 Response Data:', JSON.stringify(jsonData, null, 2));

          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('✅ Registration successful!');
          } else {
            console.log('❌ Registration failed:', jsonData.error || jsonData.message);
          }
          resolve();
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
          console.log('📄 Raw Response:', data);
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testRegistration().catch(console.error);


const http = require('http');

// Test with existing email
const testData1 = JSON.stringify({
  email: 'squirelboy360@gmail.com',
  password: 'test123',
  full_name: 'Test User',
  user_type: 'client'
});

// Test with new email
const testData2 = JSON.stringify({
  email: 'brandnewuser' + Date.now() + '@gmail.com',
  password: 'test123',
  full_name: 'Brand New User',
  user_type: 'client'
});

function makeRequest(data, description) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  console.log(`\n=== ${description} ===`);
  console.log('Sending data:', data);

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log('Response:', body);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(data);
  req.end();
}

// Test existing email first
makeRequest(testData1, 'Testing with existing email');

// Wait a bit then test new email
setTimeout(() => {
  makeRequest(testData2, 'Testing with new email');
}, 2000);


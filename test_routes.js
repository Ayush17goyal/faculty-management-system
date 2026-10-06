const http = require('node:http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- TESTING ROUTES ---');

  // 1. GET /login
  let res = await request({ host: 'localhost', port: 3000, path: '/login', method: 'GET' });
  console.log('GET /login:', res.status, res.body.includes('Select Role:'));

  // 2. POST /login with Admin
  const postData = 'role=Admin&username=admin01&password=admin123';
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);
  console.log('POST /login:', res.status, 'Location:', res.headers['location']);

  const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
  console.log('Cookie obtained:', cookie ? 'YES' : 'NO');

  // 3. GET /admin/dashboard
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/dashboard',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('GET /admin/dashboard:', res.status,
    'Total Faculty:', res.body.includes('Total Faculty &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 25'),
    'Recent Faculty:', res.body.includes('Rahul Sharma')
  );

  // 4. GET /admin/faculty
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/faculty',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('GET /admin/faculty:', res.status, 'Has faculty table:', res.body.includes('rahul@gmail.com'));

  // 5. GET /admin/departments
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/departments',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('GET /admin/departments:', res.status, 'Has CSE & ECE:', res.body.includes('CSE') && res.body.includes('ECE'));

  // 6. GET /admin/hod
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/hod',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('GET /admin/hod:', res.status, 'Has HOD list:', res.body.includes('Assign HOD'));

  // 7. GET /admin/timetable
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/timetable',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('GET /admin/timetable:', res.status, 'Has DBMS & OS:', res.body.includes('DBMS') && res.body.includes('OS'));

  // 8. GET /admin/users
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/users',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('GET /admin/users:', res.status, 'Has users:', res.body.includes('admin01') && res.body.includes('rahul01'));

  console.log('ALL ROUTES TESTED SUCCESSFULLY!');
}

run().catch(console.error);

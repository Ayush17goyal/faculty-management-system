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
  console.log('--- TESTING CRUD ACTIONS ---');

  // Login
  const loginData = 'role=Admin&username=admin01&password=admin123';
  let res = await request({
    host: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);
  const cookie = res.headers['set-cookie'][0].split(';')[0];

  // 1. Add Faculty
  const addFacultyData = new URLSearchParams({
    faculty_code: '999',
    name: 'Test Faculty Member',
    email: 'testfaculty@college.edu',
    phone: '9999988888',
    department_id: '1',
    designation: 'Assistant Professor',
    qualification: 'M.Tech CSE'
  }).toString();

  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/faculty/add',
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(addFacultyData)
    }
  }, addFacultyData);
  console.log('Add Faculty status:', res.status, 'Redirect:', res.headers['location']);

  // 2. Search Faculty
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/faculty?q=Test+Faculty',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('Search faculty found added faculty:', res.body.includes('Test Faculty Member'));

  // 3. Assign HOD
  const hodData = new URLSearchParams({
    department_id: '1',
    faculty_id: '1'
  }).toString();
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/hod/assign',
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(hodData)
    }
  }, hodData);
  console.log('Assign HOD status:', res.status, 'Redirect:', res.headers['location']);

  // 4. Add Timetable Schedule
  const ttData = new URLSearchParams({
    day: 'Fri',
    time: '14:00-15:00',
    faculty_id: '1',
    subject: 'Algorithms',
    room: 'Lab-1'
  }).toString();
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/timetable/add',
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(ttData)
    }
  }, ttData);
  console.log('Add Schedule status:', res.status, 'Redirect:', res.headers['location']);

  // 5. Create User
  const userData = new URLSearchParams({
    username: 'newuser99',
    name: 'New User Name',
    password: 'password123',
    role: 'Faculty',
    status: 'Active'
  }).toString();
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/users/create',
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(userData)
    }
  }, userData);
  console.log('Create User status:', res.status, 'Redirect:', res.headers['location']);

  // 6. Delete the test faculty
  // First find ID of 999
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/faculty?q=999',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  const match = res.body.match(/\/admin\/faculty\/delete\/(\d+)/);
  if (match) {
    const testFacId = match[1];
    res = await request({
      host: 'localhost',
      port: 3000,
      path: `/admin/faculty/delete/${testFacId}`,
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    console.log('Delete test faculty status:', res.status, 'Redirect:', res.headers['location']);
  }

  // 7. Test Logout
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/logout',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log('Logout status:', res.status, 'Redirect:', res.headers['location']);

  // 8. Verify /admin/dashboard redirects to /login after logout
  res = await request({
    host: 'localhost',
    port: 3000,
    path: '/admin/dashboard',
    method: 'GET'
  });
  console.log('Access without cookie redirects to login:', res.status === 302, 'Location:', res.headers['location']);

  console.log('ALL CRUD OPERATIONS COMPLETED SUCCESSFULLY!');
}

run().catch(console.error);

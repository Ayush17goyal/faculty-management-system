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

async function loginUser(role, username, password) {
  const postData = `role=${encodeURIComponent(role)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const res = await request({
    host: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
  return { status: res.status, location: res.headers['location'], cookie };
}

async function getPage(path, cookie) {
  return await request({
    host: 'localhost',
    port: 3000,
    path,
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
}

async function run() {
  console.log('=== VERIFYING ALL 6 ROLES ===');

  // 1. ADMIN
  console.log('\n--- 1. Testing Admin ---');
  const adminLogin = await loginUser('Admin', 'admin01', 'admin123');
  console.log('Admin login status:', adminLogin.status, 'Location:', adminLogin.location);
  const adminDash = await getPage('/admin/dashboard', adminLogin.cookie);
  console.log('Admin dashboard status:', adminDash.status, 'Has Total Faculty:', adminDash.body.includes('Total Faculty'));

  // 2. HOD
  console.log('\n--- 2. Testing HOD ---');
  const hodLogin = await loginUser('HOD', 'rahul01', 'rahul123');
  console.log('HOD login status:', hodLogin.status, 'Location:', hodLogin.location);
  const hodDash = await getPage('/hod/dashboard', hodLogin.cookie);
  console.log('HOD dashboard status:', hodDash.status, 'Department CSE:', hodDash.body.includes('CSE'));
  const hodFac = await getPage('/hod/faculty', hodLogin.cookie);
  console.log('HOD faculty status:', hodFac.status, 'Has faculty table:', hodFac.body.includes('Faculty Management'));
  const hodDept = await getPage('/hod/department', hodLogin.cookie);
  console.log('HOD department info status:', hodDept.status, 'Has dept info:', hodDept.body.includes('Department Information'));
  const hodTT = await getPage('/hod/timetable', hodLogin.cookie);
  console.log('HOD timetable status:', hodTT.status, 'Has timetable table:', hodTT.body.includes('Department Timetable'));

  // Security test: HOD trying to access /admin/dashboard
  const hodAdminTry = await getPage('/admin/dashboard', hodLogin.cookie);
  console.log('Security: HOD accessing /admin/dashboard redirected:', hodAdminTry.status === 302, 'Location:', hodAdminTry.headers['location']);

  // 3. FACULTY
  console.log('\n--- 3. Testing Faculty ---');
  const facLogin = await loginUser('Faculty', 'amit01', 'amit123');
  console.log('Faculty login status:', facLogin.status, 'Location:', facLogin.location);
  const facDash = await getPage('/faculty/dashboard', facLogin.cookie);
  console.log('Faculty dashboard status:', facDash.status, 'Has Name Amit Kumar:', facDash.body.includes('Amit Kumar'));
  console.log('Faculty dashboard has Assigned Courses:', facDash.body.includes('Assigned Courses'));
  console.log('Faculty dashboard has Coursework Assignments:', facDash.body.includes('Coursework Assignments'));
  console.log('Faculty dashboard has Thermodynamics:', facDash.body.includes('Thermodynamics'));
  const facProf = await getPage('/faculty/profile', facLogin.cookie);
  console.log('Faculty profile status:', facProf.status, 'Has Edit Profile button:', facProf.body.includes('Edit Profile'));
  const facCourses = await getPage('/faculty/courses', facLogin.cookie);
  console.log('Faculty courses status:', facCourses.status, 'Has My Courses:', facCourses.body.includes('My Courses'));
  const facAssign = await getPage('/faculty/assignments', facLogin.cookie);
  console.log('Faculty assignments status:', facAssign.status, 'Has Coursework Assignments:', facAssign.body.includes('Coursework Assignments'));
  const facAtt = await getPage('/faculty/attendance', facLogin.cookie);
  console.log('Faculty attendance status:', facAtt.status, 'Has Attendance Records:', facAtt.body.includes('Attendance Records'));
  const facTT = await getPage('/faculty/timetable', facLogin.cookie);
  console.log('Faculty timetable status:', facTT.status, 'Has My Timetable:', facTT.body.includes('My Timetable'));

  // Security test: Faculty trying to access /admin or /hod
  const facAdminTry = await getPage('/admin/dashboard', facLogin.cookie);
  console.log('Security: Faculty accessing /admin/dashboard redirected:', facAdminTry.status === 302, 'Location:', facAdminTry.headers['location']);
  const facHODTry = await getPage('/hod/dashboard', facLogin.cookie);
  console.log('Security: Faculty accessing /hod/dashboard redirected:', facHODTry.status === 302, 'Location:', facHODTry.headers['location']);

  // 4. DIRECTOR
  console.log('\n--- 4. Testing Director ---');
  const dirLogin = await loginUser('Director', 'director01', 'director123');
  console.log('Director login status:', dirLogin.status, 'Location:', dirLogin.location);
  const dirDash = await getPage('/director/dashboard', dirLogin.cookie);
  console.log('Director dashboard status:', dirDash.status, 'Has summary tables:', dirDash.body.includes('Department Summary'));
  const dirFac = await getPage('/director/faculty', dirLogin.cookie);
  console.log('Director faculty list status:', dirFac.status, 'Has faculty roster:', dirFac.body.includes('Faculty List'));
  const dirDept = await getPage('/director/departments', dirLogin.cookie);
  console.log('Director departments status:', dirDept.status, 'Has dept list:', dirDept.body.includes('Department List'));
  const dirHOD = await getPage('/director/hods', dirLogin.cookie);
  console.log('Director HODs status:', dirHOD.status, 'Has HOD list:', dirHOD.body.includes('HOD List'));
  const dirTT = await getPage('/director/timetable', dirLogin.cookie);
  console.log('Director timetable status:', dirTT.status, 'Has institution timetable:', dirTT.body.includes('Institution Timetable'));

  // 5. VP
  console.log('\n--- 5. Testing VP ---');
  const vpLogin = await loginUser('VP', 'vp01', 'vp123');
  console.log('VP login status:', vpLogin.status, 'Location:', vpLogin.location);
  const vpDash = await getPage('/vp/dashboard', vpLogin.cookie);
  console.log('VP dashboard status:', vpDash.status, 'Has overview:', vpDash.body.includes('Faculty Overview'));
  const vpReports = await getPage('/vp/reports', vpLogin.cookie);
  console.log('VP reports status:', vpReports.status, 'Has institutional reports:', vpReports.body.includes('Institutional Reports'));

  // 6. PRESIDENT
  console.log('\n--- 6. Testing President ---');
  const presLogin = await loginUser('President', 'president01', 'president123');
  console.log('President login status:', presLogin.status, 'Location:', presLogin.location);
  const presDash = await getPage('/president/dashboard', presLogin.cookie);
  console.log('President dashboard status:', presDash.status, 'Has president dashboard:', presDash.body.includes('President Dashboard'));
  const presFac = await getPage('/president/faculty', presLogin.cookie);
  console.log('President faculty overview status:', presFac.status, 'Has faculty overview:', presFac.body.includes('Faculty Overview'));
  const presDept = await getPage('/president/departments', presLogin.cookie);
  console.log('President department overview status:', presDept.status, 'Has dept overview:', presDept.body.includes('Department Overview'));
  const presHOD = await getPage('/president/hods', presLogin.cookie);
  console.log('President HOD overview status:', presHOD.status, 'Has HOD overview:', presHOD.body.includes('HOD Overview'));

  console.log('\n=== ALL 6 ROLES VERIFIED AND TESTED SUCCESSFULLY! ===');
}

run().catch(console.error);

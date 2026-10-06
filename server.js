const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db.js');

const {
  renderLayout,
  renderLogin,
  renderDashboard,
  renderFacultyHistory,
  renderFacultyList,
  renderFacultyForm,
  renderDepartmentsList,
  renderHODManagement,
  renderTimetable,
  renderUsers,
  renderFacultyDashboard,
  renderFacultyProfile,
  renderFacultyProfileEdit,
  renderFacultyCourses,
  renderFacultyAssignments,
  renderFacultyAssignmentForm,
  renderFacultyAttendance,
  renderFacultyTimetable,
  renderHODDashboard,
  renderHODFacultyList,
  renderHODFacultyForm,
  renderHODFacultyView,
  renderHODDepartmentInfo,
  renderHODTimetable,
  renderDirectorDashboard,
  renderDirectorFaculty,
  renderDirectorDepartments,
  renderDirectorHODs,
  renderDirectorTimetable,
  renderVPDashboard,
  renderVPFaculty,
  renderVPDepartments,
  renderVPHODs,
  renderVPReports,
  renderPresidentDashboard,
  renderPresidentFacultyOverview,
  renderPresidentDepartmentOverview,
  renderPresidentHODOverview
} = require('./view_engine.js');

const path = require('node:path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('fms-secret-cookie-key'));

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Session resolution helper
function getSessionUser(req) {
  const sessionCookie = req.signedCookies.fms_session || req.signedCookies.fms_admin;
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie);
  } catch (e) {
    return null;
  }
}

// Role-based Access Control Middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.redirect('/login?err=' + encodeURIComponent('Please login to continue.'));
    }

    if (!allowedRoles.includes(user.role)) {
      // User is logged in but trying to access an unauthorized section
      const redirectMap = {
        Admin: '/admin/dashboard',
        HOD: '/hod/dashboard',
        Faculty: '/faculty/dashboard',
        Director: '/director/dashboard',
        VP: '/vp/dashboard',
        President: '/president/dashboard'
      };
      const dest = redirectMap[user.role] || '/login';
      return res.redirect(dest + '?err=' + encodeURIComponent(`Access denied: Role "${user.role}" cannot access this section.`));
    }

    req.currentUser = user;
    next();
  };
}

// Root redirect
app.get('/', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.redirect('/login');

  const redirectMap = {
    Admin: '/admin/dashboard',
    HOD: '/hod/dashboard',
    Faculty: '/faculty/dashboard',
    Director: '/director/dashboard',
    VP: '/vp/dashboard',
    President: '/president/dashboard'
  };
  res.redirect(redirectMap[user.role] || '/login');
});

// ==========================================
// 1. LOGIN & LOGOUT (ALL ROLES)
// ==========================================
app.get('/login', (req, res) => {
  const error = req.query.err || null;
  const message = req.query.msg || null;
  const role = req.query.role || 'Admin';
  const html = renderLogin({ error, message, role, username: 'admin' });
  res.send(html);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || user.password !== password) {
    const html = renderLogin({
      error: 'Invalid username or password.',
      username
    });
    return res.status(401).send(html);
  }

  if (user.status !== 'Active') {
    const html = renderLogin({
      error: 'Your account is inactive. Please contact the administrator.',
      username
    });
    return res.status(403).send(html);
  }

  // Resolve faculty_id and department_id for HOD / Faculty
  let facultyId = user.faculty_id;
  let departmentId = null;

  if (facultyId) {
    const fac = db.prepare('SELECT * FROM faculty WHERE id = ?').get(facultyId);
    if (fac) departmentId = fac.department_id;
  } else if (user.role === 'HOD' || user.role === 'Faculty') {
    // Try finding faculty by matching name
    const fac = db.prepare('SELECT * FROM faculty WHERE name = ?').get(user.name);
    if (fac) {
      facultyId = fac.id;
      departmentId = fac.department_id;
    }
  }

  // If HOD, also check departments table for HOD assignment
  if (user.role === 'HOD') {
    const dept = db.prepare('SELECT id FROM departments WHERE hod_id = ?').get(facultyId);
    if (dept) {
      departmentId = dept.id;
    } else if (!departmentId) {
      // Fallback to first department
      const firstDept = db.prepare('SELECT id FROM departments LIMIT 1').get();
      if (firstDept) departmentId = firstDept.id;
    }
  }

  const sessionPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    faculty_id: facultyId,
    department_id: departmentId
  };

  res.cookie('fms_session', JSON.stringify(sessionPayload), {
    signed: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  });

  if (user.role === 'Admin') {
    res.cookie('fms_admin', JSON.stringify(sessionPayload), {
      signed: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });
  }

  const redirectMap = {
    Admin: '/admin/dashboard',
    HOD: '/hod/dashboard',
    Faculty: '/faculty/dashboard',
    Director: '/director/dashboard',
    VP: '/vp/dashboard',
    President: '/president/dashboard'
  };

  res.redirect(redirectMap[user.role] || '/login');
});

app.get('/logout', (req, res) => {
  res.clearCookie('fms_session');
  res.clearCookie('fms_admin');
  res.redirect('/login?msg=' + encodeURIComponent('You have successfully logged out.'));
});

// ==========================================
// 2. ADMIN SECTION
// ==========================================
const requireAdmin = requireRole(['Admin']);

app.get('/admin/dashboard', requireAdmin, (req, res) => {
  const totalFaculty = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
  const totalDepartments = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
  const totalHODs = db.prepare('SELECT COUNT(*) as c FROM departments WHERE hod_id IS NOT NULL').get().c;
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  const recentFaculty = db.prepare(`
    SELECT f.faculty_code, f.name, d.name as department_name, f.date_added
    FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY f.id ASC
    LIMIT 3
  `).all();

  const monthlyStats = db.prepare(`
    SELECT substr(date_added, 4, 3) AS month, COUNT(*) AS faculty_count,
      CASE substr(date_added, 4, 3)
        WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3
        WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
        WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9
        WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
      END AS month_order
    FROM faculty
    GROUP BY month
    ORDER BY month_order
  `).all();

  const designationStats = db.prepare(`
    SELECT designation AS name, COUNT(*) AS faculty_count
    FROM faculty
    GROUP BY designation
    ORDER BY faculty_count DESC
  `).all();

  const content = renderDashboard({
    totalFaculty,
    totalDepartments,
    totalHODs,
    totalUsers,
    recentFaculty,
    monthlyStats,
    designationStats
  });

  res.send(renderLayout({
    title: 'Admin Dashboard',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/admin/faculty', requireAdmin, (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  let facultyList;
  if (searchQuery) {
    const param = `%${searchQuery}%`;
    facultyList = db.prepare(`
      SELECT f.*, d.name as department_name
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.faculty_code LIKE ? OR f.name LIKE ? OR d.name LIKE ? OR f.email LIKE ? OR f.designation LIKE ?
      ORDER BY f.id ASC
    `).all(param, param, param, param, param);
  } else {
    facultyList = db.prepare(`
      SELECT f.*, d.name as department_name
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      ORDER BY f.id ASC
    `).all();
  }

  const content = renderFacultyList({ facultyList, searchQuery });
  res.send(renderLayout({
    title: 'Faculty Management',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/admin/faculty-history', requireAdmin, (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  let facultyList = [];

  if (searchQuery) {
    const term = `%${searchQuery}%`;
    facultyList = db.prepare(`
      SELECT f.*, d.name AS department_name
      FROM faculty f
      LEFT JOIN departments d ON d.id = f.department_id
      WHERE f.name LIKE ? OR f.faculty_code LIKE ?
      ORDER BY f.name
      LIMIT 10
    `).all(term, term);

    const historyQuery = db.prepare(`
      SELECT * FROM faculty_career_history
      WHERE faculty_id = ?
      ORDER BY start_year DESC, id DESC
    `);
    facultyList = facultyList.map(faculty => ({
      ...faculty,
      careerHistory: historyQuery.all(faculty.id)
    }));
  }

  const content = renderFacultyHistory({ searchQuery, facultyList });
  res.send(renderLayout({
    title: 'Faculty History',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/admin/faculty/add', requireAdmin, (req, res) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
  const content = renderFacultyForm({ isEdit: false, departments });
  res.send(renderLayout({
    title: 'Add Faculty',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/admin/faculty/add', requireAdmin, (req, res) => {
  const { faculty_code, name, email, phone, department_id, designation, qualification } = req.body;
  if (!faculty_code || !name || !email) {
    return res.redirect('/admin/faculty/add?err=' + encodeURIComponent('Faculty ID, Name, and Email are required.'));
  }

  const existing = db.prepare('SELECT id FROM faculty WHERE faculty_code = ?').get(faculty_code);
  if (existing) {
    return res.redirect('/admin/faculty/add?err=' + encodeURIComponent(`Faculty ID "${faculty_code}" already exists.`));
  }

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;

  db.prepare(`
    INSERT INTO faculty (faculty_code, name, email, phone, department_id, designation, qualification, date_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    faculty_code.trim(),
    name.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    department_id ? Number(department_id) : null,
    designation ? designation.trim() : '',
    qualification ? qualification.trim() : '',
    dateStr
  );

  res.redirect('/admin/faculty?msg=' + encodeURIComponent('Faculty added successfully.'));
});

app.get('/admin/faculty/edit/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const faculty = db.prepare('SELECT * FROM faculty WHERE id = ?').get(id);
  if (!faculty) {
    return res.redirect('/admin/faculty?err=' + encodeURIComponent('Faculty member not found.'));
  }

  const departments = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
  const content = renderFacultyForm({ isEdit: true, faculty, departments });
  res.send(renderLayout({
    title: 'Edit Faculty',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/admin/faculty/edit/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { faculty_code, name, email, phone, department_id, designation, qualification } = req.body;

  const existing = db.prepare('SELECT id FROM faculty WHERE faculty_code = ? AND id != ?').get(faculty_code, id);
  if (existing) {
    return res.redirect(`/admin/faculty/edit/${id}?err=` + encodeURIComponent(`Faculty ID "${faculty_code}" already in use.`));
  }

  db.prepare(`
    UPDATE faculty
    SET faculty_code = ?, name = ?, email = ?, phone = ?, department_id = ?, designation = ?, qualification = ?
    WHERE id = ?
  `).run(
    faculty_code.trim(),
    name.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    department_id ? Number(department_id) : null,
    designation ? designation.trim() : '',
    qualification ? qualification.trim() : '',
    id
  );

  res.redirect('/admin/faculty?msg=' + encodeURIComponent('Faculty updated successfully.'));
});

app.get('/admin/faculty/delete/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE departments SET hod_id = NULL WHERE hod_id = ?').run(id);
  db.prepare('DELETE FROM faculty WHERE id = ?').run(id);
  res.redirect('/admin/faculty?msg=' + encodeURIComponent('Faculty deleted successfully.'));
});

// Admin Departments
function handleDepartments(req, res, showAddForm = false, editId = null) {
  const departments = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const facultyList = db.prepare('SELECT id, faculty_code, name FROM faculty ORDER BY name ASC').all();

  let editDept = null;
  if (editId) {
    editDept = db.prepare('SELECT * FROM departments WHERE id = ?').get(Number(editId));
  }

  const content = renderDepartmentsList({
    departments,
    showAddForm: showAddForm || (req.query.action === 'add'),
    editDept,
    facultyList
  });

  res.send(renderLayout({
    title: 'Department Management',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
}

app.get('/admin/departments', requireAdmin, (req, res) => handleDepartments(req, res));
app.get('/admin/department', requireAdmin, (req, res) => handleDepartments(req, res));
app.get('/admin/departments/add', requireAdmin, (req, res) => handleDepartments(req, res, true));
app.post('/admin/departments/add', requireAdmin, (req, res) => {
  const { name, hod_id } = req.body;
  if (!name) return res.redirect('/admin/departments?err=' + encodeURIComponent('Department name is required.'));

  const existing = db.prepare('SELECT id FROM departments WHERE name = ?').get(name.trim());
  if (existing) return res.redirect('/admin/departments?err=' + encodeURIComponent(`Department "${name}" already exists.`));

  db.prepare('INSERT INTO departments (name, hod_id) VALUES (?, ?)').run(name.trim(), hod_id ? Number(hod_id) : null);
  res.redirect('/admin/departments?msg=' + encodeURIComponent('Department added successfully.'));
});

app.get('/admin/departments/edit/:id', requireAdmin, (req, res) => handleDepartments(req, res, false, req.params.id));
app.post('/admin/departments/edit/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, hod_id } = req.body;

  const existing = db.prepare('SELECT id FROM departments WHERE name = ? AND id != ?').get(name.trim(), id);
  if (existing) return res.redirect(`/admin/departments/edit/${id}?err=` + encodeURIComponent(`Department name "${name}" already in use.`));

  db.prepare('UPDATE departments SET name = ?, hod_id = ? WHERE id = ?').run(
    name.trim(),
    hod_id ? Number(hod_id) : null,
    id
  );
  res.redirect('/admin/departments?msg=' + encodeURIComponent('Department updated successfully.'));
});

app.get('/admin/departments/delete/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE faculty SET department_id = NULL WHERE department_id = ?').run(id);
  db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  res.redirect('/admin/departments?msg=' + encodeURIComponent('Department deleted successfully.'));
});

// Admin HOD
app.get('/admin/hod', requireAdmin, (req, res) => {
  const hodList = db.prepare(`
    SELECT d.id as department_id, d.name as department_name, f.name as hod_name
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const departments = db.prepare('SELECT id, name FROM departments ORDER BY name ASC').all();
  const facultyList = db.prepare(`
    SELECT f.id, f.faculty_code, f.name, d.name as department_name
    FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY f.name ASC
  `).all();

  const selectedDeptId = req.query.dept_id || (departments.length > 0 ? departments[0].id : null);

  const content = renderHODManagement({
    hodList,
    departments,
    facultyList,
    selectedDeptId
  });

  res.send(renderLayout({
    title: 'HOD Management',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/admin/hod/assign', requireAdmin, (req, res) => {
  const { department_id, faculty_id } = req.body;
  if (!department_id || !faculty_id) {
    return res.redirect('/admin/hod?err=' + encodeURIComponent('Department and Faculty must be selected.'));
  }
  db.prepare('UPDATE departments SET hod_id = ? WHERE id = ?').run(Number(faculty_id), Number(department_id));
  res.redirect('/admin/hod?msg=' + encodeURIComponent('HOD assigned successfully.'));
});

// Admin Timetable
app.get('/admin/timetable', requireAdmin, (req, res) => {
  const schedules = db.prepare(`
    SELECT t.*, f.name as faculty_name
    FROM timetable t
    JOIN faculty f ON t.faculty_id = f.id
    ORDER BY t.id ASC
  `).all();

  const facultyList = db.prepare(`
    SELECT f.id, f.name, d.name as department_name
    FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY f.name ASC
  `).all();

  let editSchedule = null;
  if (req.query.edit) {
    editSchedule = db.prepare('SELECT * FROM timetable WHERE id = ?').get(Number(req.query.edit));
  }

  const content = renderTimetable({ schedules, facultyList, editSchedule });
  res.send(renderLayout({
    title: 'Timetable Management',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/admin/timetable/add', requireAdmin, (req, res) => {
  const { day, time, faculty_id, subject, room } = req.body;
  if (!day || !time || !faculty_id || !subject || !room) {
    return res.redirect('/admin/timetable?err=' + encodeURIComponent('All fields are required.'));
  }
  db.prepare('INSERT INTO timetable (day, time, faculty_id, subject, room) VALUES (?, ?, ?, ?, ?)').run(
    day, time.trim(), Number(faculty_id), subject.trim(), room.trim()
  );
  res.redirect('/admin/timetable?msg=' + encodeURIComponent('Schedule added successfully.'));
});

app.post('/admin/timetable/edit/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { day, time, faculty_id, subject, room } = req.body;
  if (!day || !time || !faculty_id || !subject || !room) {
    return res.redirect(`/admin/timetable?edit=${id}&err=` + encodeURIComponent('All fields are required.'));
  }
  db.prepare('UPDATE timetable SET day = ?, time = ?, faculty_id = ?, subject = ?, room = ? WHERE id = ?').run(
    day, time.trim(), Number(faculty_id), subject.trim(), room.trim(), id
  );
  res.redirect('/admin/timetable?msg=' + encodeURIComponent('Schedule updated successfully.'));
});

app.get('/admin/timetable/delete/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM timetable WHERE id = ?').run(id);
  res.redirect('/admin/timetable?msg=' + encodeURIComponent('Schedule deleted successfully.'));
});

// Admin Users
app.get('/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, status FROM users ORDER BY id ASC').all();
  let editUser = null;
  if (req.query.edit) {
    editUser = db.prepare('SELECT id, username, name, role, status FROM users WHERE id = ?').get(Number(req.query.edit));
  }
  const content = renderUsers({ users, editUser });
  res.send(renderLayout({
    title: 'User Management',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/admin/users/create', requireAdmin, (req, res) => {
  const { username, name, password, role, status } = req.body;
  if (!username || !name || !password || !role) {
    return res.redirect('/admin/users?err=' + encodeURIComponent('Username, Name, Password, and Role are required.'));
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.redirect('/admin/users?err=' + encodeURIComponent(`Username "${username}" already exists.`));

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;

  db.prepare('INSERT INTO users (username, name, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    username.trim(), name.trim(), password, role, status || 'Active', dateStr
  );
  res.redirect('/admin/users?msg=' + encodeURIComponent('User created successfully.'));
});

app.post('/admin/users/edit/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { username, name, password, role, status } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), id);
  if (existing) return res.redirect(`/admin/users?edit=${id}&err=` + encodeURIComponent(`Username "${username}" already in use.`));

  if (password && password.trim()) {
    db.prepare('UPDATE users SET username = ?, name = ?, password = ?, role = ?, status = ? WHERE id = ?').run(
      username.trim(), name.trim(), password.trim(), role, status, id
    );
  } else {
    db.prepare('UPDATE users SET username = ?, name = ?, role = ?, status = ? WHERE id = ?').run(
      username.trim(), name.trim(), role, status, id
    );
  }
  res.redirect('/admin/users?msg=' + encodeURIComponent('User updated successfully.'));
});

app.get('/admin/users/delete/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (req.currentUser.id === id) {
    return res.redirect('/admin/users?err=' + encodeURIComponent('You cannot delete your own logged-in admin account.'));
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.redirect('/admin/users?msg=' + encodeURIComponent('User deleted successfully.'));
});


// ==========================================
// 3. HOD SECTION (Department Scoped)
// ==========================================
const requireHOD = requireRole(['HOD']);

function getHODDept(user) {
  let dept = null;
  if (user.department_id) {
    dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(user.department_id);
  }
  if (!dept && user.faculty_id) {
    dept = db.prepare('SELECT * FROM departments WHERE hod_id = ?').get(user.faculty_id);
  }
  if (!dept) {
    dept = db.prepare('SELECT * FROM departments LIMIT 1').get();
  }
  return dept;
}

app.get('/hod/dashboard', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const hodName = req.currentUser.name;

  const facultyList = db.prepare(`
    SELECT * FROM faculty WHERE department_id = ? ORDER BY id ASC
  `).all(dept.id);

  const totalFaculty = facultyList.length;

  const content = renderHODDashboard({
    departmentName: dept.name,
    hodName,
    totalFaculty,
    facultyList
  });

  res.send(renderLayout({
    title: 'HOD Dashboard',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/hod/faculty', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const facultyList = db.prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY id ASC').all(dept.id);

  const content = renderHODFacultyList({
    departmentName: dept.name,
    facultyList
  });

  res.send(renderLayout({
    title: 'Faculty Management',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/hod/faculty/add', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const content = renderHODFacultyForm({ isEdit: false, departmentName: dept.name });

  res.send(renderLayout({
    title: 'Add Faculty',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/hod/faculty/add', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const { faculty_code, name, email, phone, designation, qualification } = req.body;

  if (!faculty_code || !name || !email) {
    return res.redirect('/hod/faculty/add?err=' + encodeURIComponent('Faculty ID, Name, and Email are required.'));
  }

  const existing = db.prepare('SELECT id FROM faculty WHERE faculty_code = ?').get(faculty_code.trim());
  if (existing) {
    return res.redirect('/hod/faculty/add?err=' + encodeURIComponent(`Faculty ID "${faculty_code}" already exists.`));
  }

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;

  db.prepare(`
    INSERT INTO faculty (faculty_code, name, email, phone, department_id, designation, qualification, date_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    faculty_code.trim(),
    name.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    dept.id,
    designation ? designation.trim() : '',
    qualification ? qualification.trim() : '',
    dateStr
  );

  res.redirect('/hod/faculty?msg=' + encodeURIComponent('Faculty added successfully.'));
});

app.get('/hod/faculty/view/:id', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const faculty = db.prepare('SELECT * FROM faculty WHERE id = ? AND department_id = ?').get(Number(req.params.id), dept.id);

  if (!faculty) {
    return res.redirect('/hod/faculty?err=' + encodeURIComponent('Faculty member not found in your department.'));
  }

  const content = renderHODFacultyView({ faculty, departmentName: dept.name });
  res.send(renderLayout({
    title: 'Faculty Details',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/hod/faculty/edit/:id', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const faculty = db.prepare('SELECT * FROM faculty WHERE id = ? AND department_id = ?').get(Number(req.params.id), dept.id);

  if (!faculty) {
    return res.redirect('/hod/faculty?err=' + encodeURIComponent('Faculty member not found in your department.'));
  }

  const content = renderHODFacultyForm({ isEdit: true, faculty, departmentName: dept.name });
  res.send(renderLayout({
    title: 'Edit Faculty',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/hod/faculty/edit/:id', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const id = Number(req.params.id);
  const { name, email, phone, designation, qualification } = req.body;

  const faculty = db.prepare('SELECT * FROM faculty WHERE id = ? AND department_id = ?').get(id, dept.id);
  if (!faculty) {
    return res.redirect('/hod/faculty?err=' + encodeURIComponent('Faculty member not found in your department.'));
  }

  db.prepare(`
    UPDATE faculty
    SET name = ?, email = ?, phone = ?, designation = ?, qualification = ?
    WHERE id = ? AND department_id = ?
  `).run(
    name.trim(),
    email.trim(),
    phone ? phone.trim() : '',
    designation ? designation.trim() : '',
    qualification ? qualification.trim() : '',
    id,
    dept.id
  );

  res.redirect('/hod/faculty?msg=' + encodeURIComponent('Faculty details updated successfully.'));
});

app.get('/hod/department', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const hod = db.prepare('SELECT name FROM faculty WHERE id = ?').get(dept.hod_id);
  dept.hod_name = hod ? hod.name : req.currentUser.name;

  const facultyList = db.prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY id ASC').all(dept.id);

  const content = renderHODDepartmentInfo({
    department: dept,
    totalFaculty: facultyList.length,
    facultyList
  });

  res.send(renderLayout({
    title: 'Department Information',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/hod/timetable', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const schedules = db.prepare(`
    SELECT t.*, f.name as faculty_name
    FROM timetable t
    JOIN faculty f ON t.faculty_id = f.id
    WHERE f.department_id = ?
    ORDER BY t.id ASC
  `).all(dept.id);

  const facultyList = db.prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY name ASC').all(dept.id);

  let editSchedule = null;
  if (req.query.edit) {
    editSchedule = db.prepare(`
      SELECT t.* FROM timetable t
      JOIN faculty f ON t.faculty_id = f.id
      WHERE t.id = ? AND f.department_id = ?
    `).get(Number(req.query.edit), dept.id);
  }

  const content = renderHODTimetable({
    departmentName: dept.name,
    schedules,
    facultyList,
    editSchedule
  });

  res.send(renderLayout({
    title: 'Department Timetable',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/hod/timetable/add', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const { day, time, faculty_id, subject, room } = req.body;

  // Validate faculty belongs to HOD department
  const faculty = db.prepare('SELECT id FROM faculty WHERE id = ? AND department_id = ?').get(Number(faculty_id), dept.id);
  if (!faculty) {
    return res.redirect('/hod/timetable?err=' + encodeURIComponent('Selected faculty does not belong to your department.'));
  }

  db.prepare('INSERT INTO timetable (day, time, faculty_id, subject, room) VALUES (?, ?, ?, ?, ?)').run(
    day, time.trim(), Number(faculty_id), subject.trim(), room.trim()
  );

  res.redirect('/hod/timetable?msg=' + encodeURIComponent('Schedule added successfully.'));
});

app.post('/hod/timetable/edit/:id', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const id = Number(req.params.id);
  const { day, time, faculty_id, subject, room } = req.body;

  const existing = db.prepare(`
    SELECT t.id FROM timetable t
    JOIN faculty f ON t.faculty_id = f.id
    WHERE t.id = ? AND f.department_id = ?
  `).get(id, dept.id);

  if (!existing) {
    return res.redirect('/hod/timetable?err=' + encodeURIComponent('Schedule not found in your department.'));
  }

  db.prepare('UPDATE timetable SET day = ?, time = ?, faculty_id = ?, subject = ?, room = ? WHERE id = ?').run(
    day, time.trim(), Number(faculty_id), subject.trim(), room.trim(), id
  );

  res.redirect('/hod/timetable?msg=' + encodeURIComponent('Schedule updated successfully.'));
});

app.get('/hod/timetable/delete/:id', requireHOD, (req, res) => {
  const dept = getHODDept(req.currentUser);
  const id = Number(req.params.id);

  const existing = db.prepare(`
    SELECT t.id FROM timetable t
    JOIN faculty f ON t.faculty_id = f.id
    WHERE t.id = ? AND f.department_id = ?
  `).get(id, dept.id);

  if (!existing) {
    return res.redirect('/hod/timetable?err=' + encodeURIComponent('Schedule not found in your department.'));
  }

  db.prepare('DELETE FROM timetable WHERE id = ?').run(id);
  res.redirect('/hod/timetable?msg=' + encodeURIComponent('Schedule deleted successfully.'));
});


// ==========================================
// 4. FACULTY SECTION (Self-Service)
// ==========================================
const requireFaculty = requireRole(['Faculty']);

function getFacultyRecord(user) {
  let fac = null;
  if (user.faculty_id) {
    fac = db.prepare('SELECT * FROM faculty WHERE id = ?').get(user.faculty_id);
  }
  if (!fac) {
    fac = db.prepare('SELECT * FROM faculty WHERE name = ?').get(user.name);
  }
  if (!fac) {
    fac = db.prepare('SELECT * FROM faculty LIMIT 1').get();
  }
  return fac;
}

app.get('/faculty/dashboard', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const dept = fac.department_id ? db.prepare('SELECT name FROM departments WHERE id = ?').get(fac.department_id) : null;
  const timetable = db.prepare('SELECT * FROM timetable WHERE faculty_id = ? ORDER BY id ASC').all(fac.id);

  // Fetch assigned courses
  const courses = db.prepare(`
    SELECT fc.id as assignment_id, fc.section, fc.total_students,
           c.id, c.course_code, c.course_name, c.credits, c.semester,
           d.name as department_name
    FROM faculty_courses fc
    JOIN courses c ON fc.course_id = c.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE fc.faculty_id = ?
    ORDER BY c.course_code ASC
  `).all(fac.id);

  // Fetch coursework assignments
  const assignments = db.prepare(`
    SELECT a.*, c.course_code, c.course_name
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.faculty_id = ?
    ORDER BY a.id DESC
  `).all(fac.id);

  const content = renderFacultyDashboard({
    faculty: fac,
    departmentName: dept ? dept.name : 'Not Assigned',
    courses,
    assignments,
    timetable
  });

  res.send(renderLayout({
    title: 'Faculty Dashboard',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/faculty/profile', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const dept = fac.department_id ? db.prepare('SELECT name FROM departments WHERE id = ?').get(fac.department_id) : null;

  const content = renderFacultyProfile({
    faculty: fac,
    departmentName: dept ? dept.name : 'Not Assigned'
  });

  res.send(renderLayout({
    title: 'My Profile',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/faculty/profile/edit', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const dept = fac.department_id ? db.prepare('SELECT name FROM departments WHERE id = ?').get(fac.department_id) : null;

  const content = renderFacultyProfileEdit({
    faculty: fac,
    departmentName: dept ? dept.name : 'Not Assigned'
  });

  res.send(renderLayout({
    title: 'Edit Profile',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/faculty/profile/edit', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const { name, email, phone, qualification } = req.body;

  if (!name || !email) {
    return res.redirect('/faculty/profile/edit?err=' + encodeURIComponent('Name and Email are required.'));
  }

  db.prepare(`
    UPDATE faculty
    SET name = ?, email = ?, phone = ?, qualification = ?
    WHERE id = ?
  `).run(name.trim(), email.trim(), phone ? phone.trim() : '', qualification ? qualification.trim() : '', fac.id);

  // Update user name as well
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.currentUser.id);

  res.redirect('/faculty/profile?msg=' + encodeURIComponent('Profile updated successfully.'));
});

app.get('/faculty/courses', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const courses = db.prepare(`
    SELECT fc.id as assignment_id, fc.section, fc.total_students,
           c.id, c.course_code, c.course_name, c.credits, c.semester,
           d.name as department_name
    FROM faculty_courses fc
    JOIN courses c ON fc.course_id = c.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE fc.faculty_id = ?
    ORDER BY c.course_code ASC
  `).all(fac.id);

  const content = renderFacultyCourses({ courses });
  res.send(renderLayout({
    title: 'My Courses',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/faculty/assignments', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const assignments = db.prepare(`
    SELECT a.*, c.course_code, c.course_name
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.faculty_id = ?
    ORDER BY a.id DESC
  `).all(fac.id);

  const content = renderFacultyAssignments({ assignments });
  res.send(renderLayout({
    title: 'Coursework Assignments',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/faculty/assignments/add', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const courses = db.prepare(`
    SELECT c.id, c.course_code, c.course_name, fc.section
    FROM faculty_courses fc
    JOIN courses c ON fc.course_id = c.id
    WHERE fc.faculty_id = ?
    ORDER BY c.course_code ASC
  `).all(fac.id);

  const content = renderFacultyAssignmentForm({ courses, error: req.query.err });
  res.send(renderLayout({
    title: 'Add Assignment',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/faculty/assignments/add', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const { course_id, title, description, due_date } = req.body;

  if (!course_id || !title || !due_date) {
    return res.redirect('/faculty/assignments/add?err=' + encodeURIComponent('Course, title, and due date are required.'));
  }

  db.prepare(`
    INSERT INTO assignments (faculty_id, course_id, title, description, due_date, total_submissions, status)
    VALUES (?, ?, ?, ?, ?, 0, 'Active')
  `).run(fac.id, parseInt(course_id, 10), title.trim(), description ? description.trim() : '', due_date.trim());

  res.redirect('/faculty/assignments?msg=' + encodeURIComponent('Assignment created successfully.'));
});

app.get('/faculty/assignments/delete/:id', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const assignmentId = req.params.id;

  db.prepare('DELETE FROM assignments WHERE id = ? AND faculty_id = ?').run(assignmentId, fac.id);
  res.redirect('/faculty/assignments?msg=' + encodeURIComponent('Assignment deleted successfully.'));
});

app.get('/faculty/attendance', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const courses = db.prepare(`
    SELECT c.id, c.course_code, c.course_name, fc.section
    FROM faculty_courses fc
    JOIN courses c ON fc.course_id = c.id
    WHERE fc.faculty_id = ?
    ORDER BY c.course_code ASC
  `).all(fac.id);

  const attendance = db.prepare(`
    SELECT att.*, c.course_code, c.course_name
    FROM attendance att
    JOIN courses c ON att.course_id = c.id
    WHERE att.faculty_id = ?
    ORDER BY att.id DESC
  `).all(fac.id);

  const content = renderFacultyAttendance({ attendance, courses });
  res.send(renderLayout({
    title: 'Attendance Records',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.post('/faculty/attendance', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const { course_id, date, topic, present_count, total_count } = req.body;

  if (!course_id || !date || !topic) {
    return res.redirect('/faculty/attendance?err=' + encodeURIComponent('Course, date, and topic are required.'));
  }

  db.prepare(`
    INSERT INTO attendance (faculty_id, course_id, date, topic, present_count, total_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    fac.id,
    parseInt(course_id, 10),
    date.trim(),
    topic.trim(),
    parseInt(present_count, 10) || 0,
    parseInt(total_count, 10) || 0
  );

  res.redirect('/faculty/attendance?msg=' + encodeURIComponent('Attendance recorded successfully.'));
});

app.get('/faculty/timetable', requireFaculty, (req, res) => {
  const fac = getFacultyRecord(req.currentUser);
  const timetable = db.prepare('SELECT * FROM timetable WHERE faculty_id = ? ORDER BY id ASC').all(fac.id);

  const content = renderFacultyTimetable({ timetable });
  res.send(renderLayout({
    title: 'My Timetable',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});


// ==========================================
// 5. DIRECTOR SECTION (Institution Overview)
// ==========================================
const requireDirector = requireRole(['Director']);

app.get('/director/dashboard', requireDirector, (req, res) => {
  const totalFaculty = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
  const totalDepartments = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
  const totalHODs = db.prepare('SELECT COUNT(*) as c FROM departments WHERE hod_id IS NOT NULL').get().c;

  const departmentsSummary = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name, COUNT(fc.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const hodList = db.prepare(`
    SELECT d.name as department_name, f.name as hod_name, f.email, f.phone
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const content = renderDirectorDashboard({
    totalFaculty,
    totalDepartments,
    totalHODs,
    departmentsSummary,
    hodList
  });

  res.send(renderLayout({
    title: 'Director Dashboard',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/director/faculty', requireDirector, (req, res) => {
  const facultyList = db.prepare(`
    SELECT f.*, d.name as department_name
    FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY f.id ASC
  `).all();

  const content = renderDirectorFaculty({ facultyList });
  res.send(renderLayout({
    title: 'Faculty List',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/director/departments', requireDirector, (req, res) => {
  const departmentsSummary = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name, COUNT(fc.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const content = renderDirectorDepartments({ departmentsSummary });
  res.send(renderLayout({
    title: 'Department List',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/director/hods', requireDirector, (req, res) => {
  const hodList = db.prepare(`
    SELECT d.name as department_name, f.name as hod_name, f.email, f.phone
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const content = renderDirectorHODs({ hodList });
  res.send(renderLayout({
    title: 'HOD List',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/director/timetable', requireDirector, (req, res) => {
  const timetableList = db.prepare(`
    SELECT t.*, f.name as faculty_name, d.name as department_name
    FROM timetable t
    JOIN faculty f ON t.faculty_id = f.id
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY t.id ASC
  `).all();

  const content = renderDirectorTimetable({ timetableList });
  res.send(renderLayout({
    title: 'Institution Timetable',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});


// ==========================================
// 6. VP SECTION (Overview & Reports)
// ==========================================
const requireVP = requireRole(['VP']);

app.get('/vp/dashboard', requireVP, (req, res) => {
  const totalFaculty = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
  const totalDepartments = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
  const totalHODs = db.prepare('SELECT COUNT(*) as c FROM departments WHERE hod_id IS NOT NULL').get().c;

  const facultyOverview = db.prepare(`
    SELECT d.name as department_name, COUNT(f.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON f.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const departmentOverview = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name, COUNT(fc.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const content = renderVPDashboard({
    totalFaculty,
    totalDepartments,
    totalHODs,
    facultyOverview,
    departmentOverview
  });

  res.send(renderLayout({
    title: 'VP Dashboard',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/vp/faculty', requireVP, (req, res) => {
  const facultyList = db.prepare(`
    SELECT f.*, d.name as department_name
    FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY f.id ASC
  `).all();

  const content = renderVPFaculty({ facultyList });
  res.send(renderLayout({
    title: 'Faculty Overview',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/vp/departments', requireVP, (req, res) => {
  const departmentOverview = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name, COUNT(fc.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const content = renderVPDepartments({ departmentOverview });
  res.send(renderLayout({
    title: 'Department Overview',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/vp/hods', requireVP, (req, res) => {
  const hodList = db.prepare(`
    SELECT d.name as department_name, f.name as hod_name, f.email, f.phone
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const content = renderVPHODs({ hodList });
  res.send(renderLayout({
    title: 'HOD Overview',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/vp/reports', requireVP, (req, res) => {
  const departmentSummary = db.prepare(`
    SELECT d.name, f.name as hod_name, COUNT(DISTINCT fc.id) as faculty_count, COUNT(DISTINCT t.id) as timetable_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    LEFT JOIN timetable t ON t.faculty_id = fc.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const designationSummary = db.prepare(`
    SELECT designation, COUNT(*) as count
    FROM faculty
    GROUP BY designation
    ORDER BY count DESC
  `).all();

  const content = renderVPReports({
    departmentSummary,
    designationSummary
  });

  res.send(renderLayout({
    title: 'Reports',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});


// ==========================================
// 7. PRESIDENT SECTION (Executive Overview)
// ==========================================
const requirePresident = requireRole(['President']);

app.get('/president/dashboard', requirePresident, (req, res) => {
  const totalFaculty = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
  const totalDepartments = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
  const totalHODs = db.prepare('SELECT COUNT(*) as c FROM departments WHERE hod_id IS NOT NULL').get().c;

  const facultyOverview = db.prepare(`
    SELECT d.name as department_name, COUNT(f.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON f.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const departmentOverview = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name, COUNT(fc.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const hodList = db.prepare(`
    SELECT d.name as department_name, f.name as hod_name
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const content = renderPresidentDashboard({
    totalFaculty,
    totalDepartments,
    totalHODs,
    facultyOverview,
    departmentOverview,
    hodList
  });

  res.send(renderLayout({
    title: 'President Dashboard',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/president/faculty', requirePresident, (req, res) => {
  const facultyOverview = db.prepare(`
    SELECT d.name as department_name, COUNT(f.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON f.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const facultyList = db.prepare(`
    SELECT f.*, d.name as department_name
    FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.id
    ORDER BY f.id ASC
  `).all();

  const content = renderPresidentFacultyOverview({
    facultyOverview,
    facultyList
  });

  res.send(renderLayout({
    title: 'Faculty Overview',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/president/departments', requirePresident, (req, res) => {
  const departmentOverview = db.prepare(`
    SELECT d.id, d.name, f.name as hod_name, COUNT(fc.id) as faculty_count
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    LEFT JOIN faculty fc ON fc.department_id = d.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `).all();

  const content = renderPresidentDepartmentOverview({
    departmentOverview
  });

  res.send(renderLayout({
    title: 'Department Overview',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

app.get('/president/hods', requirePresident, (req, res) => {
  const hodList = db.prepare(`
    SELECT d.name as department_name, f.name as hod_name
    FROM departments d
    LEFT JOIN faculty f ON d.hod_id = f.id
    ORDER BY d.id ASC
  `).all();

  const content = renderPresidentHODOverview({ hodList });
  res.send(renderLayout({
    title: 'HOD Overview',
    content,
    user: req.currentUser,
    message: req.query.msg,
    error: req.query.err
  }));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Faculty Management System running at http://localhost:${PORT}`);
});

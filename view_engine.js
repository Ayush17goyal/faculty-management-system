const fs = require('node:fs');
const path = require('node:path');

function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadTemplateFile(filename) {
  const filePath = path.join(__dirname, 'views', filename);
  return fs.readFileSync(filePath, 'utf8');
}

function parseSections(content) {
  const sectionRegex = /<!--\s*SECTION:\s*([a-zA-Z0-9_-]+)\s*-->([\s\S]*?)(?=(?:<!--\s*SECTION:|$))/g;
  const sections = {};
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    sections[match[1].trim()] = match[2].trim();
  }
  if (Object.keys(sections).length === 0) {
    sections['default'] = content.trim();
  }
  return sections;
}

function evalTemplate(templateStr, context) {
  const keys = Object.keys(context);
  const values = Object.values(context);
  const b = String.fromCharCode(96);
  const fn = new Function(...keys, 'return ' + b + templateStr + b + ';');
  return fn(...values);
}

// ------------------------------------------
// 1. Layout & Login (from layout.html)
// ------------------------------------------
const layoutSections = parseSections(loadTemplateFile('layout.html'));

function getNavItems(role) {
  switch (role) {
    case 'HOD':
      return [
        { label: 'Dashboard', url: '/hod/dashboard' },
        { label: 'Faculty', url: '/hod/faculty' },
        { label: 'Department', url: '/hod/department' },
        { label: 'Timetable', url: '/hod/timetable' },
      ];
    case 'Faculty':
      return [
        { label: 'Dashboard', url: '/faculty/dashboard' },
        { label: 'My Profile', url: '/faculty/profile' },
        { label: 'My Courses', url: '/faculty/courses' },
        { label: 'Assignments', url: '/faculty/assignments' },
        { label: 'Attendance', url: '/faculty/attendance' },
        { label: 'My Timetable', url: '/faculty/timetable' },
      ];
    case 'Director':
      return [
        { label: 'Dashboard', url: '/director/dashboard' },
        { label: 'Faculty', url: '/director/faculty' },
        { label: 'Departments', url: '/director/departments' },
        { label: 'HODs', url: '/director/hods' },
        { label: 'Timetable', url: '/director/timetable' },
      ];
    case 'VP':
      return [
        { label: 'Dashboard', url: '/vp/dashboard' },
        { label: 'Faculty', url: '/vp/faculty' },
        { label: 'Departments', url: '/vp/departments' },
        { label: 'HODs', url: '/vp/hods' },
        { label: 'Reports', url: '/vp/reports' },
      ];
    case 'President':
      return [
        { label: 'Dashboard', url: '/president/dashboard' },
        { label: 'Faculty Overview', url: '/president/faculty' },
        { label: 'Department Overview', url: '/president/departments' },
        { label: 'HOD Overview', url: '/president/hods' },
      ];
    case 'Admin':
    default:
      return [
        { label: 'Dashboard', url: '/admin/dashboard' },
        { label: 'Faculty', url: '/admin/faculty' },
        { label: 'Faculty History', url: '/admin/faculty-history' },
        { label: 'Departments', url: '/admin/departments' },
        { label: 'HOD', url: '/admin/hod' },
        { label: 'Timetable', url: '/admin/timetable' },
        { label: 'Users', url: '/admin/users' },
      ];
  }
}

function renderLayout({ title, content, user, message, error }) {
  const role = user ? user.role : 'Admin';
  const navItems = getNavItems(role);

  let sidebarLinks = '';
  for (const item of navItems) {
    const iconMap = { Dashboard: '▦', Faculty: '♙', 'Faculty History': '↺', 'My Profile': '♙', 'My Courses': '▱', Assignments: '✓', Attendance: '◫', 'My Timetable': '▤', Department: '▣', Departments: '▣', HOD: '♜', HODs: '♜', Timetable: '▤', Users: '◉', Reports: '▥', 'Faculty Overview': '♙', 'Department Overview': '▣', 'HOD Overview': '♜' };
    const titleText = String(title || '').toLowerCase();
    const itemKey = item.label.toLowerCase().replace(' overview', '').replace('my ', '');
    const isActive = item.label === 'Faculty'
      ? titleText === 'faculty management'
      : titleText.includes(itemKey);
    sidebarLinks += `<div class="sidebar-item"><a class="${isActive ? 'active' : ''}" href="${item.url}"><span class="nav-icon">${iconMap[item.label] || '•'}</span><span>${item.label}</span></a></div>\n`;
  }
  sidebarLinks += `<div class="sidebar-item sidebar-logout"><a href="/logout"><span class="nav-icon">↪</span><span>Sign out</span></a></div>`;

  const userName = user && user.name ? user.name : 'System User';
  const userRole = user && user.role ? user.role : role;
  const userInitials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'SU';

  return evalTemplate(layoutSections['layout'], {
    title: title || '',
    sidebarLinks,
    message: message || '',
    error: error || '',
    content: content || '',
    userName,
    userRole,
    userInitials
  });
}

// ------------------------------------------
// Faculty Career History Search
// ------------------------------------------
const facultyHistoryTmpl = loadTemplateFile('faculty_history.html');

function renderFacultyHistory({ searchQuery = '', facultyList = [] }) {
  let resultsHtml = '';

  if (!searchQuery) {
    resultsHtml = `<div class="history-empty"><strong>Search the faculty register</strong><p>Enter a faculty name or ID to view academic qualifications and appointment history.</p></div>`;
  } else if (!facultyList.length) {
    resultsHtml = `<div class="history-empty"><strong>No faculty record found</strong><p>Check the spelling or try the faculty ID.</p></div>`;
  } else {
    resultsHtml = facultyList.map(faculty => {
      const currentAppointment = (faculty.careerHistory || []).find(entry => !entry.end_year);
      const timeline = (faculty.careerHistory || []).map((entry, index) => `
        <div class="timeline-item ${index === 0 ? 'current' : ''}">
          <div class="timeline-marker"></div>
          <div class="timeline-detail">
            <div class="timeline-period">${escapeHTML(entry.start_year)}–${entry.end_year ? escapeHTML(entry.end_year) : 'Present'}</div>
            <h4>${escapeHTML(entry.title)}</h4>
            <div>${escapeHTML(entry.organization)}${entry.department ? ` · ${escapeHTML(entry.department)}` : ''}</div>
            ${entry.notes ? `<p>${escapeHTML(entry.notes)}</p>` : ''}
          </div>
        </div>`).join('');

      return `
        <article class="history-record">
          <header class="faculty-summary">
            <div class="faculty-monogram">${escapeHTML(faculty.name).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>
            <div class="faculty-identity"><h3>${escapeHTML(faculty.name)}</h3><p>${escapeHTML(faculty.faculty_code)} · ${escapeHTML(faculty.department_name || 'Department not assigned')}</p></div>
            <div class="current-title"><span>Current designation</span><strong>${escapeHTML(currentAppointment ? currentAppointment.title : (faculty.designation || 'Not recorded'))}</strong></div>
          </header>
          <div class="faculty-facts">
            <div><span>Qualification</span><strong>${escapeHTML(faculty.qualification || 'Not recorded')}</strong></div>
            <div><span>Email</span><strong>${escapeHTML(faculty.email)}</strong></div>
            <div><span>Phone</span><strong>${escapeHTML(faculty.phone || 'Not recorded')}</strong></div>
          </div>
          <div class="history-content"><h4 class="history-title">Appointment history</h4><div class="timeline">${timeline || '<p>No appointment history has been recorded.</p>'}</div></div>
        </article>`;
    }).join('');
  }

  return evalTemplate(facultyHistoryTmpl, {
    searchQuery: escapeHTML(searchQuery),
    resultsHtml
  });
}

function renderLogin({ error, message, role = 'Admin', username = 'admin' }) {
  return evalTemplate(layoutSections['login'], {
    error: error || '',
    message: message || '',
    role,
    username
  });
}

// ------------------------------------------
// 2. Admin Dashboard (from dashboard.html)
// ------------------------------------------
const dashboardTmpl = loadTemplateFile('dashboard.html');

function renderDashboard({ totalFaculty, totalDepartments, totalHODs, totalUsers, recentFaculty, monthlyStats = [], designationStats = [] }) {
  let rows = '';
  if (recentFaculty && recentFaculty.length > 0) {
    for (const f of recentFaculty) {
      rows += `
        <tr>
          <td>${f.faculty_code}</td>
          <td>${f.name}</td>
          <td>${f.department_name || 'N/A'}</td>
          <td>${f.date_added || 'N/A'}</td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="4">No faculty records found.</td></tr>`;
  }

  const chartColors = ['#123f73', '#6d7b8f', '#d6a21d'];
  const maxFaculty = Math.max(1, ...monthlyStats.map(d => Number(d.faculty_count) || 0));
  let monthlyBars = '';
  let pieLegend = '';
  let accumulated = 0;
  const pieParts = [];

  monthlyStats.forEach((month) => {
    const count = Number(month.faculty_count) || 0;
    const height = Math.max(count > 0 ? 10 : 0, Math.round((count / maxFaculty) * 100));
    monthlyBars += `<div class="column-item"><div class="column-count">${count}</div><div class="column" style="height:${height}%"></div><div class="column-label">${month.month}</div></div>`;
  });

  designationStats.forEach((designation, index) => {
    const count = Number(designation.faculty_count) || 0;
    const color = chartColors[index % chartColors.length];
    const start = totalFaculty > 0 ? (accumulated / totalFaculty) * 100 : 0;
    accumulated += count;
    const end = totalFaculty > 0 ? (accumulated / totalFaculty) * 100 : start;
    pieParts.push(`${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    const percentage = totalFaculty > 0 ? Math.round((count / totalFaculty) * 100) : 0;
    pieLegend += `<div class="legend-row"><span class="legend-dot" style="background:${color}"></span><span class="legend-name">${designation.name}</span><strong>${count} (${percentage}%)</strong></div>`;
  });

  const pieGradient = pieParts.length ? `conic-gradient(${pieParts.join(', ')})` : 'conic-gradient(#dfe5ec 0 100%)';

  return evalTemplate(dashboardTmpl, {
    totalFaculty,
    totalDepartments,
    totalHODs,
    totalUsers,
    rows,
    monthlyBars,
    pieLegend,
    pieGradient
  });
}

// ------------------------------------------
// 3. Faculty List (from faculty.html)
// ------------------------------------------
const facultyListTmpl = loadTemplateFile('faculty.html');

function renderFacultyList({ facultyList, searchQuery = '' }) {
  let rows = '';
  if (facultyList && facultyList.length > 0) {
    for (const f of facultyList) {
      rows += `
        <tr>
          <td>${f.faculty_code}</td>
          <td>${f.name}</td>
          <td>${f.department_name || 'N/A'}</td>
          <td>${f.email}</td>
          <td>${f.designation}</td>
          <td>
            <a href="/admin/faculty/edit/${f.id}">Edit</a> | 
            <a href="/admin/faculty/delete/${f.id}" onclick="return confirm('Are you sure you want to delete faculty ${f.name}?');">Delete</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="6">No faculty records found.</td></tr>`;
  }

  return evalTemplate(facultyListTmpl, {
    searchQuery: searchQuery || '',
    rows
  });
}

// ------------------------------------------
// 4. Faculty Form (from faculty_form.html)
// ------------------------------------------
const facultyFormTmpl = loadTemplateFile('faculty_form.html');

function renderFacultyForm({ isEdit = false, faculty = {}, departments = [] }) {
  const formTitle = isEdit ? 'Edit Faculty' : 'Add Faculty';
  const actionUrl = isEdit ? `/admin/faculty/edit/${faculty.id}` : '/admin/faculty/add';

  let deptOptions = `<option value="">-- Select Department --</option>`;
  for (const dept of departments) {
    const selected = faculty.department_id == dept.id ? 'selected' : '';
    deptOptions += `<option value="${dept.id}" ${selected}>${dept.name}</option>`;
  }

  return evalTemplate(facultyFormTmpl, {
    formTitle,
    actionUrl,
    faculty,
    deptOptions
  });
}

// ------------------------------------------
// 5. Departments List (from departments.html)
// ------------------------------------------
const departmentsTmpl = loadTemplateFile('departments.html');

function renderDepartmentsList({ departments, showAddForm = false, editDept = null, facultyList = [] }) {
  let rows = '';
  if (departments && departments.length > 0) {
    for (const d of departments) {
      rows += `
        <tr>
          <td>${d.id}</td>
          <td>${d.name}</td>
          <td>${d.hod_name || 'None'}</td>
          <td>
            <a href="/admin/departments/edit/${d.id}">Edit</a> | 
            <a href="/admin/departments/delete/${d.id}" onclick="return confirm('Are you sure you want to delete department ${d.name}?');">Delete</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="4">No departments found.</td></tr>`;
  }

  let formHtml = '';
  if (editDept) {
    let facultyOptions = `<option value="">-- None / Select Faculty --</option>`;
    for (const f of facultyList) {
      const selected = editDept.hod_id == f.id ? 'selected' : '';
      facultyOptions += `<option value="${f.id}" ${selected}>${f.name} (${f.faculty_code})</option>`;
    }

    formHtml = `
      <div id="dept-form" style="margin-top: 25px;">
        <div style="font-weight: bold; margin-bottom: 6px;">Edit Department</div>
        <form method="POST" action="/admin/departments/edit/${editDept.id}">
          <table class="form-table">
            <tr>
              <td style="width: 130px;">Department Name:</td>
              <td><input type="text" name="name" value="${editDept.name}" required style="width: 180px;"></td>
            </tr>
            <tr>
              <td>HOD:</td>
              <td>
                <select name="hod_id" style="width: 180px;">
                  ${facultyOptions}
                </select>
              </td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-top: 8px;">
                <input type="submit" value="Update Department">
                <button type="button" onclick="window.location.href='/admin/departments'" style="margin-left: 5px;">Cancel</button>
              </td>
            </tr>
          </table>
        </form>
      </div>
    `;
  } else if (showAddForm) {
    let facultyOptions = `<option value="">-- None / Select Faculty --</option>`;
    for (const f of facultyList) {
      facultyOptions += `<option value="${f.id}">${f.name} (${f.faculty_code})</option>`;
    }

    formHtml = `
      <div id="dept-form" style="margin-top: 25px;">
        <div style="font-weight: bold; margin-bottom: 6px;">Add Department</div>
        <form method="POST" action="/admin/departments/add">
          <table class="form-table">
            <tr>
              <td style="width: 130px;">Department Name:</td>
              <td><input type="text" name="name" placeholder="e.g. CSE" required style="width: 180px;"></td>
            </tr>
            <tr>
              <td>HOD:</td>
              <td>
                <select name="hod_id" style="width: 180px;">
                  ${facultyOptions}
                </select>
              </td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-top: 8px;">
                <input type="submit" value="Add Department">
                <button type="button" onclick="window.location.href='/admin/departments'" style="margin-left: 5px;">Cancel</button>
              </td>
            </tr>
          </table>
        </form>
      </div>
    `;
  }

  return evalTemplate(departmentsTmpl, {
    rows,
    formHtml
  });
}

// ------------------------------------------
// 6. HOD Management (from hod.html)
// ------------------------------------------
const hodTmpl = loadTemplateFile('hod.html');

function renderHODManagement({ hodList, departments, facultyList, selectedDeptId }) {
  let rows = '';
  if (hodList && hodList.length > 0) {
    for (const h of hodList) {
      rows += `
        <tr>
          <td>${h.department_name}</td>
          <td>${h.hod_name || 'Not Assigned'}</td>
          <td>
            <a href="/admin/hod?dept_id=${h.department_id}#assign-hod">Change</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="3">No departments found.</td></tr>`;
  }

  let deptOptions = `<option value="">-- Select Department --</option>`;
  for (const d of departments) {
    const sel = selectedDeptId == d.id ? 'selected' : '';
    deptOptions += `<option value="${d.id}" ${sel}>${d.name}</option>`;
  }

  let facultyOptions = `<option value="">-- Select Faculty --</option>`;
  for (const f of facultyList) {
    facultyOptions += `<option value="${f.id}">${f.name} (${f.faculty_code} - ${f.department_name || 'No Dept'})</option>`;
  }

  return evalTemplate(hodTmpl, {
    rows,
    deptOptions,
    facultyOptions
  });
}

// ------------------------------------------
// 7. Timetable (from timetable.html)
// ------------------------------------------
const timetableTmpl = loadTemplateFile('timetable.html');

function renderTimetable({ schedules, facultyList, editSchedule = null }) {
  let rows = '';
  if (schedules && schedules.length > 0) {
    for (const s of schedules) {
      rows += `
        <tr>
          <td>${s.day}</td>
          <td>${s.time}</td>
          <td>${s.faculty_name}</td>
          <td>${s.subject}</td>
          <td>${s.room}</td>
          <td>
            <a href="/admin/timetable?edit=${s.id}#schedule-form">Edit</a> | 
            <a href="/admin/timetable/delete/${s.id}" onclick="return confirm('Are you sure you want to delete this schedule?');">Delete</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="6">No timetable schedules found.</td></tr>`;
  }

  const isEdit = !!editSchedule;
  const formTitle = isEdit ? 'Edit Schedule' : 'Add Schedule';
  const formAction = isEdit ? `/admin/timetable/edit/${editSchedule.id}` : '/admin/timetable/add';

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let dayOptions = `<option value="">-- Select Day --</option>`;
  for (const d of days) {
    const sel = (editSchedule && editSchedule.day === d) ? 'selected' : '';
    dayOptions += `<option value="${d}" ${sel}>${d}</option>`;
  }

  let facultyOptions = `<option value="">-- Select Faculty --</option>`;
  for (const f of facultyList) {
    const sel = (editSchedule && editSchedule.faculty_id == f.id) ? 'selected' : '';
    facultyOptions += `<option value="${f.id}" ${sel}>${f.name} (${f.department_name || 'No Dept'})</option>`;
  }

  return evalTemplate(timetableTmpl, {
    rows,
    isEdit,
    formTitle,
    formAction,
    dayOptions,
    facultyOptions,
    editSchedule
  });
}

// ------------------------------------------
// 8. Users (from users.html)
// ------------------------------------------
const usersTmpl = loadTemplateFile('users.html');

function renderUsers({ users, editUser = null }) {
  let rows = '';
  if (users && users.length > 0) {
    for (const u of users) {
      rows += `
        <tr>
          <td>${u.id}</td>
          <td>${u.username}</td>
          <td>${u.name}</td>
          <td>${u.role}</td>
          <td>${u.status}</td>
          <td>
            <a href="/admin/users?edit=${u.id}#user-form">Edit</a> | 
            <a href="/admin/users/delete/${u.id}" onclick="return confirm('Are you sure you want to delete user ${u.username}?');">Delete</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="6">No users found.</td></tr>`;
  }

  const isEdit = !!editUser;
  const formTitle = isEdit ? 'Edit User' : 'Create User';
  const formAction = isEdit ? `/admin/users/edit/${editUser.id}` : '/admin/users/create';

  const roles = ['Admin', 'HOD', 'Faculty', 'Director', 'VP', 'President'];
  let roleOptions = `<option value="">-- Select Role --</option>`;
  for (const r of roles) {
    const sel = (editUser && editUser.role === r) ? 'selected' : (!editUser && r === 'Faculty' ? 'selected' : '');
    roleOptions += `<option value="${r}" ${sel}>${r}</option>`;
  }

  const statuses = ['Active', 'Inactive'];
  let statusOptions = '';
  for (const s of statuses) {
    const sel = (editUser && editUser.status === s) ? 'selected' : (!editUser && s === 'Active' ? 'selected' : '');
    statusOptions += `<option value="${s}" ${sel}>${s}</option>`;
  }

  return evalTemplate(usersTmpl, {
    rows,
    isEdit,
    formTitle,
    formAction,
    roleOptions,
    statusOptions,
    editUser
  });
}

// ------------------------------------------
// 9. Faculty Portal (from faculty_portal.html)
// ------------------------------------------
const facultySections = parseSections(loadTemplateFile('faculty_portal.html'));

function renderFacultyDashboard({ faculty, departmentName, courses = [], assignments = [], timetable = [] }) {
  let courseRows = '';
  if (courses && courses.length > 0) {
    for (const c of courses) {
      courseRows += `
        <tr>
          <td>${c.course_code}</td>
          <td>${c.course_name}</td>
          <td>${c.semester || 'N/A'}</td>
          <td>${c.section || 'A'}</td>
          <td>${c.credits || 3}</td>
          <td>${c.total_students || 0}</td>
        </tr>`;
    }
  } else {
    courseRows = `<tr><td colspan="6">No courses assigned currently.</td></tr>`;
  }

  let assignmentRows = '';
  if (assignments && assignments.length > 0) {
    for (const a of assignments) {
      assignmentRows += `
        <tr>
          <td>${a.title}</td>
          <td>${a.course_code || a.course_name || 'N/A'}</td>
          <td>${a.due_date}</td>
          <td>${a.total_submissions || 0}</td>
          <td>${a.status}</td>
        </tr>`;
    }
  } else {
    assignmentRows = `<tr><td colspan="5">No active coursework assignments.</td></tr>`;
  }

  let timetableRows = '';
  if (timetable && timetable.length > 0) {
    for (const t of timetable) {
      timetableRows += `
        <tr>
          <td>${t.day}</td>
          <td>${t.time}</td>
          <td>${t.subject}</td>
          <td>${t.room}</td>
        </tr>`;
    }
  } else {
    timetableRows = `<tr><td colspan="4">No teaching schedule assigned.</td></tr>`;
  }

  return evalTemplate(facultySections['dashboard'], {
    faculty,
    departmentName,
    courseRows,
    assignmentRows,
    timetableRows
  });
}

function renderFacultyProfile({ faculty, departmentName }) {
  return evalTemplate(facultySections['profile'], { faculty, departmentName });
}

function renderFacultyProfileEdit({ faculty, departmentName }) {
  return evalTemplate(facultySections['profile_edit'], { faculty, departmentName });
}

function renderFacultyCourses({ courses }) {
  let rows = '';
  if (courses && courses.length > 0) {
    for (const c of courses) {
      rows += `
        <tr>
          <td>${c.course_code}</td>
          <td>${c.course_name}</td>
          <td>${c.department_name || 'N/A'}</td>
          <td>${c.semester || 'N/A'}</td>
          <td>${c.section || 'A'}</td>
          <td>${c.credits || 3}</td>
          <td>${c.total_students || 0}</td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="7">No courses assigned.</td></tr>`;
  }

  return evalTemplate(facultySections['courses'], { rows });
}

function renderFacultyAssignments({ assignments }) {
  let rows = '';
  if (assignments && assignments.length > 0) {
    for (const a of assignments) {
      rows += `
        <tr>
          <td>${a.title}</td>
          <td>${a.course_code} - ${a.course_name}</td>
          <td>${a.due_date}</td>
          <td>${a.total_submissions || 0}</td>
          <td>${a.status}</td>
          <td>
            <a href="/faculty/assignments/delete/${a.id}" onclick="return confirm('Are you sure you want to delete this assignment?');">Delete</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="6">No coursework assignments created yet.</td></tr>`;
  }

  return evalTemplate(facultySections['assignments'], { rows });
}

function renderFacultyAssignmentForm({ courses, error = null }) {
  let courseOptions = '';
  for (const c of courses) {
    courseOptions += `<option value="${c.id}">${c.course_code} - ${c.course_name} (${c.section})</option>`;
  }

  return evalTemplate(facultySections['assignment_form'], {
    courseOptions,
    error: error || ''
  });
}

function renderFacultyAttendance({ attendance, courses }) {
  let rows = '';
  if (attendance && attendance.length > 0) {
    for (const a of attendance) {
      const percentage = a.total_count > 0 ? Math.round((a.present_count / a.total_count) * 100) : 0;
      rows += `
        <tr>
          <td>${a.date}</td>
          <td>${a.course_code} - ${a.course_name}</td>
          <td>${a.topic || 'Lecture'}</td>
          <td>${a.present_count} / ${a.total_count}</td>
          <td>${percentage}%</td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="5">No attendance records found.</td></tr>`;
  }

  let courseOptions = '';
  for (const c of courses) {
    courseOptions += `<option value="${c.id}">${c.course_code} - ${c.course_name} (${c.section})</option>`;
  }

  return evalTemplate(facultySections['attendance'], {
    rows,
    courseOptions
  });
}

function renderFacultyTimetable({ timetable }) {
  let rows = '';
  if (timetable && timetable.length > 0) {
    for (const t of timetable) {
      rows += `
        <tr>
          <td>${t.day}</td>
          <td>${t.time}</td>
          <td>${t.subject}</td>
          <td>${t.room}</td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="4">No schedule records found.</td></tr>`;
  }

  return evalTemplate(facultySections['timetable'], { rows });
}

// ------------------------------------------
// 10. HOD Portal (from hod_portal.html)
// ------------------------------------------
const hodPortalSections = parseSections(loadTemplateFile('hod_portal.html'));

function renderHODDashboard({ departmentName, hodName, totalFaculty, facultyList }) {
  let rows = '';
  if (facultyList && facultyList.length > 0) {
    for (const f of facultyList) {
      rows += `
        <tr>
          <td>${f.faculty_code}</td>
          <td>${f.name}</td>
          <td>${f.designation}</td>
          <td>${f.email}</td>
          <td><a href="/hod/faculty/view/${f.id}">View</a></td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="5">No faculty found in this department.</td></tr>`;
  }

  return evalTemplate(hodPortalSections['dashboard'], {
    departmentName,
    hodName,
    totalFaculty,
    rows
  });
}

function renderHODFacultyList({ departmentName, facultyList }) {
  let rows = '';
  if (facultyList && facultyList.length > 0) {
    for (const f of facultyList) {
      rows += `
        <tr>
          <td>${f.faculty_code}</td>
          <td>${f.name}</td>
          <td>${f.designation}</td>
          <td>${f.email}</td>
          <td>${f.phone || 'N/A'}</td>
          <td>
            <a href="/hod/faculty/view/${f.id}">View</a> | 
            <a href="/hod/faculty/edit/${f.id}">Edit</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="6">No faculty members found.</td></tr>`;
  }

  return evalTemplate(hodPortalSections['faculty_list'], {
    departmentName,
    rows
  });
}

function renderHODFacultyForm({ isEdit = false, faculty = {}, departmentName }) {
  const formTitle = isEdit ? 'Edit Faculty' : 'Add Faculty';
  const actionUrl = isEdit ? `/hod/faculty/edit/${faculty.id}` : '/hod/faculty/add';

  return evalTemplate(hodPortalSections['faculty_form'], {
    formTitle,
    departmentName,
    actionUrl,
    faculty,
    isEdit
  });
}

function renderHODFacultyView({ faculty, departmentName }) {
  return evalTemplate(hodPortalSections['faculty_view'], { faculty, departmentName });
}

function renderHODDepartmentInfo({ department, totalFaculty, facultyList }) {
  let facultyRows = '';
  for (const f of facultyList) {
    facultyRows += `<tr><td>${f.faculty_code}</td><td>${f.name}</td><td>${f.designation}</td><td>${f.email}</td></tr>`;
  }

  return evalTemplate(hodPortalSections['department_info'], {
    department,
    totalFaculty,
    facultyRows
  });
}

function renderHODTimetable({ departmentName, schedules, facultyList, editSchedule = null }) {
  let rows = '';
  if (schedules && schedules.length > 0) {
    for (const s of schedules) {
      rows += `
        <tr>
          <td>${s.day}</td>
          <td>${s.time}</td>
          <td>${s.faculty_name}</td>
          <td>${s.subject}</td>
          <td>${s.room}</td>
          <td>
            <a href="/hod/timetable?edit=${s.id}#schedule-form">Edit</a> | 
            <a href="/hod/timetable/delete/${s.id}" onclick="return confirm('Are you sure you want to delete this schedule?');">Delete</a>
          </td>
        </tr>`;
    }
  } else {
    rows = `<tr><td colspan="6">No timetable schedules found for ${departmentName}.</td></tr>`;
  }

  const isEdit = !!editSchedule;
  const formTitle = isEdit ? 'Edit Schedule' : 'Add Schedule';
  const formAction = isEdit ? `/hod/timetable/edit/${editSchedule.id}` : '/hod/timetable/add';

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let dayOptions = `<option value="">-- Select Day --</option>`;
  for (const d of days) {
    const sel = (editSchedule && editSchedule.day === d) ? 'selected' : '';
    dayOptions += `<option value="${d}" ${sel}>${d}</option>`;
  }

  let facultyOptions = `<option value="">-- Select Faculty --</option>`;
  for (const f of facultyList) {
    const sel = (editSchedule && editSchedule.faculty_id == f.id) ? 'selected' : '';
    facultyOptions += `<option value="${f.id}" ${sel}>${f.name}</option>`;
  }

  return evalTemplate(hodPortalSections['timetable'], {
    departmentName,
    rows,
    isEdit,
    formTitle,
    formAction,
    dayOptions,
    facultyOptions,
    editSchedule
  });
}

// ------------------------------------------
// 11. Director Portal (from director_portal.html)
// ------------------------------------------
const directorSections = parseSections(loadTemplateFile('director_portal.html'));

function renderDirectorDashboard({ totalFaculty, totalDepartments, totalHODs, departmentsSummary, hodList }) {
  let deptRows = '';
  for (const d of departmentsSummary) {
    deptRows += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.hod_name || 'None'}</td>
        <td>${d.faculty_count}</td>
      </tr>`;
  }

  let hodRows = '';
  for (const h of hodList) {
    hodRows += `
      <tr>
        <td>${h.department_name}</td>
        <td>${h.hod_name || 'Not Assigned'}</td>
        <td>${h.email || 'N/A'}</td>
      </tr>`;
  }

  return evalTemplate(directorSections['dashboard'], {
    totalFaculty,
    totalDepartments,
    totalHODs,
    deptRows,
    hodRows
  });
}

function renderDirectorFaculty({ facultyList }) {
  let rows = '';
  for (const f of facultyList) {
    rows += `
      <tr>
        <td>${f.faculty_code}</td>
        <td>${f.name}</td>
        <td>${f.department_name || 'N/A'}</td>
        <td>${f.designation}</td>
        <td>${f.email}</td>
        <td>${f.qualification || 'N/A'}</td>
      </tr>`;
  }
  return evalTemplate(directorSections['faculty'], { rows });
}

function renderDirectorDepartments({ departmentsSummary }) {
  let rows = '';
  for (const d of departmentsSummary) {
    rows += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.hod_name || 'None'}</td>
        <td>${d.faculty_count}</td>
      </tr>`;
  }
  return evalTemplate(directorSections['departments'], { rows });
}

function renderDirectorHODs({ hodList }) {
  let rows = '';
  for (const h of hodList) {
    rows += `
      <tr>
        <td>${h.department_name}</td>
        <td>${h.hod_name || 'Not Assigned'}</td>
        <td>${h.email || 'N/A'}</td>
        <td>${h.phone || 'N/A'}</td>
      </tr>`;
  }
  return evalTemplate(directorSections['hods'], { rows });
}

function renderDirectorTimetable({ timetableList }) {
  let rows = '';
  for (const t of timetableList) {
    rows += `
      <tr>
        <td>${t.day}</td>
        <td>${t.time}</td>
        <td>${t.faculty_name}</td>
        <td>${t.department_name || 'N/A'}</td>
        <td>${t.subject}</td>
        <td>${t.room}</td>
      </tr>`;
  }
  return evalTemplate(directorSections['timetable'], { rows });
}

// ------------------------------------------
// 12. VP Portal (from vp_portal.html)
// ------------------------------------------
const vpSections = parseSections(loadTemplateFile('vp_portal.html'));

function renderVPDashboard({ totalFaculty, totalDepartments, totalHODs, facultyOverview, departmentOverview }) {
  let facRows = '';
  for (const f of facultyOverview) {
    facRows += `
      <tr>
        <td>${f.department_name}</td>
        <td>${f.faculty_count}</td>
      </tr>`;
  }

  let deptRows = '';
  for (const d of departmentOverview) {
    deptRows += `
      <tr>
        <td>${d.name}</td>
        <td>${d.hod_name || 'Not Assigned'}</td>
        <td>${d.faculty_count}</td>
      </tr>`;
  }

  return evalTemplate(vpSections['dashboard'], {
    totalFaculty,
    totalDepartments,
    totalHODs,
    facRows,
    deptRows
  });
}

function renderVPFaculty({ facultyList }) {
  let rows = '';
  for (const f of facultyList) {
    rows += `
      <tr>
        <td>${f.faculty_code}</td>
        <td>${f.name}</td>
        <td>${f.department_name || 'N/A'}</td>
        <td>${f.designation}</td>
        <td>${f.email}</td>
      </tr>`;
  }
  return evalTemplate(vpSections['faculty'], { rows });
}

function renderVPDepartments({ departmentOverview }) {
  let rows = '';
  for (const d of departmentOverview) {
    rows += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.hod_name || 'Not Assigned'}</td>
        <td>${d.faculty_count}</td>
      </tr>`;
  }
  return evalTemplate(vpSections['departments'], { rows });
}

function renderVPHODs({ hodList }) {
  let rows = '';
  for (const h of hodList) {
    rows += `
      <tr>
        <td>${h.department_name}</td>
        <td>${h.hod_name || 'Not Assigned'}</td>
        <td>${h.email || 'N/A'}</td>
        <td>${h.phone || 'N/A'}</td>
      </tr>`;
  }
  return evalTemplate(vpSections['hods'], { rows });
}

function renderVPReports({ facultySummary, departmentSummary, designationSummary }) {
  let deptRows = '';
  for (const d of departmentSummary) {
    deptRows += `
      <tr>
        <td>${d.name}</td>
        <td>${d.hod_name || 'Not Assigned'}</td>
        <td>${d.faculty_count}</td>
        <td>${d.timetable_count}</td>
      </tr>`;
  }

  let desigRows = '';
  for (const des of designationSummary) {
    desigRows += `
      <tr>
        <td>${des.designation || 'Unassigned'}</td>
        <td>${des.count}</td>
      </tr>`;
  }

  return evalTemplate(vpSections['reports'], {
    deptRows,
    desigRows
  });
}

// ------------------------------------------
// 13. President Portal (from president_portal.html)
// ------------------------------------------
const presidentSections = parseSections(loadTemplateFile('president_portal.html'));

function renderPresidentDashboard({ totalFaculty, totalDepartments, totalHODs, facultyOverview, departmentOverview, hodList }) {
  let facRows = '';
  for (const f of facultyOverview) {
    facRows += `
      <tr>
        <td>${f.department_name}</td>
        <td>${f.faculty_count}</td>
      </tr>`;
  }

  let deptRows = '';
  for (const d of departmentOverview) {
    deptRows += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.hod_name || 'Not Assigned'}</td>
        <td>${d.faculty_count}</td>
      </tr>`;
  }

  let hodRows = '';
  for (const h of hodList) {
    hodRows += `
      <tr>
        <td>${h.department_name}</td>
        <td>${h.hod_name || 'Not Assigned'}</td>
      </tr>`;
  }

  return evalTemplate(presidentSections['dashboard'], {
    totalFaculty,
    totalDepartments,
    totalHODs,
    facRows,
    deptRows,
    hodRows
  });
}

function renderPresidentFacultyOverview({ facultyOverview, facultyList }) {
  let facRows = '';
  for (const f of facultyOverview) {
    facRows += `
      <tr>
        <td>${f.department_name}</td>
        <td>${f.faculty_count}</td>
      </tr>`;
  }

  let listRows = '';
  for (const f of facultyList) {
    listRows += `
      <tr>
        <td>${f.faculty_code}</td>
        <td>${f.name}</td>
        <td>${f.department_name || 'N/A'}</td>
        <td>${f.designation}</td>
        <td>${f.qualification || 'N/A'}</td>
      </tr>`;
  }

  return evalTemplate(presidentSections['faculty'], {
    facRows,
    listRows
  });
}

function renderPresidentDepartmentOverview({ departmentOverview }) {
  let rows = '';
  for (const d of departmentOverview) {
    rows += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.hod_name || 'Not Assigned'}</td>
        <td>${d.faculty_count}</td>
      </tr>`;
  }
  return evalTemplate(presidentSections['departments'], { rows });
}

function renderPresidentHODOverview({ hodList }) {
  let rows = '';
  for (const h of hodList) {
    rows += `
      <tr>
        <td>${h.department_name}</td>
        <td>${h.hod_name || 'Not Assigned'}</td>
      </tr>`;
  }
  return evalTemplate(presidentSections['hods'], { rows });
}

module.exports = {
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
};

-- ====================================================================
-- FACULTY MANAGEMENT SYSTEM (FMS) - DATABASE SCHEMA & SEED DATA
-- Database Engine: SQLite 3
-- Description: Production-ready relational schema for academic faculty,
--              departments, course assignments, timetables, coursework,
--              attendance logs, and multi-role user authentication.
-- ====================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------
-- 1. TABLE: departments
-- Represents academic engineering departments in the institution.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  hod_id INTEGER
);

-- --------------------------------------------------------------------
-- 2. TABLE: faculty
-- Core faculty members, qualifications, designations, and departments.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department_id INTEGER,
  designation TEXT,
  qualification TEXT,
  date_added TEXT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- --------------------------------------------------------------------
-- 3. TABLE: courses
-- Academic course catalog offered across departments.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_code TEXT NOT NULL UNIQUE,
  course_name TEXT NOT NULL,
  department_id INTEGER,
  credits INTEGER DEFAULT 3,
  semester TEXT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- --------------------------------------------------------------------
-- 4. TABLE: faculty_courses
-- Relationship mapping courses assigned to faculty for teaching.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  section TEXT DEFAULT 'Section A',
  total_students INTEGER DEFAULT 50,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 5. TABLE: assignments
-- Coursework assignments given to students by assigned faculty.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  total_submissions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 6. TABLE: attendance
-- Daily lecture attendance logs conducted by faculty members.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  topic TEXT,
  present_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 7. TABLE: timetable
-- Weekly lecture and classroom scheduling slots for faculty.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  faculty_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  room TEXT NOT NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 8. TABLE: users
-- Application user credentials, assigned roles, and login statuses.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  faculty_id INTEGER,
  created_at TEXT
);

-- --------------------------------------------------------------------
-- 9. TABLE: faculty_career_history
-- Chronological academic and administrative appointments per faculty.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty_career_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  department TEXT,
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  notes TEXT,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_code ON faculty(faculty_code);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_courses_fac ON faculty_courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable(faculty_id);
CREATE INDEX IF NOT EXISTS idx_assignments_faculty ON assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_faculty ON attendance(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(username, role);
CREATE INDEX IF NOT EXISTS idx_career_faculty ON faculty_career_history(faculty_id, start_year);

-- ====================================================================
-- SEED DATA INSERTIONS (Real Academic Records)
-- ====================================================================

-- 1. Departments
INSERT OR IGNORE INTO departments (id, name, hod_id) VALUES
  (1, 'CSE', 1),
  (2, 'ECE', 2),
  (3, 'ME',  3),
  (4, 'CE',  4),
  (5, 'EE',  5);

-- 2. Faculty Members (25 Real Faculty Roster)
INSERT OR IGNORE INTO faculty (id, faculty_code, name, email, phone, department_id, designation, qualification, date_added) VALUES
  (1,  '101', 'Rahul Sharma',    'rahul@gmail.com',    '9876543210', 1, 'Professor', 'Ph.D CSE (IIT Delhi)',       '12 Sep 2026'),
  (2,  '102', 'Priya Singh',     'priya@gmail.com',    '9876543211', 2, 'Assistant', 'M.Tech ECE (NIT Trichy)',    '10 Sep 2026'),
  (3,  '103', 'Amit Kumar',      'amit@gmail.com',     '9876543212', 3, 'Associate', 'M.Tech ME (IIT Roorkee)',    '08 Sep 2026'),
  (4,  '104', 'Neha Verma',      'neha@gmail.com',     '9876543213', 4, 'Professor', 'Ph.D CE (IIT Bombay)',       '05 Sep 2026'),
  (5,  '105', 'Suresh Rao',      'suresh@gmail.com',   '9876543214', 5, 'Associate', 'Ph.D EE (IISc Bangalore)',   '01 Sep 2026'),
  (6,  '106', 'Vikas Gupta',     'vikas@gmail.com',    '9876543215', 1, 'Associate', 'M.Tech CSE (IIT Kanpur)',    '28 Aug 2026'),
  (7,  '107', 'Ananya Roy',      'ananya@gmail.com',   '9876543216', 2, 'Assistant', 'Ph.D ECE (BITS Pilani)',     '25 Aug 2026'),
  (8,  '108', 'Manish Tiwari',   'manish@gmail.com',   '9876543217', 3, 'Assistant', 'M.Tech ME (DTU)',            '22 Aug 2026'),
  (9,  '109', 'Pooja Nair',      'pooja@gmail.com',    '9876543218', 4, 'Associate', 'Ph.D CE (IIT Madras)',       '20 Aug 2026'),
  (10, '110', 'Deepak Mehta',    'deepak@gmail.com',   '9876543219', 5, 'Assistant', 'M.Tech EE (VNIT)',           '18 Aug 2026'),
  (11, '111', 'Sunita Patel',    'sunita@gmail.com',   '9876543220', 1, 'Assistant', 'M.Tech CSE (IIIT Hyd)',      '15 Aug 2026'),
  (12, '112', 'Arun Joshi',      'arun@gmail.com',     '9876543221', 2, 'Professor', 'Ph.D ECE (IIT Kharagpur)',   '12 Aug 2026'),
  (13, '113', 'Kavita Das',      'kavita@gmail.com',   '9876543222', 3, 'Assistant', 'M.Tech ME (NIT Warangal)',   '10 Aug 2026'),
  (14, '114', 'Rakesh Yadav',    'rakesh@gmail.com',   '9876543223', 4, 'Assistant', 'M.Tech CE (PEC)',            '08 Aug 2026'),
  (15, '115', 'Nisha Jain',      'nisha@gmail.com',    '9876543224', 5, 'Professor', 'Ph.D EE (IIT Delhi)',        '05 Aug 2026'),
  (16, '116', 'Gaurav Bhatia',   'gaurav@gmail.com',   '9876543225', 1, 'Assistant', 'M.Tech CSE (NSUT)',          '02 Aug 2026'),
  (17, '117', 'Shweta Sen',      'shweta@gmail.com',   '9876543226', 2, 'Associate', 'M.Tech ECE (IIT Guwahati)',  '30 Jul 2026'),
  (18, '118', 'Rajesh Mishra',   'rajesh@gmail.com',   '9876543227', 3, 'Professor', 'Ph.D ME (IIT Bombay)',       '28 Jul 2026'),
  (19, '119', 'Geeta Reddy',     'geeta@gmail.com',    '9876543228', 4, 'Assistant', 'M.Tech CE (Osmania Univ)',   '25 Jul 2026'),
  (20, '120', 'Harish Chandra',  'harish@gmail.com',   '9876543229', 5, 'Associate', 'Ph.D EE (IIT Roorkee)',      '22 Jul 2026'),
  (21, '121', 'Tanvi Saxena',    'tanvi@gmail.com',    '9876543230', 1, 'Associate', 'Ph.D CSE (JNU)',             '20 Jul 2026'),
  (22, '122', 'Rohan Kapoor',    'rohan@gmail.com',    '9876543231', 2, 'Assistant', 'M.Tech ECE (Thapar Univ)',   '18 Jul 2026'),
  (23, '123', 'Meenakshi Iyer',  'meenakshi@gmail.com','9876543232', 3, 'Assistant', 'M.Tech ME (Anna Univ)',     '15 Jul 2026'),
  (24, '124', 'Alok Pandey',     'alok@gmail.com',     '9876543233', 4, 'Associate', 'Ph.D CE (IIT Kanpur)',       '12 Jul 2026'),
  (25, '125', 'Smita Deshmukh',  'smita@gmail.com',    '9876543234', 5, 'Assistant', 'M.Tech EE (COEP)',           '10 Jul 2026');

-- Update HOD References in Departments
UPDATE departments SET hod_id = 1 WHERE id = 1;
UPDATE departments SET hod_id = 2 WHERE id = 2;
UPDATE departments SET hod_id = 3 WHERE id = 3;
UPDATE departments SET hod_id = 4 WHERE id = 4;
UPDATE departments SET hod_id = 5 WHERE id = 5;

-- Faculty career timeline samples. A NULL end_year means the appointment is current.
DELETE FROM faculty_career_history WHERE id IN (112, 115);
INSERT OR IGNORE INTO faculty_career_history (id, faculty_id, title, organization, department, start_year, end_year, notes) VALUES
  (1, 1, 'Lecturer', 'North Valley Institute of Technology', 'Computer Science', 2012, 2015, 'Joined the institution as teaching faculty.'),
  (2, 1, 'Assistant Professor', 'North Valley Institute of Technology', 'Computer Science', 2015, 2019, 'Taught database systems and operating systems.'),
  (3, 1, 'Associate Professor', 'North Valley Institute of Technology', 'Computer Science', 2019, 2023, 'Coordinated the undergraduate programme.'),
  (4, 1, 'Professor & Head of Department', 'North Valley Institute of Technology', 'Computer Science', 2023, NULL, 'Current academic and administrative appointment.'),
  (5, 2, 'Lecturer', 'North Valley Institute of Technology', 'Electronics and Communication', 2018, 2021, 'Joined after completing M.Tech.'),
  (6, 2, 'Assistant Professor', 'North Valley Institute of Technology', 'Electronics and Communication', 2021, NULL, 'Current teaching appointment.'),
  (7, 3, 'Assistant Professor', 'North Valley Institute of Technology', 'Mechanical Engineering', 2015, 2020, 'Taught thermal engineering courses.'),
  (8, 3, 'Associate Professor', 'North Valley Institute of Technology', 'Mechanical Engineering', 2020, NULL, 'Current appointment and laboratory coordinator.'),
  (9, 4, 'Assistant Professor', 'North Valley Institute of Technology', 'Civil Engineering', 2011, 2016, 'Joined the structural engineering group.'),
  (10, 4, 'Associate Professor', 'North Valley Institute of Technology', 'Civil Engineering', 2016, 2021, 'Served as postgraduate programme coordinator.'),
  (11, 4, 'Professor & Head of Department', 'North Valley Institute of Technology', 'Civil Engineering', 2021, NULL, 'Current academic and administrative appointment.'),
  (12, 5, 'Assistant Professor', 'North Valley Institute of Technology', 'Electrical Engineering', 2014, 2018, 'Taught electrical machines and power systems.'),
  (13, 5, 'Associate Professor & Head of Department', 'North Valley Institute of Technology', 'Electrical Engineering', 2018, NULL, 'Current academic and administrative appointment.'),
  (14, 12, 'Assistant Professor', 'North Valley Institute of Technology', 'Electronics and Communication', 2007, 2012, 'Joined the institution as teaching faculty.'),
  (15, 12, 'Associate Professor', 'North Valley Institute of Technology', 'Electronics and Communication', 2012, 2017, 'Served as research and laboratory coordinator.'),
  (16, 12, 'Professor', 'North Valley Institute of Technology', 'Electronics and Communication', 2017, 2023, 'Led the postgraduate academic programme.'),
  (17, 12, 'Dean, Academic Affairs', 'North Valley Institute of Technology', 'Academic Administration', 2023, NULL, 'Current institution-level administrative appointment.'),
  (18, 15, 'Assistant Professor', 'North Valley Institute of Technology', 'Electrical Engineering', 2004, 2010, 'Joined the electrical engineering faculty.'),
  (19, 15, 'Associate Professor', 'North Valley Institute of Technology', 'Electrical Engineering', 2010, 2015, 'Served as programme coordinator.'),
  (20, 15, 'Professor & Dean', 'North Valley Institute of Technology', 'Academic Administration', 2015, 2022, 'Led academic planning and curriculum review.'),
  (21, 15, 'Vice Chancellor', 'North Valley Institute of Technology', 'Institutional Administration', 2022, NULL, 'Current institution-level executive appointment.');

-- Ensure every faculty member has at least a current career record.
INSERT OR IGNORE INTO faculty_career_history (id, faculty_id, title, organization, department, start_year, end_year, notes)
SELECT 100 + f.id, f.id,
  CASE f.designation
    WHEN 'Assistant' THEN 'Assistant Professor'
    WHEN 'Associate' THEN 'Associate Professor'
    ELSE f.designation
  END,
  'North Valley Institute of Technology', d.name, 2022, NULL, 'Current appointment.'
FROM faculty f
LEFT JOIN departments d ON d.id = f.department_id
WHERE f.id NOT IN (SELECT faculty_id FROM faculty_career_history);

-- 3. Course Catalog
INSERT OR IGNORE INTO courses (id, course_code, course_name, department_id, credits, semester) VALUES
  (1,  'ME-301',  'Thermodynamics',                  3, 4, 'Semester 5'),
  (2,  'ME-302',  'Fluid Mechanics',                 3, 4, 'Semester 5'),
  (3,  'ME-205',  'Computer Networks & IoT',         3, 3, 'Semester 4'),
  (4,  'CSE-101', 'Database Management Systems',     1, 4, 'Semester 3'),
  (5,  'CSE-102', 'Operating Systems',               1, 4, 'Semester 4'),
  (6,  'CSE-103', 'Computer Networks',               1, 4, 'Semester 5'),
  (7,  'ECE-201', 'Digital Electronics',             2, 4, 'Semester 3'),
  (8,  'ECE-202', 'Signals and Systems',             2, 4, 'Semester 4'),
  (9,  'CE-301',  'Structural Analysis',             4, 4, 'Semester 5'),
  (10, 'EE-201',  'Power Systems',                   5, 4, 'Semester 4');

-- 4. Faculty Course Allocations
INSERT OR IGNORE INTO faculty_courses (id, faculty_id, course_id, section, total_students) VALUES
  (1,  3, 1,  'Section A', 52),
  (2,  3, 2,  'Section B', 48),
  (3,  3, 3,  'Section A', 50),
  (4,  1, 4,  'Section A', 60),
  (5,  1, 5,  'Section B', 58),
  (6,  1, 6,  'Section A', 62),
  (7,  2, 7,  'Section A', 55),
  (8,  2, 8,  'Section B', 52),
  (9,  4, 9,  'Section A', 45),
  (10, 5, 10, 'Section A', 50);

-- 5. Coursework Assignments
INSERT OR IGNORE INTO assignments (id, faculty_id, course_id, title, description, due_date, total_submissions, status) VALUES
  (1, 3, 1, 'Problem Set 2: Carnot Cycle & Entropy', 'Solve analytical problems 4.1 through 4.12 on open system irreversibility.', '02 Oct 2026', 35, 'Active'),
  (2, 3, 2, 'Lab Report 1: Wind Tunnel Fluid Analysis', 'Submit experimental write-up and boundary layer velocity calculations.', '28 Sep 2026', 42, 'Active'),
  (3, 3, 3, 'Network Simulation Assignment', 'Configure TCP/IP subnet topologies with static routing in Cisco Packet Tracer.', '15 Sep 2026', 50, 'Completed'),
  (4, 1, 4, 'SQL Query Optimization & Indexing', 'Design normalized 3NF schemas and write index-optimized analytical queries.', '05 Oct 2026', 45, 'Active'),
  (5, 1, 5, 'Process Synchronization Lab', 'Implement bounded-buffer producer-consumer synchronization using POSIX semaphores.', '30 Sep 2026', 52, 'Active');

-- 6. Lecture Attendance Logs
INSERT OR IGNORE INTO attendance (id, faculty_id, course_id, date, topic, present_count, total_count) VALUES
  (1, 3, 1, '21 Sep 2026', 'First Law of Thermodynamics Applied to Open Systems', 48, 52),
  (2, 3, 2, '22 Sep 2026', 'Bernoulli Equation & Venturimeter Flow Measurement', 44, 48),
  (3, 3, 3, '22 Sep 2026', 'OSI Model vs TCP/IP Protocol Suite Comparison', 49, 50),
  (4, 1, 4, '22 Sep 2026', 'B-Trees, B+ Trees and Clustered Table Indexing', 56, 60);

-- 7. Complete Institutional Timetable
INSERT OR IGNORE INTO timetable (id, day, time, faculty_id, subject, room) VALUES
  (1, 'Monday',    '09:00-10:00', 1, 'DBMS',                'A-101'),
  (2, 'Monday',    '10:00-11:00', 1, 'OS',                  'A-102'),
  (3, 'Tuesday',   '09:00-10:00', 1, 'CN',                  'A-103'),
  (4, 'Monday',    '10:00-11:00', 2, 'OS',                  'A-102'),
  (5, 'Tuesday',   '09:00-10:00', 3, 'CN',                  'A-103'),
  (6, 'Wednesday', '11:00-12:00', 4, 'Structures',          'B-201'),
  (7, 'Thursday',  '10:00-11:00', 5, 'Power Systems',       'C-301'),
  (8, 'Wednesday', '10:00-11:00', 6, 'Data Structures',     'A-104'),
  (9, 'Thursday',  '09:00-10:00', 7, 'Digital Electronics', 'B-102');

-- 8. Users & Role-Based Access Accounts
INSERT OR IGNORE INTO users (id, username, name, password, role, status, faculty_id, created_at) VALUES
  (1,  'admin01',     'Admin User',          'admin123',     'Admin',     'Active', NULL, '01 Jan 2026'),
  (2,  'admin',       'Administrator',       'admin',        'Admin',     'Active', NULL, '01 Jan 2026'),
  (3,  'rahul01',     'Rahul Sharma',        'rahul123',     'HOD',       'Active', 1,    '02 Jan 2026'),
  (4,  'amit01',      'Amit Kumar',          'amit123',      'Faculty',   'Active', 3,    '03 Jan 2026'),
  (5,  'priya01',     'Priya Singh',         'priya123',     'Faculty',   'Active', 2,    '04 Jan 2026'),
  (6,  'director01',  'Dr. S. K. Gupta',     'director123',  'Director',  'Active', NULL, '05 Jan 2026'),
  (7,  'vp01',        'Prof. M. L. Aggarwal','vp123',        'VP',        'Active', NULL, '06 Jan 2026'),
  (8,  'president01', 'Shri R. N. Bansal',   'president123', 'President', 'Active', NULL, '07 Jan 2026'),
  (9,  'neha01',      'Neha Verma',          'pass123',      'HOD',       'Active', 4,    '08 Jan 2026'),
  (10, 'suresh01',    'Suresh Rao',          'pass123',      'HOD',       'Active', 5,    '09 Jan 2026'),
  (11, 'vikas01',     'Vikas Gupta',         'pass123',      'Faculty',   'Active', 6,    '10 Jan 2026'),
  (12, 'ananya01',    'Ananya Roy',          'pass123',      'Faculty',   'Active', 7,    '11 Jan 2026'),
  (13, 'manish01',    'Manish Tiwari',       'pass123',      'Faculty',   'Active', 8,    '12 Jan 2026'),
  (14, 'pooja01',     'Pooja Nair',          'pass123',      'Faculty',   'Active', 9,    '13 Jan 2026'),
  (15, 'deepak01',    'Deepak Mehta',        'pass123',      'Faculty',   'Active', 10,   '14 Jan 2026');

// Global variables
let currentUser = null;
let students = [];
let subjects = [];
let grades = [];
let polls = [];

// DOM Elements
const loginPage = document.getElementById('loginPage');
const adminDashboard = document.getElementById('adminDashboard');
const studentDashboard = document.getElementById('studentDashboard');
const loginForm = document.getElementById('loginForm');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Check if user is already logged in
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showDashboard();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginPage();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);

    // Logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('studentLogoutBtn')?.addEventListener('click', handleLogout);

    // Mobile menu toggle for both student and admin
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const studentNavMenu = document.getElementById('studentNavMenu');
    const adminMobileMenuToggle = document.getElementById('adminMobileMenuToggle');
    const adminNavMenu = document.getElementById('adminNavMenu');

    if (mobileMenuToggle && studentNavMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            studentNavMenu.classList.toggle('active');
        });
    }

    if (adminMobileMenuToggle && adminNavMenu) {
        adminMobileMenuToggle.addEventListener('click', () => {
            adminNavMenu.classList.toggle('active');
        });
    }

    // Navigation buttons - separate handling for admin and student
    // This will be overridden for students in showDashboard function

    // View toggle buttons
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            toggleGradesView(view);

            // Update active button
            document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Add buttons
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const addGradeBtn = document.getElementById('addGradeBtn');
    const addPollBtn = document.getElementById('addPollBtn');

    if (addStudentBtn) addStudentBtn.addEventListener('click', () => showStudentModal());
    if (addSubjectBtn) addSubjectBtn.addEventListener('click', () => showSubjectModal());
    if (addGradeBtn) addGradeBtn.addEventListener('click', () => showGradeModal());
    if (addPollBtn) addPollBtn.addEventListener('click', () => showPollModal());
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            showDashboard();
        } else {
            alert('خطأ في اسم المستخدم أو كلمة المرور');
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('حدث خطأ أثناء تسجيل الدخول');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showLoginPage();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Show login page
function showLoginPage() {
    loginPage.classList.add('active');
    adminDashboard.classList.remove('active');
    studentDashboard.classList.remove('active');
    loginForm.reset();
}

// Show appropriate dashboard
function showDashboard() {
    loginPage.classList.remove('active');

    if (currentUser.role === 'admin') {
        adminDashboard.classList.add('active');
        studentDashboard.classList.remove('active');
        document.getElementById('adminUsername').textContent = currentUser.username;

        // Setup admin navigation
        setupAdminNavigation();

        // Setup admin event listeners
        setTimeout(() => {
            const addPollBtn = document.getElementById('addPollBtn');
            if (addPollBtn && !addPollBtn.hasAttribute('data-listener')) {
                addPollBtn.addEventListener('click', () => showPollModal());
                addPollBtn.setAttribute('data-listener', 'true');
                console.log('Poll button event listener added');
            }
        }, 100);

        // Show dashboard by default
        setTimeout(() => {
            console.log('🏠 Showing default dashboard section...');
            showSection('dashboard');
        }, 200);

        loadAdminData();
    } else {
        studentDashboard.classList.add('active');
        adminDashboard.classList.remove('active');
        document.getElementById('studentUsername').textContent = currentUser.username;

        // Setup student navigation
        setupStudentNavigation();

        // Show grades section by default for students
        showSection('grades');

        loadStudentData();
    }
}

// Show section in dashboard
function showSection(sectionName) {
    console.log('🔄 showSection called with:', sectionName, 'User role:', currentUser?.role);

    if (!sectionName) {
        console.error('❌ No section name provided');
        return;
    }

    // Remove active class from all sections
    const allSections = document.querySelectorAll('.content-section, .admin-content-section, .student-content-section');
    console.log(`📋 Found ${allSections.length} total sections`);

    allSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
        section.style.visibility = 'hidden';
        console.log(`➖ Removed active from: ${section.id}`);
    });

    if (currentUser && currentUser.role === 'student') {
        console.log('👨‍🎓 Processing student navigation...');
        // For student dashboard
        if (sectionName === 'grades') {
            const section = document.getElementById('studentGradesSection');
            if (section) {
                section.classList.add('active');
                console.log('✅ Student grades section activated');
                console.log('📊 Section classes:', section.className);

                // Force display and ensure visibility
                section.style.display = 'block';
                section.style.visibility = 'visible';

                // Trigger any view updates
                setTimeout(() => {
                    const event = new Event('sectionShown');
                    section.dispatchEvent(event);
                }, 50);

            } else {
                console.error('❌ studentGradesSection not found');
                // List available sections for debugging
                const availableSections = document.querySelectorAll('[id*="student"]');
                console.log('Available student sections:', Array.from(availableSections).map(s => s.id));
            }
        } else if (sectionName === 'polls') {
            const section = document.getElementById('studentPollsSection');
            if (section) {
                section.classList.add('active');
                console.log('✅ Student polls section activated');
                console.log('🗳️ Section classes:', section.className);

                // Force display and ensure visibility
                section.style.display = 'block';
                section.style.visibility = 'visible';

                // Trigger any view updates
                setTimeout(() => {
                    const event = new Event('sectionShown');
                    section.dispatchEvent(event);
                }, 50);

            } else {
                console.error('❌ studentPollsSection not found');
                // List available sections for debugging
                const availableSections = document.querySelectorAll('[id*="student"]');
                console.log('Available student sections:', Array.from(availableSections).map(s => s.id));
            }
        } else {
            console.warn(`⚠️ Unknown student section: ${sectionName}`);
        }
    } else {
        // For admin dashboard
        console.log(`🔧 Processing admin section: ${sectionName}`);
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            targetSection.style.visibility = 'visible';
            console.log(`✅ Admin section ${sectionName} activated`);
            console.log(`📊 Section classes: ${targetSection.className}`);
            console.log(`📊 Section display: ${targetSection.style.display}`);
        } else {
            console.error(`❌ Section ${sectionName}Section not found`);
            // List available sections for debugging
            const availableSections = document.querySelectorAll('[id$="Section"]');
            console.log('Available admin sections:', Array.from(availableSections).map(s => s.id));

            // Try alternative section names
            const alternativeSection = document.getElementById(sectionName);
            if (alternativeSection) {
                alternativeSection.classList.add('active');
                console.log(`✅ Alternative section ${sectionName} activated`);
            }
        }
    }
}

// Setup modal buttons
function setupModalButtons() {
    console.log('Setting up modal buttons...');

    // Add Student Button
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.removeEventListener('click', handleAddStudentClick);
        addStudentBtn.addEventListener('click', handleAddStudentClick);
        console.log('✅ Add Student button setup');
    } else {
        console.warn('❌ Add Student button not found');
    }

    // Add Subject Button
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) {
        addSubjectBtn.removeEventListener('click', handleAddSubjectClick);
        addSubjectBtn.addEventListener('click', handleAddSubjectClick);
        console.log('✅ Add Subject button setup');
    } else {
        console.warn('❌ Add Subject button not found');
    }

    // Add Grade Button
    const addGradeBtn = document.getElementById('addGradeBtn');
    if (addGradeBtn) {
        addGradeBtn.removeEventListener('click', handleAddGradeClick);
        addGradeBtn.addEventListener('click', handleAddGradeClick);
        console.log('✅ Add Grade button setup');
    } else {
        console.warn('❌ Add Grade button not found');
    }

    // Add Poll Button
    const addPollBtn = document.getElementById('addPollBtn');
    if (addPollBtn) {
        addPollBtn.removeEventListener('click', handleAddPollClick);
        addPollBtn.addEventListener('click', handleAddPollClick);
        console.log('✅ Add Poll button setup');
    } else {
        console.warn('❌ Add Poll button not found');
    }
}

// Modal button handlers
function handleAddStudentClick(e) {
    e.preventDefault();
    console.log('Add Student clicked');
    showStudentModal();
}

function handleAddSubjectClick(e) {
    e.preventDefault();
    console.log('Add Subject clicked');
    showSubjectModal();
}

function handleAddGradeClick(e) {
    e.preventDefault();
    console.log('Add Grade clicked');
    showGradeModal();
}

function handleAddPollClick(e) {
    e.preventDefault();
    console.log('Add Poll clicked');
    showPollModal();
}

// Setup admin navigation
function setupAdminNavigation() {
    console.log('Setting up admin navigation...');

    const adminNavButtons = document.querySelectorAll('#adminNavMenu .nav-btn');
    console.log('Found admin nav buttons:', adminNavButtons.length);

    adminNavButtons.forEach((btn, index) => {
        const section = btn.dataset.section;
        console.log(`Admin button ${index + 1}: ${section}`);

        // Remove existing listeners
        btn.removeEventListener('click', handleAdminNavClick);
        btn.addEventListener('click', handleAdminNavClick);
    });

    // Set dashboard as active
    setTimeout(() => {
        adminNavButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === 'dashboard') {
                btn.classList.add('active');
                console.log('✅ Dashboard nav button set as active');
            }
        });

        // Setup modal buttons
        setupModalButtons();

        // Load admin data
        loadAdminData();

        // Force show dashboard section
        console.log('🏠 Forcing dashboard section to show...');
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.classList.add('active');
            dashboardSection.style.display = 'block';
            dashboardSection.style.visibility = 'visible';
            console.log('✅ Dashboard section forced to show');
        } else {
            console.error('❌ Dashboard section not found!');
        }
    }, 100);
}

// Setup student navigation
function setupStudentNavigation() {
    console.log('Setting up student navigation...');

    const studentNavButtons = document.querySelectorAll('#studentNavMenu .nav-btn');
    console.log('Found student nav buttons:', studentNavButtons.length);

    studentNavButtons.forEach((btn, index) => {
        const section = btn.dataset.section;
        console.log(`Student button ${index + 1}: ${section}`);

        // Remove existing listeners
        btn.removeEventListener('click', handleStudentNavClick);
        btn.addEventListener('click', handleStudentNavClick);
    });

    // Set grades as active
    setTimeout(() => {
        studentNavButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === 'grades') {
                btn.classList.add('active');
            }
        });
    }, 100);
}

// Handle admin navigation clicks
function handleAdminNavClick(event) {
    const section = event.currentTarget.dataset.section;
    console.log('Admin nav clicked:', section);

    if (section) {
        // Remove active from all admin nav buttons
        document.querySelectorAll('#adminNavMenu .nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active to clicked button
        event.currentTarget.classList.add('active');

        // Show the section
        showSection(section);

        // Close mobile menu if open
        const adminNavMenu = document.getElementById('adminNavMenu');
        if (adminNavMenu) {
            adminNavMenu.classList.remove('active');
        }
    }
}

// Handle student navigation clicks
function handleStudentNavClick(event) {
    const section = event.currentTarget.dataset.section;
    console.log('Student nav clicked:', section);

    if (section) {
        // Remove active from all student nav buttons
        document.querySelectorAll('#studentNavMenu .nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active to clicked button
        event.currentTarget.classList.add('active');

        // Show the section
        showSection(section);

        // Scroll to the section after a short delay
        setTimeout(() => {
            const targetSection = document.getElementById(section === 'grades' ? 'studentGradesSection' : 'studentPollsSection');
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                console.log(`📜 Scrolled to ${targetSection.id}`);
            }
        }, 100);

        // Close mobile menu if open
        const studentNavMenu = document.getElementById('studentNavMenu');
        if (studentNavMenu) {
            studentNavMenu.classList.remove('active');
        }
    }
}

// Load admin data
async function loadAdminData() {
    await Promise.all([
        loadStudents(),
        loadSubjects(),
        loadGrades(),
        loadPolls()
    ]);

    // Update dashboard stats
    updateDashboardStats();
}

// Update dashboard statistics
function updateDashboardStats() {
    // Update student count
    const totalStudentsElement = document.getElementById('totalStudentsCount');
    if (totalStudentsElement && students) {
        totalStudentsElement.textContent = students.length;
    }

    // Update subjects count
    const totalSubjectsElement = document.getElementById('totalSubjectsCount');
    if (totalSubjectsElement && subjects) {
        totalSubjectsElement.textContent = subjects.length;
    }

    // Update grades count
    const totalGradesElement = document.getElementById('totalGradesCount');
    if (totalGradesElement && grades) {
        totalGradesElement.textContent = grades.length;
    }

    // Update polls count
    const totalPollsElement = document.getElementById('totalPollsCount');
    if (totalPollsElement && polls) {
        totalPollsElement.textContent = polls.length;
    }
}

// Load students
async function loadStudents() {
    try {
        const response = await fetch('/api/students');
        students = await response.json();
        renderStudentsTable();
    } catch (error) {
        console.error('Failed to load students:', error);
    }
}

// Load subjects
async function loadSubjects() {
    try {
        const response = await fetch('/api/subjects');
        subjects = await response.json();
        renderSubjectsTable();
    } catch (error) {
        console.error('Failed to load subjects:', error);
    }
}

// Load grades
async function loadGrades() {
    try {
        const response = await fetch('/api/grades');
        grades = await response.json();
        renderGradesTable();
    } catch (error) {
        console.error('Failed to load grades:', error);
    }
}

// Render students table
function renderStudentsTable() {
    const tbody = document.querySelector('#studentsTable tbody');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.student_number}</td>
            <td>${student.name}</td>
            <td>${student.class}</td>
            <td>${student.department}</td>
            <td>${student.email || '-'}</td>
            <td>${student.phone || '-'}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editStudent(${student.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id})">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render subjects table
function renderSubjectsTable() {
    const tbody = document.querySelector('#subjectsTable tbody');
    tbody.innerHTML = '';
    
    subjects.forEach(subject => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${subject.code}</td>
            <td>${subject.name}</td>
            <td>${subject.credit_hours}</td>
            <td>${subject.department || '-'}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editSubject(${subject.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteSubject(${subject.id})">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render grades table
function renderGradesTable() {
    const tbody = document.querySelector('#gradesTable tbody');
    tbody.innerHTML = '';

    grades.forEach(grade => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${grade.student_name}</td>
            <td>${grade.subject_name}</td>
            <td>${grade.midterm_theory || '-'}</td>
            <td>${grade.midterm_practical || '-'}</td>
            <td>${grade.midterm_total || '-'}</td>
            <td>${grade.final_theory || '-'}</td>
            <td>${grade.final_practical || '-'}</td>
            <td>${grade.final_total || '-'}</td>
            <td>${grade.total_grade ? grade.total_grade.toFixed(1) : '-'}</td>
            <td><span class="grade-badge grade-${grade.letter_grade}">${grade.letter_grade || '-'}</span></td>
            <td>${grade.semester}</td>
            <td>${grade.academic_year}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editGrade(${grade.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteGrade(${grade.id})">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load polls
async function loadPolls() {
    try {
        const response = await fetch('/api/polls');
        polls = await response.json();
        if (currentUser.role === 'admin') {
            renderPollsList();
        } else {
            renderStudentPollsList();
        }
    } catch (error) {
        console.error('Failed to load polls:', error);
    }
}

// Load student dashboard data
async function loadStudentData() {
    try {
        const response = await fetch('/api/student-dashboard');
        const data = await response.json();

        // Update welcome section
        document.getElementById('welcomeStudentName').textContent = data.student.name;

        // Update student info
        document.getElementById('studentName').textContent = data.student.name;
        document.getElementById('studentNumber').textContent = data.student.student_number;
        document.getElementById('studentClass').textContent = data.student.class;
        document.getElementById('studentDepartment').textContent = data.student.department;

        // Update GPA with status
        const gpa = parseFloat(data.gpa);
        document.getElementById('studentGPA').textContent = gpa.toFixed(2);
        updateGPAStatus(gpa);

        // Update stats
        document.getElementById('totalSubjects').textContent = data.grades.length;
        const totalCredits = data.grades.reduce((sum, grade) => sum + (grade.credit_hours || 0), 0);
        document.getElementById('totalCredits').textContent = totalCredits;

        // Render grades in both views
        renderStudentGradesTable(data.grades);
        renderStudentGradesCards(data.grades);

        // Load polls for student
        await loadPolls();

    } catch (error) {
        console.error('Failed to load student data:', error);
    }
}

// Update GPA status
function updateGPAStatus(gpa) {
    const statusElement = document.getElementById('gpaStatus');
    const statusText = statusElement.querySelector('.status-text');

    if (gpa >= 3.7) {
        statusText.textContent = 'ممتاز';
        statusText.style.color = '#28a745';
    } else if (gpa >= 3.0) {
        statusText.textContent = 'جيد جداً';
        statusText.style.color = '#17a2b8';
    } else if (gpa >= 2.5) {
        statusText.textContent = 'جيد';
        statusText.style.color = '#ffc107';
    } else if (gpa >= 2.0) {
        statusText.textContent = 'مقبول';
        statusText.style.color = '#fd7e14';
    } else {
        statusText.textContent = 'ضعيف';
        statusText.style.color = '#dc3545';
    }
}

// Toggle between grades views
function toggleGradesView(view) {
    const cardsView = document.getElementById('gradesCardsView');
    const tableView = document.getElementById('gradesTableView');

    if (view === 'cards') {
        cardsView.classList.add('active');
        tableView.classList.remove('active');
    } else {
        cardsView.classList.remove('active');
        tableView.classList.add('active');
    }
}

// Render student grades table
function renderStudentGradesTable(studentGrades) {
    const tbody = document.querySelector('#studentGradesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    studentGrades.forEach(grade => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${grade.subject_name}</td>
            <td class="mobile-hide">${grade.subject_code}</td>
            <td class="mobile-hide">${grade.midterm_theory || '-'}</td>
            <td class="mobile-hide">${grade.midterm_practical || '-'}</td>
            <td>${grade.midterm_total || '-'}</td>
            <td class="mobile-hide">${grade.final_theory || '-'}</td>
            <td class="mobile-hide">${grade.final_practical || '-'}</td>
            <td>${grade.final_total || '-'}</td>
            <td><strong>${grade.total_grade ? grade.total_grade.toFixed(1) : '-'}</strong></td>
            <td><span class="grade-badge grade-${grade.letter_grade}">${grade.letter_grade || '-'}</span></td>
            <td class="mobile-hide">${grade.rank || '-'}/${grade.total_students || '-'}</td>
            <td class="mobile-hide">${grade.credit_hours || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render student grades cards
function renderStudentGradesCards(studentGrades) {
    const container = document.getElementById('gradesCardsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (studentGrades.length === 0) {
        container.innerHTML = '<p class="no-grades">لا توجد درجات مسجلة بعد</p>';
        return;
    }

    studentGrades.forEach(grade => {
        const card = document.createElement('div');
        card.className = 'grade-card';

        const gradeClass = getGradeClass(grade.letter_grade);

        card.innerHTML = `
            <div class="grade-card-header">
                <div class="subject-info">
                    <h4>${grade.subject_name}</h4>
                    <div class="subject-code">${grade.subject_code}</div>
                </div>
                <div class="grade-badge-large grade-${grade.letter_grade}">
                    ${grade.letter_grade || '-'}
                </div>
            </div>

            <div class="grade-details">
                <div class="grade-section">
                    <div class="grade-section-title">النصفي</div>
                    <div class="grade-section-value">${grade.midterm_total || '-'}</div>
                    <div class="grade-breakdown">
                        نظري: ${grade.midterm_theory || '-'} | عملي: ${grade.midterm_practical || '-'}
                    </div>
                </div>
                <div class="grade-section">
                    <div class="grade-section-title">النهائي</div>
                    <div class="grade-section-value">${grade.final_total || '-'}</div>
                    <div class="grade-breakdown">
                        نظري: ${grade.final_theory || '-'} | عملي: ${grade.final_practical || '-'}
                    </div>
                </div>
            </div>

            <div class="grade-total">
                <div class="total-label">الدرجة الكلية</div>
                <div class="total-value">${grade.total_grade ? grade.total_grade.toFixed(1) : '-'}/100</div>
            </div>

            <div class="grade-footer">
                <span>الترتيب: ${grade.rank || '-'}/${grade.total_students || '-'}</span>
                <span>الساعات: ${grade.credit_hours || '-'}</span>
            </div>
        `;

        container.appendChild(card);
    });
}

// Get grade class for styling
function getGradeClass(letterGrade) {
    const gradeClasses = {
        'A+': 'excellent',
        'A': 'very-good',
        'A-': 'good-plus',
        'B+': 'good',
        'B': 'acceptable-plus',
        'B-': 'acceptable',
        'C+': 'pass-plus',
        'C': 'pass',
        'C-': 'weak-plus',
        'D': 'weak',
        'F': 'fail'
    };
    return gradeClasses[letterGrade] || 'unknown';
}

// Modal functions - make them global
window.showStudentModal = function(studentId = null) {
    console.log('showStudentModal called with ID:', studentId);
    console.log('Available students:', students?.length || 0);

    const student = studentId ? students.find(s => s.id === studentId) : null;
    const isEdit = !!student;

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <form id="studentForm" class="modal-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>اسم الطالب</label>
                            <input type="text" name="name" value="${student?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>رقم القيد</label>
                            <input type="text" name="student_number" value="${student?.student_number || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>الفصل</label>
                            <input type="text" name="class" value="${student?.class || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>القسم</label>
                            <input type="text" name="department" value="${student?.department || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>البريد الإلكتروني</label>
                            <input type="email" name="email" value="${student?.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>رقم الهاتف</label>
                            <input type="tel" name="phone" value="${student?.phone || ''}">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error('❌ Modal container not found!');
        alert('خطأ: لا يمكن العثور على حاوي النوافذ');
        return;
    }

    modalContainer.innerHTML = modalHTML;
    console.log('✅ Student modal HTML set, length:', modalHTML.length);

    document.getElementById('studentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const studentData = Object.fromEntries(formData);

        try {
            const url = isEdit ? `/api/students/${studentId}` : '/api/students';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });

            if (response.ok) {
                closeModal();
                await loadStudents();
                alert(isEdit ? 'تم تحديث بيانات الطالب بنجاح' : 'تم إضافة الطالب بنجاح');
            } else {
                alert('حدث خطأ أثناء حفظ البيانات');
            }
        } catch (error) {
            console.error('Error saving student:', error);
            alert('حدث خطأ أثناء حفظ البيانات');
        }
    });
}

window.showSubjectModal = function(subjectId = null) {
    console.log('showSubjectModal called with ID:', subjectId);
    console.log('Available subjects:', subjects?.length || 0);

    const subject = subjectId ? subjects.find(s => s.id === subjectId) : null;
    const isEdit = !!subject;

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? 'تعديل بيانات المادة' : 'إضافة مادة جديدة'}</h3>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <form id="subjectForm" class="modal-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>اسم المادة</label>
                            <input type="text" name="name" value="${subject?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>رمز المادة</label>
                            <input type="text" name="code" value="${subject?.code || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>الساعات المعتمدة</label>
                            <input type="number" name="credit_hours" value="${subject?.credit_hours || 3}" min="1" max="6" required>
                        </div>
                        <div class="form-group">
                            <label>القسم</label>
                            <input type="text" name="department" value="${subject?.department || ''}">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error('❌ Modal container not found!');
        alert('خطأ: لا يمكن العثور على حاوي النوافذ');
        return;
    }

    modalContainer.innerHTML = modalHTML;
    console.log('✅ Subject modal HTML set, length:', modalHTML.length);

    document.getElementById('subjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const subjectData = Object.fromEntries(formData);

        try {
            const url = isEdit ? `/api/subjects/${subjectId}` : '/api/subjects';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subjectData)
            });

            if (response.ok) {
                closeModal();
                await loadSubjects();
                alert(isEdit ? 'تم تحديث بيانات المادة بنجاح' : 'تم إضافة المادة بنجاح');
            } else {
                alert('حدث خطأ أثناء حفظ البيانات');
            }
        } catch (error) {
            console.error('Error saving subject:', error);
            alert('حدث خطأ أثناء حفظ البيانات');
        }
    });
}

window.showGradeModal = function(gradeId = null) {
    console.log('showGradeModal called with ID:', gradeId);
    console.log('Available students:', students?.length || 0);
    console.log('Available subjects:', subjects?.length || 0);
    console.log('Available grades:', grades?.length || 0);

    const grade = gradeId ? grades.find(g => g.id === gradeId) : null;
    const isEdit = !!grade;

    // Check if we have students and subjects data
    if (!students || students.length === 0) {
        console.warn('No students data available');
        alert('لا توجد بيانات طلاب. يرجى إضافة طلاب أولاً.');
        return;
    }

    if (!subjects || subjects.length === 0) {
        console.warn('No subjects data available');
        alert('لا توجد بيانات مواد. يرجى إضافة مواد أولاً.');
        return;
    }

    const studentsOptions = students.map(s =>
        `<option value="${s.id}" ${grade?.student_id === s.id ? 'selected' : ''}>${s.name} (${s.student_number})</option>`
    ).join('');

    const subjectsOptions = subjects.map(s =>
        `<option value="${s.id}" ${grade?.subject_id === s.id ? 'selected' : ''}>${s.name} (${s.code})</option>`
    ).join('');

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content grade-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? 'تعديل الدرجة' : 'إضافة درجة جديدة'}</h3>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <form id="gradeForm" class="modal-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>الطالب</label>
                            <select name="student_id" required ${isEdit ? 'disabled' : ''}>
                                <option value="">اختر الطالب</option>
                                ${studentsOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>المادة</label>
                            <select name="subject_id" required ${isEdit ? 'disabled' : ''}>
                                <option value="">اختر المادة</option>
                                ${subjectsOptions}
                            </select>
                        </div>
                    </div>

                    <div class="grades-section">
                        <h4><i class="fas fa-clipboard-list"></i> درجات النصفي (40 درجة)</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>النظري (من 30)</label>
                                <input type="number" name="midterm_theory" value="${grade?.midterm_theory || ''}" min="0" max="30" step="0.1" placeholder="0-30">
                            </div>
                            <div class="form-group">
                                <label>العملي (من 10)</label>
                                <input type="number" name="midterm_practical" value="${grade?.midterm_practical || ''}" min="0" max="10" step="0.1" placeholder="0-10">
                            </div>
                        </div>
                    </div>

                    <div class="grades-section">
                        <h4><i class="fas fa-clipboard-check"></i> درجات النهائي (60 درجة)</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>النظري (من 40)</label>
                                <input type="number" name="final_theory" value="${grade?.final_theory || ''}" min="0" max="40" step="0.1" placeholder="0-40">
                            </div>
                            <div class="form-group">
                                <label>العملي (من 20)</label>
                                <input type="number" name="final_practical" value="${grade?.final_practical || ''}" min="0" max="20" step="0.1" placeholder="0-20">
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>الفصل</label>
                            <select name="semester" required>
                                <option value="الفصل الأول" ${grade?.semester === 'الفصل الأول' ? 'selected' : ''}>الفصل الأول</option>
                                <option value="الفصل الثاني" ${grade?.semester === 'الفصل الثاني' ? 'selected' : ''}>الفصل الثاني</option>
                                <option value="الفصل الصيفي" ${grade?.semester === 'الفصل الصيفي' ? 'selected' : ''}>الفصل الصيفي</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>السنة الأكاديمية</label>
                            <input type="text" name="academic_year" value="${grade?.academic_year || '2024'}" required>
                        </div>
                    </div>

                    <div class="grade-summary">
                        <p><strong>المجموع الكلي: </strong><span id="totalGrade">0</span> من 100</p>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error('❌ Modal container not found!');
        alert('خطأ: لا يمكن العثور على حاوي النوافذ');
        return;
    }

    modalContainer.innerHTML = modalHTML;
    console.log('✅ Grade modal HTML set, length:', modalHTML.length);

    // Add event listeners for automatic calculation
    const gradeInputs = document.querySelectorAll('input[name^="midterm_"], input[name^="final_"]');
    gradeInputs.forEach(input => {
        input.addEventListener('input', updateTotalGrade);
    });

    // Initial calculation
    updateTotalGrade();

    function updateTotalGrade() {
        // Get input values and ensure they are numbers
        const midtermTheoryInput = document.querySelector('input[name="midterm_theory"]');
        const midtermPracticalInput = document.querySelector('input[name="midterm_practical"]');
        const finalTheoryInput = document.querySelector('input[name="final_theory"]');
        const finalPracticalInput = document.querySelector('input[name="final_practical"]');

        // Convert to numbers, default to 0 if empty or invalid
        const midtermTheory = Number(midtermTheoryInput?.value) || 0;
        const midtermPractical = Number(midtermPracticalInput?.value) || 0;
        const finalTheory = Number(finalTheoryInput?.value) || 0;
        const finalPractical = Number(finalPracticalInput?.value) || 0;

        // Calculate totals
        const midtermTotal = midtermTheory + midtermPractical;
        const finalTotal = finalTheory + finalPractical;
        const total = midtermTotal + finalTotal;

        // Update display
        const totalElement = document.getElementById('totalGrade');
        if (totalElement) {
            totalElement.textContent = total.toFixed(1);

            // Update color based on grade
            if (total >= 90) totalElement.style.color = '#28a745';
            else if (total >= 80) totalElement.style.color = '#17a2b8';
            else if (total >= 70) totalElement.style.color = '#ffc107';
            else if (total >= 60) totalElement.style.color = '#fd7e14';
            else totalElement.style.color = '#dc3545';
        }

        // Debug log
        console.log('Grade calculation:', {
            midtermTheory,
            midtermPractical,
            finalTheory,
            finalPractical,
            midtermTotal,
            finalTotal,
            total
        });
    }

    document.getElementById('gradeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const gradeData = Object.fromEntries(formData);

        // If editing, preserve the original student_id and subject_id
        if (isEdit) {
            gradeData.student_id = grade.student_id;
            gradeData.subject_id = grade.subject_id;
        }

        try {
            const url = isEdit ? `/api/grades/${gradeId}` : '/api/grades';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gradeData)
            });

            const result = await response.json();

            if (response.ok) {
                closeModal();
                await loadGrades();
                alert(result.message || (isEdit ? 'تم تحديث الدرجة بنجاح' : 'تم إضافة الدرجة بنجاح'));
            } else {
                alert(result.error || 'حدث خطأ أثناء حفظ البيانات');
            }
        } catch (error) {
            console.error('Error saving grade:', error);
            alert('حدث خطأ أثناء حفظ البيانات');
        }
    });
}

window.closeModal = function() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.innerHTML = '';
        console.log('✅ Modal closed');
    } else {
        console.error('❌ Modal container not found');
    }
}

// Debug function for empty modals
window.debugModalData = function() {
    console.log('🔍 Modal Debug Info:');
    console.log('Students data:', students?.length || 0, students);
    console.log('Subjects data:', subjects?.length || 0, subjects);
    console.log('Grades data:', grades?.length || 0, grades);

    const modalContainer = document.getElementById('modalContainer');
    console.log('Modal container:', modalContainer ? 'Found' : 'Not found');

    if (modalContainer) {
        console.log('Modal content:', modalContainer.innerHTML.length > 0 ? 'Has content' : 'Empty');
        console.log('Modal HTML:', modalContainer.innerHTML.substring(0, 200) + '...');
    }
}

// Debug function for empty page
window.debugEmptyPage = function() {
    console.log('🔍 Page Debug Info:');
    console.log('Current user:', currentUser);

    const loginPage = document.getElementById('loginPage');
    const adminDashboard = document.getElementById('adminDashboard');
    const studentDashboard = document.getElementById('studentDashboard');

    console.log('Login page active:', loginPage?.classList.contains('active'));
    console.log('Admin dashboard active:', adminDashboard?.classList.contains('active'));
    console.log('Student dashboard active:', studentDashboard?.classList.contains('active'));

    if (adminDashboard) {
        console.log('Admin dashboard display:', getComputedStyle(adminDashboard).display);
    }

    const adminSections = document.querySelectorAll('.admin-content-section');
    console.log(`Found ${adminSections.length} admin sections:`);
    adminSections.forEach(section => {
        console.log(`  - ${section.id}: ${section.classList.contains('active') ? 'Active' : 'Inactive'} (${getComputedStyle(section).display})`);
    });
}

// Force show dashboard function
window.forceShowDashboard = function() {
    console.log('🔧 Force showing dashboard...');

    const loginPage = document.getElementById('loginPage');
    const adminDashboard = document.getElementById('adminDashboard');
    const dashboardSection = document.getElementById('dashboardSection');

    if (loginPage) loginPage.classList.remove('active');
    if (adminDashboard) {
        adminDashboard.classList.add('active');
        adminDashboard.style.display = 'block';
    }

    // Hide all sections
    document.querySelectorAll('.admin-content-section, .student-content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // Show dashboard section
    if (dashboardSection) {
        dashboardSection.classList.add('active');
        dashboardSection.style.display = 'block';
        dashboardSection.style.visibility = 'visible';
        console.log('✅ Dashboard section shown');
    }
}

// Debug function for poll buttons
window.debugPollButtons = function() {
    console.log('🔍 Debugging poll buttons...');

    const pollCards = document.querySelectorAll('.poll-card');
    console.log(`Found ${pollCards.length} poll cards`);

    pollCards.forEach((card, index) => {
        console.log(`\n📋 Poll card ${index + 1}:`);

        const buttons = card.querySelectorAll('button');
        console.log(`  Found ${buttons.length} buttons`);

        buttons.forEach((btn, btnIndex) => {
            console.log(`    Button ${btnIndex + 1}:`);
            console.log(`      Text: "${btn.textContent.trim()}"`);
            console.log(`      onclick: ${btn.getAttribute('onclick')}`);
            console.log(`      Classes: ${btn.className}`);
        });
    });
}

// Test toggle function
window.testTogglePoll = function(pollId) {
    console.log(`🧪 Testing toggle for poll ${pollId}...`);
    console.log('This should call togglePollStatus, NOT deletePoll');

    // Call the function directly
    togglePollStatus(pollId, false);
}

// Comprehensive test function
window.testPollToggleIssue = async function() {
    console.log('🔍 Testing poll toggle issue...\n');

    try {
        // 1. Test API directly
        console.log('1. Testing API /api/polls...');
        const response = await fetch('/api/polls');
        const polls = await response.json();
        console.log(`   Found ${polls.length} polls`);

        if (polls.length > 0) {
            const testPoll = polls[0];
            console.log(`   Test poll: "${testPoll.title}" (ID: ${testPoll.id}, Active: ${testPoll.is_active})`);

            // 2. Test toggle API
            console.log('\n2. Testing toggle API...');
            const toggleResponse = await fetch(`/api/polls/${testPoll.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: false })
            });

            console.log(`   Toggle response: ${toggleResponse.status}`);

            if (toggleResponse.ok) {
                // 3. Check if poll still exists
                console.log('\n3. Checking if poll still exists...');
                const checkResponse = await fetch('/api/polls');
                const updatedPolls = await checkResponse.json();
                const stillExists = updatedPolls.find(p => p.id === testPoll.id);

                if (stillExists) {
                    console.log(`   ✅ Poll still exists! Active: ${stillExists.is_active}`);
                } else {
                    console.log('   ❌ Poll disappeared! This is the bug.');
                }

                // 4. Reload polls in UI
                console.log('\n4. Reloading polls in UI...');
                await loadPolls();
                console.log('   UI polls reloaded');
            }
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Toggle password visibility
window.togglePasswordVisibility = function() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.toggle-password i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleButton.className = 'fas fa-eye';
    }
}

// Quick login function
window.quickLogin = function(username, password) {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;

    // Add visual feedback
    const form = document.getElementById('loginForm');
    const inputs = form.querySelectorAll('input');

    inputs.forEach(input => {
        input.style.borderColor = '#28a745';
        input.style.background = 'rgba(40, 167, 69, 0.1)';
    });

    // Trigger form submission after a short delay
    setTimeout(() => {
        form.dispatchEvent(new Event('submit'));
    }, 300);
}

// Edit functions - make them global
window.editStudent = function(id) {
    showStudentModal(id);
}

window.editSubject = function(id) {
    showSubjectModal(id);
}

window.editGrade = function(id) {
    showGradeModal(id);
}

// Delete functions
window.deleteStudent = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
        try {
            const response = await fetch(`/api/students/${id}`, { method: 'DELETE' });
            if (response.ok) {
                await loadStudents();
                alert('تم حذف الطالب بنجاح');
            } else {
                alert('حدث خطأ أثناء حذف الطالب');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('حدث خطأ أثناء حذف الطالب');
        }
    }
}

window.deleteSubject = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
        try {
            const response = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
            if (response.ok) {
                await loadSubjects();
                alert('تم حذف المادة بنجاح');
            } else {
                alert('حدث خطأ أثناء حذف المادة');
            }
        } catch (error) {
            console.error('Error deleting subject:', error);
            alert('حدث خطأ أثناء حذف المادة');
        }
    }
}

window.deleteGrade = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذه الدرجة؟')) {
        try {
            const response = await fetch(`/api/grades/${id}`, { method: 'DELETE' });
            if (response.ok) {
                await loadGrades();
                alert('تم حذف الدرجة بنجاح');
            } else {
                alert('حدث خطأ أثناء حذف الدرجة');
            }
        } catch (error) {
            console.error('Error deleting grade:', error);
            alert('حدث خطأ أثناء حذف الدرجة');
        }
    }
}

// Poll functions
function renderPollsList() {
    const container = document.getElementById('pollsList');
    if (!container) return;

    container.innerHTML = '';

    polls.forEach(poll => {
        const pollCard = document.createElement('div');
        pollCard.className = 'poll-card';
        pollCard.innerHTML = `
            <div class="poll-header">
                <h4>${poll.title}</h4>
                <div class="poll-stats">
                    <span class="response-count">${poll.response_count}/${poll.total_students} إجابة</span>
                    <span class="poll-status ${poll.is_active ? 'active' : 'inactive'}">
                        <i class="fas fa-circle"></i>
                        ${poll.is_active ? 'نشط' : 'متوقف'}
                    </span>
                </div>
            </div>
            <p class="poll-description">${poll.description || ''}</p>
            <div class="poll-actions">
                <button class="btn btn-primary btn-sm" onclick="viewPollResults(${poll.id})">
                    <i class="fas fa-chart-bar"></i> عرض النتائج
                </button>
                <button class="btn btn-success btn-sm" onclick="printPollResults(${poll.id})" title="طباعة النتائج">
                    <i class="fas fa-print"></i> طباعة
                </button>
                <button class="btn ${poll.is_active ? 'btn-warning' : 'btn-info'} btn-sm" onclick="togglePollStatus(${poll.id}, ${!poll.is_active})" title="${poll.is_active ? 'إيقاف الاستطلاع مؤقتاً (يمكن تفعيله لاحقاً)' : 'تفعيل الاستطلاع مرة أخرى'}">
                    <i class="fas fa-${poll.is_active ? 'pause' : 'play'}"></i>
                    ${poll.is_active ? 'إيقاف' : 'تفعيل'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="deletePoll(${poll.id})" title="حذف الاستطلاع نهائياً (لا يمكن التراجع)">
                    <i class="fas fa-trash"></i> حذف نهائي
                </button>
            </div>
        `;
        container.appendChild(pollCard);
    });
}

function renderStudentPollsList() {
    const container = document.getElementById('studentPollsList');
    const countElement = document.getElementById('activePollsCount');

    if (!container) return;

    container.innerHTML = '';

    const activePolls = polls.filter(poll => poll.is_active);

    // Update count
    if (countElement) {
        countElement.textContent = activePolls.length;
    }

    if (activePolls.length === 0) {
        container.innerHTML = `
            <div class="no-polls">
                <i class="fas fa-poll fa-3x"></i>
                <h3>لا توجد استطلاعات متاحة</h3>
                <p>لا توجد استطلاعات نشطة في الوقت الحالي. تحقق مرة أخرى لاحقاً.</p>
            </div>
        `;
        return;
    }

    activePolls.forEach(poll => {
        const pollCard = document.createElement('div');
        pollCard.className = 'student-poll-card';
        pollCard.innerHTML = `
            <div class="poll-header">
                <h4><i class="fas fa-poll"></i> ${poll.title}</h4>
            </div>
            <p class="poll-description">${poll.description || 'لا يوجد وصف متاح'}</p>
            <div class="poll-actions">
                <button class="btn btn-primary" onclick="showPollVoting(${poll.id})">
                    <i class="fas fa-vote-yea"></i> المشاركة في الاستطلاع
                </button>
            </div>
        `;
        container.appendChild(pollCard);
    });
}

window.showPollVoting = async function(pollId) {
    try {
        const response = await fetch(`/api/polls/${pollId}`);
        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'حدث خطأ');
            return;
        }

        const modalHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${data.poll.title}</h3>
                        <button class="close-btn" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="poll-voting-content">
                        <p class="poll-description">${data.poll.description || ''}</p>
                        <form id="pollVotingForm">
                            <div class="poll-options">
                                ${data.options.map(option => `
                                    <label class="poll-option ${data.userVote === option.id ? 'selected' : ''}">
                                        <input type="radio" name="option_id" value="${option.id}"
                                               ${data.userVote === option.id ? 'checked' : ''}>
                                        <span class="option-text">${option.option_text}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                                <button type="submit" class="btn btn-primary">
                                    ${data.userVote ? 'تغيير الإجابة' : 'تسجيل الإجابة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHTML;

        document.getElementById('pollVotingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const optionId = formData.get('option_id');

            if (!optionId) {
                alert('يرجى اختيار إجابة');
                return;
            }

            try {
                const voteResponse = await fetch(`/api/polls/${pollId}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ option_id: parseInt(optionId) })
                });

                const voteResult = await voteResponse.json();

                if (voteResponse.ok) {
                    closeModal();
                    alert(voteResult.message || 'تم تسجيل إجابتك بنجاح');
                    await loadPolls(); // Refresh polls
                } else {
                    alert(voteResult.error || 'حدث خطأ أثناء تسجيل الإجابة');
                }
            } catch (error) {
                console.error('Error voting:', error);
                alert('حدث خطأ أثناء تسجيل الإجابة');
            }
        });

    } catch (error) {
        console.error('Error loading poll:', error);
        alert('حدث خطأ أثناء تحميل الاستطلاع');
    }
}

// Make function global
window.showPollModal = function() {
    console.log('showPollModal called');
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>إضافة استطلاع جديد</h3>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <form id="pollForm" class="modal-form">
                    <div class="form-group">
                        <label>عنوان الاستطلاع</label>
                        <input type="text" name="title" required placeholder="مثال: موعد الامتحان العملي">
                    </div>
                    <div class="form-group">
                        <label>وصف الاستطلاع</label>
                        <textarea name="description" rows="3" placeholder="وصف اختياري للاستطلاع"></textarea>
                    </div>
                    <div class="form-group">
                        <label>الخيارات المتاحة</label>
                        <div id="pollOptions">
                            <div class="option-input">
                                <input type="text" name="options[]" required placeholder="الخيار الأول">
                                <button type="button" class="btn btn-danger btn-sm" onclick="removeOption(this)" style="display: none;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <div class="option-input">
                                <input type="text" name="options[]" required placeholder="الخيار الثاني">
                                <button type="button" class="btn btn-danger btn-sm" onclick="removeOption(this)" style="display: none;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="addOption()">
                            <i class="fas fa-plus"></i> إضافة خيار
                        </button>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                        <button type="submit" class="btn btn-primary">إنشاء الاستطلاع</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    document.getElementById('pollForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const pollData = {
            title: formData.get('title'),
            description: formData.get('description'),
            options: formData.getAll('options[]').filter(option => option.trim() !== '')
        };

        if (pollData.options.length < 2) {
            alert('يجب إضافة خيارين على الأقل');
            return;
        }

        try {
            const response = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pollData)
            });

            const result = await response.json();

            if (response.ok) {
                closeModal();
                await loadPolls();
                alert('تم إنشاء الاستطلاع بنجاح');
            } else {
                alert(result.error || 'حدث خطأ أثناء إنشاء الاستطلاع');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            alert('حدث خطأ أثناء إنشاء الاستطلاع');
        }
    });
}

// Make functions global
window.addOption = function() {
    const container = document.getElementById('pollOptions');
    const optionCount = container.children.length;

    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.innerHTML = `
        <input type="text" name="options[]" required placeholder="خيار جديد">
        <button type="button" class="btn btn-danger btn-sm" onclick="removeOption(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(optionDiv);

    // Show remove buttons if more than 2 options
    if (optionCount >= 2) {
        container.querySelectorAll('.btn-danger').forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }
}

window.removeOption = function(button) {
    const container = document.getElementById('pollOptions');
    const optionDiv = button.parentElement;

    if (container.children.length > 2) {
        optionDiv.remove();

        // Hide remove buttons if only 2 options left
        if (container.children.length <= 2) {
            container.querySelectorAll('.btn-danger').forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }
}

window.viewPollResults = async function(pollId) {
    try {
        const response = await fetch(`/api/polls/${pollId}/results`);
        const results = await response.json();

        if (!response.ok) {
            alert(results.error || 'حدث خطأ');
            return;
        }

        // Group results by option
        const groupedResults = {};
        results.forEach(result => {
            if (!groupedResults[result.option_text]) {
                groupedResults[result.option_text] = [];
            }
            groupedResults[result.option_text].push(result);
        });

        const modalHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content poll-results-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>نتائج الاستطلاع</h3>
                        <button class="close-btn" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="poll-results-content">
                        ${Object.keys(groupedResults).map(option => `
                            <div class="result-option">
                                <h4>${option} (${groupedResults[option].length} صوت)</h4>
                                <div class="voters-list">
                                    ${groupedResults[option].map(voter => `
                                        <div class="voter-item">
                                            <span class="voter-name">${voter.student_name}</span>
                                            <span class="voter-number">(${voter.student_number})</span>
                                            <span class="vote-time">${new Date(voter.voted_at).toLocaleString('ar-EG')}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}

                        ${Object.keys(groupedResults).length === 0 ? '<p class="no-results">لا توجد إجابات بعد</p>' : ''}
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-primary" onclick="printPollResults(${pollId})">
                            <i class="fas fa-print"></i> طباعة النتائج
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">إغلاق</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHTML;

    } catch (error) {
        console.error('Error loading poll results:', error);
        alert('حدث خطأ أثناء تحميل النتائج');
    }
}

// Print poll results function
window.printPollResults = async function(pollId) {
    try {
        console.log('Printing poll results for ID:', pollId);

        // Fetch poll details and results
        const [pollResponse, resultsResponse] = await Promise.all([
            fetch(`/api/polls/${pollId}`),
            fetch(`/api/polls/${pollId}/results`)
        ]);

        if (!pollResponse.ok || !resultsResponse.ok) {
            alert('حدث خطأ أثناء جلب بيانات الاستطلاع');
            return;
        }

        const pollData = await pollResponse.json();
        const results = await resultsResponse.json();

        // Group results by option
        const groupedResults = {};
        const totalVotes = results.length;

        results.forEach(result => {
            if (!groupedResults[result.option_text]) {
                groupedResults[result.option_text] = [];
            }
            groupedResults[result.option_text].push(result);
        });

        // Create print content
        const printContent = createPrintableContent(pollData.poll, groupedResults, totalVotes);

        // Open print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
        };

    } catch (error) {
        console.error('Error printing poll results:', error);
        alert('حدث خطأ أثناء طباعة النتائج');
    }
}

// Create printable content for poll results
function createPrintableContent(poll, groupedResults, totalVotes) {
    // Format dates in Arabic with English numbers
    const now = new Date();
    const currentDate = `${now.getDate()} ${getArabicMonth(now.getMonth())} ${now.getFullYear()} في ${formatTime(now)}`;

    const created = new Date(poll.created_at);
    const createdDate = `${created.getDate()} ${getArabicMonth(created.getMonth())} ${created.getFullYear()}`;

    // Helper function for Arabic months
    function getArabicMonth(monthIndex) {
        const months = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return months[monthIndex];
    }

    // Helper function for time formatting
    function formatTime(date) {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return `${hours}:${minutes} ${ampm}`;
    }

    // Sort options by vote count (highest first)
    const sortedOptions = Object.keys(groupedResults).sort((a, b) => {
        return groupedResults[b].length - groupedResults[a].length;
    });

    const optionsHtml = sortedOptions.map((option, optionIndex) => {
        const votes = groupedResults[option];
        const percentage = totalVotes > 0 ? ((votes.length / totalVotes) * 100).toFixed(1) : 0;

        // Sort voters by vote time
        const sortedVotes = votes.sort((a, b) => new Date(a.voted_at) - new Date(b.voted_at));

        return `
            <div class="print-option">
                <div class="option-header">
                    <h3>${option}</h3>
                    <div class="percentage">${percentage}%</div>
                </div>
                <div class="voters-list">
                    <h4>${votes.length} مصوت</h4>
                    ${sortedVotes.map((voter, index) => `
                        <div class="voter-row">
                            <span class="voter-number">${index + 1}.</span>
                            <span class="voter-name">${voter.student_name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>نتائج الاستطلاع - ${poll.title}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Tahoma', 'Arial', sans-serif;
                    line-height: 1.5;
                    color: #333;
                    background: white;
                    padding: 20px;
                    direction: rtl;
                    font-size: 14px;
                }

                .print-header {
                    text-align: center;
                    border-bottom: 2px solid #4a90e2;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                .print-header h1 {
                    font-size: 1.5rem;
                    margin-bottom: 5px;
                    color: #4a90e2;
                }

                .print-header .subtitle {
                    font-size: 1rem;
                    margin-bottom: 10px;
                    color: #666;
                }

                .print-header .date {
                    font-size: 0.8rem;
                    color: #888;
                }



                .poll-stats {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 10px;
                    background: #f9f9f9;
                    border-radius: 5px;
                }

                .poll-stats span {
                    margin: 0 15px;
                    color: #666;
                    font-size: 0.9rem;
                }

                .print-option {
                    margin-bottom: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }

                .option-header {
                    background: #4a90e2;
                    color: white;
                    padding: 10px 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .option-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: bold;
                }

                .percentage {
                    font-weight: bold;
                    font-size: 1.1rem;
                }

                .voters-list {
                    padding: 10px 15px;
                    background: #f9f9f9;
                }

                .voters-list h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 0.9rem;
                    font-weight: bold;
                }

                .voter-row {
                    display: flex;
                    align-items: center;
                    padding: 3px 0;
                    font-size: 0.8rem;
                }

                .voter-number {
                    color: #4a90e2;
                    width: 20px;
                    font-size: 0.7rem;
                }

                .voter-name {
                    flex: 1;
                    margin-right: 8px;
                }

                .print-footer {
                    margin-top: 20px;
                    text-align: center;
                    color: #888;
                    font-size: 0.7rem;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }

                @media print {
                    body {
                        padding: 0;
                    }

                    .print-option {
                        page-break-inside: avoid;
                    }

                    .option-header {
                        background: #667eea !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>نتائج الاستطلاع</h1>
                <div class="subtitle">${poll.title}</div>
                <div class="date">تاريخ الطباعة: ${currentDate}</div>
            </div>

            <div class="poll-stats">
                <span>إجمالي الأصوات: ${totalVotes}</span>
                <span>عدد الخيارات: ${Object.keys(groupedResults).length}</span>
            </div>

            <div class="results-section">
                ${optionsHtml}
            </div>

            <div class="print-footer">
                <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الطلاب والدرجات</p>
                <p>© ${new Date().getFullYear()} - جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
}

window.togglePollStatus = async function(pollId, newStatus) {
    console.log('🔄 togglePollStatus called with:', { pollId, newStatus });
    console.log('📡 Making PUT request to:', `/api/polls/${pollId}`);

    try {
        const requestBody = { is_active: newStatus };
        console.log('📤 Request body:', requestBody);

        const response = await fetch(`/api/polls/${pollId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Toggle successful:', result);

            await loadPolls();
            alert(newStatus ? 'تم تفعيل الاستطلاع بنجاح' : 'تم إيقاف الاستطلاع بنجاح');
            console.log('✅ Poll status toggled successfully');
        } else {
            const errorData = await response.json();
            console.error('❌ Toggle failed:', errorData);
            alert('حدث خطأ أثناء تغيير حالة الاستطلاع: ' + (errorData.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('❌ Error toggling poll status:', error);
        alert('حدث خطأ أثناء تغيير حالة الاستطلاع');
    }
}

// Delete poll function
window.deletePoll = async function(pollId) {
    // Confirm deletion
    const confirmDelete = confirm('هل أنت متأكد من حذف هذا الاستطلاع؟\n\nسيتم حذف الاستطلاع وجميع الأصوات المرتبطة به نهائياً.');

    if (!confirmDelete) {
        return;
    }

    // Double confirmation for safety
    const doubleConfirm = confirm('تأكيد نهائي: هذا الإجراء لا يمكن التراجع عنه!\n\nهل تريد المتابعة؟');

    if (!doubleConfirm) {
        return;
    }

    try {
        console.log('Deleting poll with ID:', pollId);

        const response = await fetch(`/api/polls/${pollId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            await loadPolls();
            alert('تم حذف الاستطلاع بنجاح');
            console.log('Poll deleted successfully');
        } else {
            const errorData = await response.json();
            alert('حدث خطأ أثناء حذف الاستطلاع: ' + (errorData.error || 'خطأ غير معروف'));
            console.error('Error deleting poll:', errorData);
        }
    } catch (error) {
        console.error('Error deleting poll:', error);
        alert('حدث خطأ أثناء حذف الاستطلاع');
    }
}

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database...');

db.serialize(() => {
    // Create users table (for login)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
        student_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id)
    )`);

    // Create students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_number TEXT UNIQUE NOT NULL,
        class TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create subjects table
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        credit_hours INTEGER DEFAULT 3,
        department TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Drop existing grades table if it exists
    db.run(`DROP TABLE IF EXISTS grades`);

    // Create grades table with new structure
    db.run(`CREATE TABLE grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        midterm_theory REAL DEFAULT 0,
        midterm_practical REAL DEFAULT 0,
        midterm_total REAL DEFAULT 0,
        final_theory REAL DEFAULT 0,
        final_practical REAL DEFAULT 0,
        final_total REAL DEFAULT 0,
        total_grade REAL DEFAULT 0,
        letter_grade TEXT,
        semester TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id),
        UNIQUE(student_id, subject_id, semester, academic_year)
    )`);

    // Create polls table for questions/surveys
    db.run(`CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // Create poll options table
    db.run(`CREATE TABLE IF NOT EXISTS poll_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
    )`);

    // Create poll responses table
    db.run(`CREATE TABLE IF NOT EXISTS poll_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        option_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (option_id) REFERENCES poll_options (id),
        UNIQUE(poll_id, student_id)
    )`);

    // Insert sample data
    console.log('Inserting sample data...');

    // Hash password for admin
    const adminPassword = bcrypt.hashSync('%Asd123asd%$%', 10);

    // Insert admin user
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        ['admin1', adminPassword, 'admin']);

    // Insert sample students
    const students = [
        ['أحمد محمد علي', 'ST001', 'الفصل الأول', 'علوم الحاسوب', 'ahmed@email.com', '123456789'],
        ['فاطمة أحمد حسن', 'ST002', 'الفصل الثاني', 'علوم الحاسوب', 'fatima@email.com', '123456790'],
        ['محمد عبدالله سالم', 'ST003', 'الفصل الأول', 'الهندسة', 'mohammed@email.com', '123456791'],
        ['نور الدين يوسف', 'ST004', 'الفصل الثالث', 'علوم الحاسوب', 'nour@email.com', '123456792'],
        ['سارة محمود طه', 'ST005', 'الفصل الثاني', 'الرياضيات', 'sara@email.com', '123456793']
    ];

    students.forEach(student => {
        db.run(`INSERT OR REPLACE INTO students (name, student_number, class, department, email, phone)
                VALUES (?, ?, ?, ?, ?, ?)`, student);
    });

    // Insert sample subjects
    const subjects = [
        ['البرمجة الأساسية', 'CS101', 3, 'علوم الحاسوب'],
        ['قواعد البيانات', 'CS201', 3, 'علوم الحاسوب'],
        ['الرياضيات المتقدمة', 'MATH201', 4, 'الرياضيات'],
        ['الفيزياء العامة', 'PHY101', 3, 'الفيزياء'],
        ['الكيمياء العامة', 'CHEM101', 3, 'الكيمياء'],
        ['هندسة البرمجيات', 'CS301', 3, 'علوم الحاسوب']
    ];

    subjects.forEach(subject => {
        db.run(`INSERT OR IGNORE INTO subjects (name, code, credit_hours, department) 
                VALUES (?, ?, ?, ?)`, subject);
    });

    // Insert sample grades with new structure
    setTimeout(() => {
        // Function to calculate letter grade
        function calculateLetterGrade(total) {
            if (total >= 95) return 'A+';
            else if (total >= 90) return 'A';
            else if (total >= 85) return 'A-';
            else if (total >= 80) return 'B+';
            else if (total >= 75) return 'B';
            else if (total >= 70) return 'B-';
            else if (total >= 65) return 'C+';
            else if (total >= 60) return 'C';
            else if (total >= 55) return 'C-';
            else if (total >= 50) return 'D';
            else return 'F';
        }

        const grades = [
            // [student_id, subject_id, midterm_theory, midterm_practical, final_theory, final_practical, semester, academic_year]
            [1, 1, 25, 8, 35, 18, 'الفصل الأول', '2024'],  // أحمد - البرمجة الأساسية
            [1, 2, 22, 7, 32, 16, 'الفصل الأول', '2024'],  // أحمد - قواعد البيانات
            [2, 1, 28, 9, 38, 19, 'الفصل الأول', '2024'],  // فاطمة - البرمجة الأساسية
            [2, 3, 20, 6, 30, 15, 'الفصل الأول', '2024'],  // فاطمة - الرياضيات المتقدمة
            [3, 4, 26, 8, 34, 17, 'الفصل الأول', '2024'],  // محمد - الفيزياء العامة
            [4, 1, 18, 6, 28, 14, 'الفصل الأول', '2024'],  // نور - البرمجة الأساسية
            [5, 3, 29, 10, 39, 20, 'الفصل الأول', '2024']  // سارة - الرياضيات المتقدمة
        ];

        grades.forEach(grade => {
            const [student_id, subject_id, midterm_theory, midterm_practical, final_theory, final_practical, semester, academic_year] = grade;

            // Calculate totals
            const midterm_total = midterm_theory + midterm_practical;
            const final_total = final_theory + final_practical;
            const total_grade = midterm_total + final_total;
            const letter_grade = calculateLetterGrade(total_grade);

            db.run(`INSERT OR IGNORE INTO grades
                    (student_id, subject_id, midterm_theory, midterm_practical, midterm_total,
                     final_theory, final_practical, final_total, total_grade, letter_grade, semester, academic_year)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [student_id, subject_id, midterm_theory, midterm_practical, midterm_total,
                     final_theory, final_practical, final_total, total_grade, letter_grade, semester, academic_year]);
        });

        // Create student users with first name as username and student number as password
        setTimeout(() => {
            db.all("SELECT id, name, student_number FROM students", (err, rows) => {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log('Creating user accounts for students...');

                rows.forEach(student => {
                    // Extract first name (first word before space)
                    const firstName = student.name.split(' ')[0];
                    // Use student number as password (hashed)
                    const studentPassword = bcrypt.hashSync(student.student_number, 10);

                    db.run(`INSERT OR IGNORE INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)`,
                        [firstName, studentPassword, 'student', student.id], function(err) {
                            if (err) {
                                console.error('Error creating user for student:', student.name, err);
                            } else {
                                console.log(`Created user: ${firstName} with password: ${student.student_number}`);
                            }
                        });
                });

                setTimeout(() => {
                    // Insert sample poll
                    console.log('Creating sample poll...');

                    db.run(`INSERT INTO polls (title, description, is_active, created_by)
                            VALUES (?, ?, ?, ?)`,
                        ['موعد الامتحان العملي', 'يرجى اختيار الموعد المناسب لك للامتحان العملي', 1, 1],
                        function(err) {
                            if (err) {
                                console.error('Error creating poll:', err);
                                return;
                            }

                            const pollId = this.lastID;
                            console.log(`Created poll with ID: ${pollId}`);

                            // Insert poll options
                            const options = [
                                '31 يوليو 2024',
                                '1 أغسطس 2024'
                            ];

                            options.forEach(option => {
                                db.run(`INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)`,
                                    [pollId, option], (err) => {
                                        if (err) {
                                            console.error('Error creating poll option:', err);
                                        } else {
                                            console.log(`Created option: ${option}`);
                                        }
                                    });
                            });
                        });

                    console.log('\nDatabase initialized successfully!');
                    console.log('Admin login: username=admin1, password=%Asd123asd%$%');
                    console.log('\nStudent login examples:');
                    console.log('  - username=أحمد, password=ST001');
                    console.log('  - username=فاطمة, password=ST002');
                    console.log('  - username=محمد, password=ST003');
                    console.log('  - username=نور, password=ST004');
                    console.log('  - username=سارة, password=ST005');

                    setTimeout(() => {
                        db.close();
                    }, 1000);
                }, 500);
            });
        }, 500);
    }, 1000);
});

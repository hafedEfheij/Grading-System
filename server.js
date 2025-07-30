const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database on startup for Railway
const initializeDatabase = () => {
    console.log('Initializing database for production...');

    // Check if database exists and has tables
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('Database check error:', err);
            return;
        }

        if (!row) {
            console.log('Database tables not found, initializing...');
            // Run initialization script
            require('./scripts/init-db.js');
        } else {
            console.log('Database already initialized');
        }
    });
};

// Database connection
const db = new sqlite3.Database('./database.sqlite');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'student-management-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            student_id: user.student_id
        };
        
        res.json({ 
            success: true, 
            user: { 
                username: user.username, 
                role: user.role,
                student_id: user.student_id
            } 
        });
    });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get current user
app.get('/api/user', requireAuth, (req, res) => {
    res.json({ user: req.session.user });
});

// Student routes
app.get('/api/students', requireAdmin, (req, res) => {
    db.all('SELECT * FROM students ORDER BY name', (err, students) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(students);
    });
});

app.post('/api/students', requireAdmin, (req, res) => {
    const { name, student_number, class: studentClass, department, email, phone } = req.body;

    db.run('INSERT INTO students (name, student_number, class, department, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [name, student_number, studentClass, department, email, phone], function(err) {
            if (err) {
                console.error('Error inserting student:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }

            const studentId = this.lastID;

            // Create user account for student with first name as username and student number as password
            const firstName = name.split(' ')[0]; // Extract first name
            const studentPassword = bcrypt.hashSync(student_number, 10); // Use student number as password

            console.log(`Creating user account for student: ${firstName} with password: ${student_number}`);

            db.run('INSERT INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)',
                [firstName, studentPassword, 'student', studentId], function(userErr) {
                    if (userErr) {
                        console.error('Error creating user account:', userErr);
                        // If user creation fails, we should still return success for student creation
                        // but log the error for debugging
                        return res.json({
                            id: studentId,
                            success: true,
                            warning: 'Student created but user account creation failed: ' + userErr.message
                        });
                    }

                    console.log(`User account created successfully for: ${firstName}`);
                    res.json({
                        id: studentId,
                        success: true,
                        message: `Student and user account created successfully. Login: ${firstName} / ${student_number}`
                    });
                });
        });
});

app.put('/api/students/:id', requireAdmin, (req, res) => {
    const { name, student_number, class: studentClass, department, email, phone } = req.body;
    const { id } = req.params;

    db.run('UPDATE students SET name = ?, student_number = ?, class = ?, department = ?, email = ?, phone = ? WHERE id = ?',
        [name, student_number, studentClass, department, email, phone, id], function(err) {
            if (err) {
                console.error('Error updating student:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }

            // Update user account with new first name and student number
            const firstName = name.split(' ')[0];
            const studentPassword = bcrypt.hashSync(student_number, 10);

            console.log(`Updating user account for student ID ${id}: ${firstName} with password: ${student_number}`);

            db.run('UPDATE users SET username = ?, password = ? WHERE student_id = ?',
                [firstName, studentPassword, id], function(userErr) {
                    if (userErr) {
                        console.error('Error updating user account:', userErr);
                        return res.json({
                            success: true,
                            warning: 'Student updated but user account update failed: ' + userErr.message
                        });
                    }

                    console.log(`User account updated successfully for student ID ${id}: ${firstName}`);
                    res.json({
                        success: true,
                        message: `Student and user account updated successfully. New login: ${firstName} / ${student_number}`
                    });
                });
        });
});

app.delete('/api/students/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Subject routes
app.get('/api/subjects', requireAuth, (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY name', (err, subjects) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(subjects);
    });
});

app.post('/api/subjects', requireAdmin, (req, res) => {
    const { name, code, credit_hours, department } = req.body;
    
    db.run('INSERT INTO subjects (name, code, credit_hours, department) VALUES (?, ?, ?, ?)',
        [name, code, credit_hours, department], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ id: this.lastID, success: true });
        });
});

app.put('/api/subjects/:id', requireAdmin, (req, res) => {
    const { name, code, credit_hours, department } = req.body;
    const { id } = req.params;
    
    db.run('UPDATE subjects SET name = ?, code = ?, credit_hours = ?, department = ? WHERE id = ?',
        [name, code, credit_hours, department, id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        });
});

app.delete('/api/subjects/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM subjects WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Grade routes
app.get('/api/grades', requireAuth, (req, res) => {
    let query = `
        SELECT g.*, s.name as student_name, s.student_number, sub.name as subject_name, sub.code as subject_code
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN subjects sub ON g.subject_id = sub.id
        ORDER BY s.name, sub.name
    `;

    if (req.session.user.role === 'student') {
        query = `
            SELECT g.*, s.name as student_name, s.student_number, sub.name as subject_name, sub.code as subject_code
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.student_id = ?
            ORDER BY sub.name
        `;

        db.all(query, [req.session.user.student_id], (err, grades) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(grades);
        });
    } else {
        db.all(query, (err, grades) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(grades);
        });
    }
});

app.post('/api/grades', requireAdmin, (req, res) => {
    const {
        student_id,
        subject_id,
        midterm_theory,
        midterm_practical,
        final_theory,
        final_practical,
        semester,
        academic_year
    } = req.body;

    // Validate grade ranges
    if (midterm_theory > 30 || midterm_practical > 10 || final_theory > 40 || final_practical > 20) {
        return res.status(400).json({
            error: 'درجات غير صحيحة. النصفي: نظري (30) + عملي (10)، النهائي: نظري (40) + عملي (20)'
        });
    }

    // Convert to numbers and calculate totals
    const midterm_theory_num = Number(midterm_theory) || 0;
    const midterm_practical_num = Number(midterm_practical) || 0;
    const final_theory_num = Number(final_theory) || 0;
    const final_practical_num = Number(final_practical) || 0;

    const midterm_total = midterm_theory_num + midterm_practical_num;
    const final_total = final_theory_num + final_practical_num;
    const total_grade = midterm_total + final_total;

    console.log('Grade calculation on server:', {
        midterm_theory: midterm_theory_num,
        midterm_practical: midterm_practical_num,
        final_theory: final_theory_num,
        final_practical: final_practical_num,
        midterm_total,
        final_total,
        total_grade
    });

    // Calculate letter grade
    let letter_grade = 'F';
    if (total_grade >= 95) letter_grade = 'A+';
    else if (total_grade >= 90) letter_grade = 'A';
    else if (total_grade >= 85) letter_grade = 'A-';
    else if (total_grade >= 80) letter_grade = 'B+';
    else if (total_grade >= 75) letter_grade = 'B';
    else if (total_grade >= 70) letter_grade = 'B-';
    else if (total_grade >= 65) letter_grade = 'C+';
    else if (total_grade >= 60) letter_grade = 'C';
    else if (total_grade >= 55) letter_grade = 'C-';
    else if (total_grade >= 50) letter_grade = 'D';

    db.run(`INSERT OR REPLACE INTO grades
            (student_id, subject_id, midterm_theory, midterm_practical, midterm_total,
             final_theory, final_practical, final_total, total_grade, letter_grade, semester, academic_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, subject_id, midterm_theory_num, midterm_practical_num, midterm_total,
         final_theory_num, final_practical_num, final_total, total_grade, letter_grade, semester, academic_year],
        function(err) {
            if (err) {
                console.error('Error inserting grade:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            res.json({
                id: this.lastID,
                success: true,
                message: `تم إضافة الدرجة بنجاح. المجموع: ${total_grade}/100 (${letter_grade})`
            });
        });
});

app.put('/api/grades/:id', requireAdmin, (req, res) => {
    const {
        midterm_theory,
        midterm_practical,
        final_theory,
        final_practical,
        semester,
        academic_year
    } = req.body;
    const { id } = req.params;

    // Validate grade ranges
    if (midterm_theory > 30 || midterm_practical > 10 || final_theory > 40 || final_practical > 20) {
        return res.status(400).json({
            error: 'درجات غير صحيحة. النصفي: نظري (30) + عملي (10)، النهائي: نظري (40) + عملي (20)'
        });
    }

    // Convert to numbers and calculate totals
    const midterm_theory_num = Number(midterm_theory) || 0;
    const midterm_practical_num = Number(midterm_practical) || 0;
    const final_theory_num = Number(final_theory) || 0;
    const final_practical_num = Number(final_practical) || 0;

    const midterm_total = midterm_theory_num + midterm_practical_num;
    const final_total = final_theory_num + final_practical_num;
    const total_grade = midterm_total + final_total;

    // Calculate letter grade
    let letter_grade = 'F';
    if (total_grade >= 95) letter_grade = 'A+';
    else if (total_grade >= 90) letter_grade = 'A';
    else if (total_grade >= 85) letter_grade = 'A-';
    else if (total_grade >= 80) letter_grade = 'B+';
    else if (total_grade >= 75) letter_grade = 'B';
    else if (total_grade >= 70) letter_grade = 'B-';
    else if (total_grade >= 65) letter_grade = 'C+';
    else if (total_grade >= 60) letter_grade = 'C';
    else if (total_grade >= 55) letter_grade = 'C-';
    else if (total_grade >= 50) letter_grade = 'D';

    db.run(`UPDATE grades SET
            midterm_theory = ?, midterm_practical = ?, midterm_total = ?,
            final_theory = ?, final_practical = ?, final_total = ?,
            total_grade = ?, letter_grade = ?, semester = ?, academic_year = ?
            WHERE id = ?`,
        [midterm_theory_num, midterm_practical_num, midterm_total,
         final_theory_num, final_practical_num, final_total,
         total_grade, letter_grade, semester, academic_year, id],
        function(err) {
            if (err) {
                console.error('Error updating grade:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            res.json({
                success: true,
                message: `تم تحديث الدرجة بنجاح. المجموع: ${total_grade}/100 (${letter_grade})`
            });
        });
});

app.delete('/api/grades/:id', requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM grades WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Student dashboard data
app.get('/api/student-dashboard', requireAuth, (req, res) => {
    if (req.session.user.role !== 'student') {
        return res.status(403).json({ error: 'Student access only' });
    }

    const studentId = req.session.user.student_id;

    // Get student info
    db.get('SELECT * FROM students WHERE id = ?', [studentId], (err, student) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Get student grades with rankings
        db.all(`
            SELECT
                g.*,
                sub.name as subject_name,
                sub.code as subject_code,
                sub.credit_hours,
                (SELECT COUNT(*) + 1 FROM grades g2 WHERE g2.subject_id = g.subject_id AND g2.total_grade > g.total_grade) as rank,
                (SELECT COUNT(*) FROM grades g3 WHERE g3.subject_id = g.subject_id) as total_students
            FROM grades g
            JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.student_id = ?
            ORDER BY sub.name
        `, [studentId], (err, grades) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Calculate GPA
            let totalPoints = 0;
            let totalCredits = 0;

            grades.forEach(grade => {
                let points = 0;
                switch(grade.letter_grade) {
                    case 'A+': points = 4.0; break;
                    case 'A': points = 3.7; break;
                    case 'A-': points = 3.3; break;
                    case 'B+': points = 3.0; break;
                    case 'B': points = 2.7; break;
                    case 'B-': points = 2.3; break;
                    case 'C+': points = 2.0; break;
                    case 'C': points = 1.7; break;
                    case 'C-': points = 1.3; break;
                    case 'D': points = 1.0; break;
                    default: points = 0.0;
                }
                totalPoints += points * grade.credit_hours;
                totalCredits += grade.credit_hours;
            });

            const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;

            res.json({
                student,
                grades,
                gpa,
                totalCredits
            });
        });
    });
});

// Poll routes
app.get('/api/polls', requireAuth, (req, res) => {
    // For admin: show all polls (active and inactive)
    // For students: show only active polls
    let whereClause = '';
    if (req.session.user.role === 'student') {
        whereClause = 'WHERE p.is_active = 1';
    }

    let query = `
        SELECT p.*,
               COUNT(pr.id) as response_count,
               (SELECT COUNT(*) FROM students) as total_students
        FROM polls p
        LEFT JOIN poll_responses pr ON p.id = pr.poll_id
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `;

    db.all(query, (err, polls) => {
        if (err) {
            console.error('Database error in /api/polls:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log(`Returning ${polls.length} polls for ${req.session.user.role}`);
        res.json(polls);
    });
});

app.get('/api/polls/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    // Get poll details
    db.get('SELECT * FROM polls WHERE id = ?', [id], (err, poll) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!poll) {
            return res.status(404).json({ error: 'Poll not found' });
        }

        // Get poll options with vote counts
        db.all(`
            SELECT po.*, COUNT(pr.id) as vote_count
            FROM poll_options po
            LEFT JOIN poll_responses pr ON po.id = pr.option_id
            WHERE po.poll_id = ?
            GROUP BY po.id
            ORDER BY po.id
        `, [id], (err, options) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Check if current user has voted (for students)
            if (req.session.user.role === 'student') {
                db.get('SELECT option_id FROM poll_responses WHERE poll_id = ? AND student_id = ?',
                    [id, req.session.user.student_id], (err, response) => {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }

                        res.json({
                            poll,
                            options,
                            userVote: response ? response.option_id : null
                        });
                    });
            } else {
                res.json({ poll, options });
            }
        });
    });
});

app.post('/api/polls', requireAdmin, (req, res) => {
    const { title, description, options } = req.body;

    if (!title || !options || options.length < 2) {
        return res.status(400).json({ error: 'Title and at least 2 options are required' });
    }

    db.run('INSERT INTO polls (title, description, is_active, created_by) VALUES (?, ?, ?, ?)',
        [title, description, 1, req.session.user.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            const pollId = this.lastID;

            // Insert options
            const insertOption = db.prepare('INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)');

            options.forEach(option => {
                insertOption.run([pollId, option]);
            });

            insertOption.finalize();

            res.json({ id: pollId, success: true });
        });
});

app.post('/api/polls/:id/vote', requireAuth, (req, res) => {
    const { id } = req.params;
    const { option_id } = req.body;

    if (req.session.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can vote' });
    }

    // Check if poll exists and is active
    db.get('SELECT * FROM polls WHERE id = ? AND is_active = 1', [id], (err, poll) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!poll) {
            return res.status(404).json({ error: 'Poll not found or inactive' });
        }

        // Check if option exists
        db.get('SELECT * FROM poll_options WHERE id = ? AND poll_id = ?', [option_id, id], (err, option) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!option) {
                return res.status(404).json({ error: 'Option not found' });
            }

            // Insert or update vote
            db.run(`INSERT OR REPLACE INTO poll_responses (poll_id, student_id, option_id)
                    VALUES (?, ?, ?)`,
                [id, req.session.user.student_id, option_id], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    res.json({ success: true, message: 'Vote recorded successfully' });
                });
        });
    });
});

app.put('/api/polls/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    console.log(`🔄 PUT /api/polls/${id} - Toggle poll status`);
    console.log('📤 Request body:', req.body);
    console.log('🎯 Setting is_active to:', is_active);

    db.run('UPDATE polls SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id], function(err) {
        if (err) {
            console.error('❌ Database error in PUT /api/polls:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            console.warn(`⚠️ No poll found with id ${id}`);
            return res.status(404).json({ error: 'Poll not found' });
        }

        console.log(`✅ Poll ${id} status updated successfully. Changes: ${this.changes}`);
        res.json({ success: true, message: 'Poll status updated successfully' });
    });
});

// Delete poll
app.delete('/api/polls/:id', requireAdmin, (req, res) => {
    const { id } = req.params;

    console.log(`🗑️ DELETE /api/polls/${id} - Delete poll permanently`);
    console.log('⚠️ This will permanently delete the poll and all related data');

    // Start transaction to delete poll and related data
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First delete poll responses
        db.run('DELETE FROM poll_responses WHERE poll_id = ?', [id], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error while deleting poll responses' });
            }

            console.log(`Deleted ${this.changes} poll responses for poll ${id}`);

            // Then delete poll options
            db.run('DELETE FROM poll_options WHERE poll_id = ?', [id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Database error while deleting poll options' });
                }

                console.log(`Deleted ${this.changes} poll options for poll ${id}`);

                // Finally delete the poll itself
                db.run('DELETE FROM polls WHERE id = ?', [id], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Database error while deleting poll' });
                    }

                    if (this.changes === 0) {
                        db.run('ROLLBACK');
                        return res.status(404).json({ error: 'Poll not found' });
                    }

                    // Commit transaction
                    db.run('COMMIT', function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Database error while committing transaction' });
                        }

                        console.log(`Poll ${id} deleted successfully`);
                        res.json({ message: 'Poll deleted successfully' });
                    });
                });
            });
        });
    });
});

app.get('/api/polls/:id/results', requireAdmin, (req, res) => {
    const { id } = req.params;

    // Get detailed results with student names
    db.all(`
        SELECT
            po.option_text,
            s.name as student_name,
            s.student_number,
            pr.created_at as voted_at
        FROM poll_responses pr
        JOIN poll_options po ON pr.option_id = po.id
        JOIN students s ON pr.student_id = s.id
        WHERE pr.poll_id = ?
        ORDER BY po.id, s.name
    `, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(results);
    });
});

// Initialize database for production
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
    initializeDatabase();
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    if (process.env.RAILWAY_ENVIRONMENT) {
        console.log('Running on Railway.app');
    }
});

module.exports = app;

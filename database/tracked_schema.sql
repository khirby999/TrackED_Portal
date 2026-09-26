-- ====================================================================
-- TrackED Academic Portal Database Schema (PostgreSQL / Supabase compatible)
-- Description: Complete schema for teachers, students, courses, attendance,
--              activities, quizzes, and exams.
-- ====================================================================

-- 1. DROP EXISTING TABLES (Clean Slate)
DROP TABLE IF EXISTS exam_scores CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS quiz_scores CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS activity_scores CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP FUNCTION IF EXISTS check_course_code_consistency() CASCADE;

-- ====================================================================
-- 2. TEACHERS TABLE
--    email & phone are NULL (blank) when first created.
--    Teacher fills them in later in Settings.
-- ====================================================================
CREATE TABLE teachers (
    teacher_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    middle_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    name VARCHAR(250) NOT NULL,
    email VARCHAR(150) UNIQUE, -- nullable: blank when created
    password VARCHAR(255) NOT NULL DEFAULT 'teacher123',
    department VARCHAR(150) DEFAULT 'College of Computer Studies',
    role VARCHAR(100) DEFAULT 'Faculty Instructor',
    phone VARCHAR(50) DEFAULT NULL, -- nullable: blank when created
    password_changed BOOLEAN DEFAULT FALSE,
    avatar_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 3. STUDENTS TABLE
--    email & phone are NULL (blank) when first created.
--    Student fills them in later in Settings.
-- ====================================================================
CREATE TABLE students (
    student_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    name VARCHAR(250) NOT NULL,
    email VARCHAR(150) UNIQUE, -- nullable: blank when created
    phone VARCHAR(50) DEFAULT NULL, -- nullable: blank when created
    password VARCHAR(255) NOT NULL DEFAULT '1234',
    program VARCHAR(150) DEFAULT 'BS Computer Science',
    year_level VARCHAR(50) DEFAULT '1st Year',
    password_changed BOOLEAN DEFAULT FALSE,
    avatar_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 4. COURSES TABLE
--    CONSTRAINT: A teacher cannot create duplicate course codes.
--    Multiple teachers can teach the same course (e.g. CS101 - Programming Fundamentals).
-- ====================================================================
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    teacher_id VARCHAR(50) REFERENCES teachers(teacher_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_teacher_course UNIQUE (teacher_id, course_code)
);

-- Consistency Trigger: Locks a course code to a unique subject name across the portal
CREATE OR REPLACE FUNCTION check_course_code_consistency()
RETURNS TRIGGER AS $$
DECLARE
    existing_name VARCHAR(150);
    existing_code VARCHAR(50);
BEGIN
    NEW.course_code := UPPER(TRIM(NEW.course_code));
    NEW.course_name := TRIM(NEW.course_name);

    -- 1. Check if course_code is already bound to a different course_name
    SELECT course_name INTO existing_name
    FROM courses
    WHERE UPPER(course_code) = NEW.course_code
      AND LOWER(TRIM(course_name)) <> LOWER(NEW.course_name)
    LIMIT 1;

    IF existing_name IS NOT NULL THEN
        RAISE EXCEPTION 'Course code "%" is already assigned to "%". A course code can only be used for that specific course.', NEW.course_code, existing_name;
    END IF;

    -- 2. Check if course_name is already bound to a different course_code
    SELECT course_code INTO existing_code
    FROM courses
    WHERE LOWER(TRIM(course_name)) = LOWER(NEW.course_name)
      AND UPPER(TRIM(course_code)) <> NEW.course_code
    LIMIT 1;

    IF existing_code IS NOT NULL THEN
        RAISE EXCEPTION 'Course "%" is already registered under course code "%". Please use the assigned course code.', NEW.course_name, existing_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_code_consistency ON courses;
CREATE TRIGGER trg_course_code_consistency
BEFORE INSERT OR UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION check_course_code_consistency();


-- ====================================================================
-- 5. COURSE ENROLLMENTS TABLE (Students enrolled in Courses)
-- ====================================================================
CREATE TABLE course_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_course_student UNIQUE (course_id, student_id)
);

-- ====================================================================
-- 6. ACTIVITIES TABLE
-- ====================================================================
CREATE TABLE activities (
    activity_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    activity_number INT NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    max_score INT NOT NULL DEFAULT 50,
    activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_course_activity UNIQUE (course_id, activity_number)
);

-- ====================================================================
-- 7. ACTIVITY SCORES TABLE
-- ====================================================================
CREATE TABLE activity_scores (
    score_id SERIAL PRIMARY KEY,
    activity_id INT NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_activity_student UNIQUE (activity_id, student_id)
);

-- ====================================================================
-- 8. QUIZZES TABLE
-- ====================================================================
CREATE TABLE quizzes (
    quiz_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    quiz_number INT NOT NULL,
    quiz_name VARCHAR(100) NOT NULL,
    max_score INT NOT NULL DEFAULT 20,
    quiz_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_course_quiz UNIQUE (course_id, quiz_number)
);

-- ====================================================================
-- 9. QUIZ SCORES TABLE
-- ====================================================================
CREATE TABLE quiz_scores (
    score_id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_quiz_student UNIQUE (quiz_id, student_id)
);

-- ====================================================================
-- 10. EXAMS TABLE
-- ====================================================================
CREATE TABLE exams (
    exam_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    exam_number INT NOT NULL,
    exam_name VARCHAR(100) NOT NULL,
    max_score INT NOT NULL DEFAULT 100,
    exam_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_course_exam UNIQUE (course_id, exam_number)
);

-- ====================================================================
-- 11. EXAM SCORES TABLE
-- ====================================================================
CREATE TABLE exam_scores (
    score_id SERIAL PRIMARY KEY,
    exam_id INT NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);

-- ====================================================================
-- 12. ATTENDANCE TABLE
-- ====================================================================
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'late', 'absent')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_course_student_date UNIQUE (course_id, student_id, attendance_date)
);

-- ====================================================================
-- 13. SEED INITIAL TEACHER ACCOUNT (1 Teacher Only, Zero Students)
--     Email and phone are NULL (blank) - teacher sets them in Settings.
-- ====================================================================
INSERT INTO teachers (
    teacher_id, 
    first_name, 
    middle_name, 
    last_name, 
    name, 
    email, 
    password, 
    department, 
    role, 
    phone, 
    password_changed
)
VALUES (
    'T-2024-0042', 
    'Billie', 
    'O''Connell', 
    'Eilish', 
    'Eilish, Billie O.', 
    NULL, -- Blank email on creation
    'teacher123', 
    'College of Computer Studies', 
    'Faculty Instructor', 
    NULL, -- Blank phone on creation
    FALSE
);

-- ====================================================================
-- 14. PERMISSIONS & ROW LEVEL SECURITY (RLS)
-- ====================================================================
-- Ensure anon public API key has full read/write access for portal operations
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

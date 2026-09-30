/**
 * ====================================================================
 * TrackED Academic Portal - Supabase Cloud Database Client & Backend Adapter
 * ====================================================================
 * 
 * QUICK SETUP GUIDE:
 * 1. Open https://supabase.com and create a free account (Sign up with GitHub or Email).
 * 2. Create a new project (e.g. Name: "TrackED", Database Password of your choice, Region: closest to you).
 * 3. Once created, click "SQL Editor" on the left sidebar.
 * 4. Open "database/tracked_schema.sql" from your TrackED folder, paste the entire SQL text into the editor, and click "Run".
 *    (This creates all 11 relational tables, keys, foreign relationships, and seed data in 2 seconds!)
 * 5. Go to "Project Settings" (gear icon) -> "API".
 * 6. Copy your "Project URL" and "anon public" Key, and paste them below:
 */

const SUPABASE_CONFIG = {
    url: "https://hfosagyduftkwekkjqdz.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmb3NhZ3lkdWZ0a3dla2tqcWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjcyMDYsImV4cCI6MjEwNTk0MzIwNn0.Z80aHjrzL026HAU__ZPuW62y_gH2PjgFFugE1_yl2sE"
};

// Global DB instance
(function () {
    let _supabase = null;

    function getClient() {
        if (_supabase) return _supabase;
        if (typeof window.supabase !== "undefined" && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            try {
                // Ensure clean URL without /rest/v1 trailing path
                const cleanUrl = SUPABASE_CONFIG.url.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
                const cleanKey = SUPABASE_CONFIG.anonKey.trim();
                _supabase = window.supabase.createClient(cleanUrl, cleanKey);
                console.log("%c[TrackED Backend] 🌐 Connected to Supabase Cloud Database", "color: #10b981; font-weight: bold; font-size: 13px;");
                return _supabase;
            } catch (err) {
                console.warn("[TrackED Backend] Supabase init failed, running in Offline Mode:", err);
            }
        }
        return null;
    }

    // Fresh wipe to remove all mock students and mock courses requested by user
    if (localStorage.getItem("tracked_clean_slate_v3") !== "true") {
        localStorage.setItem("tracked_database_students", JSON.stringify([]));
        localStorage.setItem("tracked_teacher_courses", JSON.stringify([]));
        localStorage.removeItem("tracked_selected_course");
        localStorage.removeItem("tracked_selected_course_code");
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith("tracked_enrolled_") || 
                k.startsWith("tracked_course_") || 
                k.startsWith("tracked_activity_") || 
                k.startsWith("tracked_quiz_") || 
                k.startsWith("tracked_exam_") || 
                k.startsWith("tracked_student_pwd_") ||
                k.startsWith("tracked_student_avatar_") ||
                k === "tracked_deleted_courses" ||
                k.startsWith("tracked_attendance_")) {
                localStorage.removeItem(k);
            }
        });
        localStorage.setItem("tracked_clean_slate_v3", "true");
    }

    // Default Seed Data (Only registered students in database can log in)
    const DEFAULT_STUDENTS = [];

    const DEFAULT_TEACHER = {
        id: "T-2024-0042",
        first_name: "Billie",
        middle_name: "O'Connell",
        last_name: "Eilish",
        name: "Eilish, Billie O.",
        email: "",
        department: "College of Computer Studies",
        role: "Faculty Instructor",
        phone: "",
        password: "teacher123"
    };

    window.TrackED_DB = {
        /**
         * Checks if cloud database is configured and reachable
         */
        isCloudConnected: function () {
            return getClient() !== null;
        },

        /**
         * Unified Login for Faculty and Students
         * @param {string} userId (Student ID, Faculty ID, or Email)
         * @param {string} password
         * @returns {Promise<{success: boolean, role?: string, user?: object, message?: string}>}
         */
        login: async function (userId, password) {
            const inputId = (userId || "").trim();
            const inputPwd = (password || "").trim();

            if (!inputId || !inputPwd) {
                return { success: false, message: "Please enter your ID and password." };
            }

            const client = getClient();

            // 1. Try Cloud Database if configured
            if (client) {
                try {
                    // Check teacher table
                    const { data: teacher, error: teacherErr } = await client
                        .from("teachers")
                        .select("*")
                        .or(`teacher_id.ilike.${inputId},email.ilike.${inputId}`)
                        .eq("password", inputPwd)
                        .maybeSingle();

                    if (teacher && !teacherErr) {
                        this._setTeacherSession(teacher);
                        return { success: true, role: "teacher", user: teacher };
                    }

                    // Check student table
                    const { data: student, error: studentErr } = await client
                        .from("students")
                        .select("*")
                        .or(`student_id.ilike.${inputId},email.ilike.${inputId}`)
                        .eq("password", inputPwd)
                        .maybeSingle();

                    if (student && !studentErr) {
                        this._setStudentSession(student);
                        return { success: true, role: "student", user: student };
                    }
                } catch (err) {
                    console.warn("[TrackED Backend] Cloud query failed, falling back to local verification:", err);
                }
            }

            // 2. Offline / Local Fallback Mode
            const savedTeacherPwd = localStorage.getItem("tracked_teacher_password") || DEFAULT_TEACHER.password;
            const savedTeacherEmail = localStorage.getItem("tracked_teacher_recovery_email") || DEFAULT_TEACHER.email || "";
            const isTeacherMatch = (
                inputId.toLowerCase() === DEFAULT_TEACHER.id.toLowerCase() || 
                (savedTeacherEmail && inputId.toLowerCase() === savedTeacherEmail.toLowerCase())
            ) && inputPwd === savedTeacherPwd;

            if (isTeacherMatch) {
                const teacherObj = {
                    ...DEFAULT_TEACHER,
                    email: savedTeacherEmail,
                    phone: localStorage.getItem("tracked_teacher_phone") || DEFAULT_TEACHER.phone || "",
                    password: savedTeacherPwd,
                    password_changed: localStorage.getItem("tracked_teacher_password_changed") === "true"
                };
                this._setTeacherSession(teacherObj);
                return { success: true, role: "teacher", user: teacherObj };
            }

            // Check students database in localStorage:
            // Custom added/edited students in tracked_database_students MUST TAKE PRIORITY!
            let studentsList = [];
            try {
                const storedCustom = JSON.parse(localStorage.getItem("tracked_database_students") || "[]");
                if (Array.isArray(storedCustom) && storedCustom.length > 0) {
                    studentsList = [...storedCustom];
                }
            } catch (e) {}

            // Append any missing defaults (like demo student 2024-00123)
            DEFAULT_STUDENTS.forEach(ds => {
                if (!studentsList.some(s => s.id.toLowerCase() === ds.id.toLowerCase())) {
                    studentsList.push(ds);
                }
            });

            const matchedStudent = studentsList.find(s => 
                (s.id.toLowerCase() === inputId.toLowerCase() || (s.email && s.email.toLowerCase() === inputId.toLowerCase()))
            );

            if (matchedStudent) {
                // Check student-specific password (defaults to 1234)
                const sidKey = matchedStudent.id.trim().toLowerCase();
                const studentSpecificPwd = localStorage.getItem(`tracked_student_pwd_${sidKey}`) || 
                                           (matchedStudent.id === "2024-00123" ? localStorage.getItem("tracked_student_password") : null) || 
                                           matchedStudent.password || 
                                           "1234";

                if (inputPwd === studentSpecificPwd) {
                    const isChanged = localStorage.getItem(`tracked_student_pwd_changed_${sidKey}`) === "true" ||
                                      (matchedStudent.id === "2024-00123" && localStorage.getItem("tracked_student_password_changed") === "true");

                    const studentObj = {
                        student_id: matchedStudent.id,
                        name: matchedStudent.name,
                        email: matchedStudent.email || "",
                        phone: matchedStudent.phone || "",
                        program: matchedStudent.program || "BS Computer Science",
                        year_level: matchedStudent.yearLevel || matchedStudent.year_level || "1st Year",
                        password: studentSpecificPwd,
                        password_changed: isChanged
                    };
                    this._setStudentSession(studentObj);
                    return { success: true, role: "student", user: studentObj };
                }
            }

            return {
                success: false,
                message: "Invalid Student/Faculty ID or password. Please verify your credentials."
            };
        },

        /**
         * Find a user (student or teacher) for account recovery by ID or Email
         * @param {string} mode - "id" or "email"
         * @param {string} value - the entered ID or Email
         */
        findUserForRecovery: async function (mode, value) {
            const client = getClient();
            const cleanVal = (value || "").trim();
            if (!cleanVal) return { success: false, message: "Please enter an ID or Email." };

            // 1. Check Supabase Cloud if available
            if (client) {
                try {
                    if (mode === "id") {
                        // Check teacher by teacher_id
                        const { data: teacher } = await client
                            .from("teachers")
                            .select("teacher_id, name, department, role, email")
                            .ilike("teacher_id", cleanVal)
                            .limit(1);

                        if (teacher && teacher.length > 0) {
                            const t = teacher[0];
                            return {
                                success: true,
                                role: "teacher",
                                user: {
                                    id: t.teacher_id,
                                    name: t.name,
                                    program: t.department || "Faculty Instructor",
                                    email: t.email || ""
                                }
                            };
                        }

                        // Check student by student_id
                        const { data: student } = await client
                            .from("students")
                            .select("student_id, name, first_name, middle_name, last_name, program, year_level, email")
                            .ilike("student_id", cleanVal)
                            .limit(1);

                        if (student && student.length > 0) {
                            const s = student[0];
                            let displayName = s.name;
                            if (!displayName && (s.first_name || s.last_name)) {
                                const mi = s.middle_name ? s.middle_name.charAt(0).toUpperCase() + "." : "";
                                displayName = mi ? `${s.last_name}, ${s.first_name} ${mi}` : `${s.last_name}, ${s.first_name}`;
                            }
                            return {
                                success: true,
                                role: "student",
                                user: {
                                    id: s.student_id,
                                    name: displayName || "Student",
                                    program: `${s.program || "BS Computer Science"}${s.year_level ? " • " + s.year_level : ""}`,
                                    email: s.email || ""
                                }
                            };
                        }
                    } else {
                        // Search by Email
                        // Check teacher by email
                        const { data: teacher } = await client
                            .from("teachers")
                            .select("teacher_id, name, department, role, email")
                            .ilike("email", cleanVal)
                            .limit(1);

                        if (teacher && teacher.length > 0) {
                            const t = teacher[0];
                            return {
                                success: true,
                                role: "teacher",
                                user: {
                                    id: t.teacher_id,
                                    name: t.name,
                                    program: t.department || "Faculty Instructor",
                                    email: t.email || ""
                                }
                            };
                        }

                        // Check student by email
                        const { data: student } = await client
                            .from("students")
                            .select("student_id, name, first_name, middle_name, last_name, program, year_level, email")
                            .ilike("email", cleanVal)
                            .limit(1);

                        if (student && student.length > 0) {
                            const s = student[0];
                            let displayName = s.name;
                            if (!displayName && (s.first_name || s.last_name)) {
                                const mi = s.middle_name ? s.middle_name.charAt(0).toUpperCase() + "." : "";
                                displayName = mi ? `${s.last_name}, ${s.first_name} ${mi}` : `${s.last_name}, ${s.first_name}`;
                            }
                            return {
                                success: true,
                                role: "student",
                                user: {
                                    id: s.student_id,
                                    name: displayName || "Student",
                                    program: `${s.program || "BS Computer Science"}${s.year_level ? " • " + s.year_level : ""}`,
                                    email: s.email || ""
                                }
                            };
                        }
                    }
                } catch (err) {
                    console.warn("[TrackED Backend] Cloud recovery lookup failed, checking local cache:", err);
                }
            }

            // 2. Offline / Local fallback check
            const teacherId = localStorage.getItem("tracked_teacher_id") || "T-2024-0042";
            const teacherEmail = localStorage.getItem("tracked_teacher_recovery_email") || "";
            const teacherName = localStorage.getItem("tracked_teacher_name") || "Eilish, Billie O.";

            if (mode === "id" && cleanVal.toLowerCase() === teacherId.toLowerCase()) {
                return {
                    success: true,
                    role: "teacher",
                    user: {
                        id: teacherId,
                        name: teacherName,
                        program: "College of Computer Studies • Faculty",
                        email: teacherEmail
                    }
                };
            }
            if (mode === "email" && teacherEmail && cleanVal.toLowerCase() === teacherEmail.toLowerCase()) {
                return {
                    success: true,
                    role: "teacher",
                    user: {
                        id: teacherId,
                        name: teacherName,
                        program: "College of Computer Studies • Faculty",
                        email: teacherEmail
                    }
                };
            }

            // Check local students cache
            let localStudents = [];
            try {
                localStudents = JSON.parse(localStorage.getItem("tracked_database_students") || "[]");
            } catch (e) {}

            const foundStudent = localStudents.find(s => {
                if (mode === "id") {
                    return s.id && s.id.trim().toLowerCase() === cleanVal.toLowerCase();
                } else {
                    return s.email && s.email.trim().toLowerCase() === cleanVal.toLowerCase();
                }
            });

            if (foundStudent) {
                return {
                    success: true,
                    role: "student",
                    user: {
                        id: foundStudent.id,
                        name: foundStudent.name,
                        program: `${foundStudent.program || "BS Computer Science"}${foundStudent.yearLevel ? " • " + foundStudent.yearLevel : ""}`,
                        email: foundStudent.email || ""
                    }
                };
            }

            return {
                success: false,
                message: mode === "id" 
                    ? `No account found with ID "${cleanVal}". Please check your Student or Faculty ID.`
                    : `No account found registered with email "${cleanVal}".`
            };
        },

        /**
         * Update password in Cloud & LocalStorage
         */
        updatePassword: async function (role, id, newPassword) {
            const client = getClient();
            if (role === "teacher") {
                localStorage.setItem("tracked_teacher_password", newPassword);
                localStorage.setItem("tracked_teacher_password_changed", "true");
                if (client) {
                    try {
                        await client.from("teachers").update({ password: newPassword, password_changed: true }).eq("teacher_id", id);
                    } catch (e) {
                        console.warn("[TrackED Backend] Could not sync password to cloud:", e);
                    }
                }
            } else {
                const sidKey = id.trim().toLowerCase();
                localStorage.setItem(`tracked_student_pwd_${sidKey}`, newPassword);
                localStorage.setItem(`tracked_student_pwd_changed_${sidKey}`, "true");
                localStorage.setItem("tracked_student_password", newPassword);
                localStorage.setItem("tracked_student_password_changed", "true");
                if (client) {
                    try {
                        await client.from("students").update({ password: newPassword, password_changed: true }).eq("student_id", id);
                    } catch (e) {
                        console.warn("[TrackED Backend] Could not sync password to cloud:", e);
                    }
                }
            }
            return { success: true };
        },

        /**
         * Update avatar photo in Cloud & LocalStorage
         */
        updateAvatar: async function (role, id, dataUrl) {
            const client = getClient();
            const sidKey = (id || "").trim().toLowerCase();
            if (role === "student") {
                if (dataUrl) {
                    localStorage.setItem(`tracked_student_avatar_${sidKey}`, dataUrl);
                    localStorage.setItem("tracked_student_avatar_data", dataUrl);
                } else {
                    localStorage.removeItem(`tracked_student_avatar_${sidKey}`);
                    localStorage.removeItem("tracked_student_avatar_data");
                }
                if (client) {
                    try {
                        await client.from("students").update({ avatar_data: dataUrl }).eq("student_id", id);
                        console.log(`[TrackED Backend] Student ${id} avatar synced to Supabase Cloud! 📸`);
                    } catch (e) {
                        console.warn("[TrackED Backend] Could not sync student avatar to cloud:", e);
                    }
                }
            } else {
                const tidKey = (id || "default").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
                if (dataUrl) {
                    localStorage.setItem(`tracked_teacher_avatar_${tidKey}`, dataUrl);
                    localStorage.setItem("tracked_teacher_avatar_data", dataUrl);
                } else {
                    localStorage.removeItem(`tracked_teacher_avatar_${tidKey}`);
                    localStorage.removeItem("tracked_teacher_avatar_data");
                }
                if (client) {
                    try {
                        await client.from("teachers").update({ avatar_data: dataUrl }).eq("teacher_id", id);
                        console.log(`[TrackED Backend] Teacher ${id} avatar synced to Supabase Cloud! ☁️`);
                    } catch (e) {
                        console.warn("[TrackED Backend] Could not sync teacher avatar to cloud:", e);
                    }
                }
            }
            return { success: true };
        },

        /**
         * Update user profile (email, phone, etc.) in Cloud and LocalStorage
         */
        updateProfile: async function (role, id, details) {
            const client = getClient();
            if (role === "teacher") {
                if (details.email !== undefined) {
                    if (details.email) localStorage.setItem("tracked_teacher_recovery_email", details.email);
                    else localStorage.removeItem("tracked_teacher_recovery_email");
                }
                if (details.phone !== undefined) {
                    if (details.phone) localStorage.setItem("tracked_teacher_phone", details.phone);
                    else localStorage.removeItem("tracked_teacher_phone");
                }
                if (client) {
                    try {
                        const payload = {};
                        if (details.email !== undefined) payload.email = details.email.trim() ? details.email.trim() : null;
                        if (details.phone !== undefined) payload.phone = details.phone.trim() ? details.phone.trim() : null;
                        if (Object.keys(payload).length > 0) {
                            const { error } = await client.from("teachers").update(payload).eq("teacher_id", id);
                            if (error) throw error;
                            console.log(`[TrackED Backend] Teacher profile synced to Supabase Cloud! 👤`);
                        }
                    } catch (e) {
                        console.warn("[TrackED Backend] Could not sync teacher profile to cloud:", e);
                        return { success: false, error: e };
                    }
                }
            } else {
                const sidKey = (id || "").trim().toLowerCase();
                if (details.email !== undefined) {
                    if (details.email) {
                        localStorage.setItem("tracked_student_recovery_email", details.email);
                        localStorage.setItem(`tracked_student_email_${sidKey}`, details.email);
                    } else {
                        localStorage.removeItem("tracked_student_recovery_email");
                        localStorage.removeItem(`tracked_student_email_${sidKey}`);
                    }
                }
                if (details.phone !== undefined) {
                    if (details.phone) {
                        localStorage.setItem("tracked_student_phone", details.phone);
                        localStorage.setItem(`tracked_student_phone_${sidKey}`, details.phone);
                    } else {
                        localStorage.removeItem("tracked_student_phone");
                        localStorage.removeItem(`tracked_student_phone_${sidKey}`);
                    }
                }
                // Update local cached student record in tracked_database_students
                try {
                    const stored = JSON.parse(localStorage.getItem("tracked_database_students") || "[]");
                    const idx = stored.findIndex(s => s.id && s.id.trim().toLowerCase() === sidKey);
                    if (idx !== -1) {
                        if (details.email !== undefined) stored[idx].email = details.email;
                        if (details.phone !== undefined) stored[idx].phone = details.phone;
                        localStorage.setItem("tracked_database_students", JSON.stringify(stored));
                    }
                } catch (e) {}

                if (client) {
                    try {
                        const payload = {};
                        if (details.email !== undefined) payload.email = details.email.trim() ? details.email.trim() : null;
                        if (details.phone !== undefined) payload.phone = details.phone.trim() ? details.phone.trim() : null;
                        if (Object.keys(payload).length > 0) {
                            const { error } = await client.from("students").update(payload).eq("student_id", id);
                            if (error) throw error;
                            console.log(`[TrackED Backend] Student profile synced to Supabase Cloud! 👤`);
                        }
                    } catch (e) {
                        console.warn("[TrackED Backend] Could not sync student profile to cloud:", e);
                        return { success: false, error: e };
                    }
                }
            }
            return { success: true };
        },

        /**
         * Validates course code and course name uniqueness and consistency
         * @param {string} code - e.g. "CS101"
         * @param {string} name - e.g. "Programming Fundamentals"
         * @param {string} [excludeOldName] - used during edit to ignore current course
         * @returns {Promise<{valid: boolean, message?: string}>}
         */
        validateCourse: async function (code, name, excludeOldName) {
            const cCode = (code || "").trim().toUpperCase();
            const cName = (name || "").trim();
            const excludeName = (excludeOldName || "").trim().toLowerCase();

            if (!cCode || !cName) {
                return { valid: false, message: "Course code and course name are required." };
            }

            const teacherId = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").trim();

            // 1. Fetch courses across the portal
            let allCourses = [];
            const client = getClient();
            if (client) {
                try {
                    const { data, error } = await client.from("courses").select("course_code, course_name, teacher_id");
                    if (!error && Array.isArray(data)) {
                        allCourses = data;
                    }
                } catch (e) {
                    console.warn("[TrackED Backend] Could not query courses from Supabase for validation:", e);
                }
            }

            // Merge local teacher courses if cloud returned empty or offline
            const localTeacherCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
            localTeacherCourses.forEach(tc => {
                if (!allCourses.some(c => c.course_code.toUpperCase() === (tc.code || "").toUpperCase() && c.course_name.toLowerCase() === (tc.name || "").toLowerCase() && (c.teacher_id || "").toLowerCase() === teacherId.toLowerCase())) {
                    allCourses.push({
                        course_code: tc.code,
                        course_name: tc.name,
                        teacher_id: teacherId
                    });
                }
            });

            // 2. Check: Duplicate for this specific teacher
            for (const c of allCourses) {
                const sameTeacher = (c.teacher_id || "").toLowerCase() === teacherId.toLowerCase();
                const isCurrentEditing = excludeName && c.course_name.toLowerCase() === excludeName;

                if (sameTeacher && !isCurrentEditing) {
                    if (c.course_code.toUpperCase() === cCode) {
                        return { 
                            valid: false, 
                            message: `You already have a course with code "${cCode}" (${c.course_name}). Each of your courses must have a unique code.` 
                        };
                    }
                    if (c.course_name.toLowerCase() === cName.toLowerCase()) {
                        return { 
                            valid: false, 
                            message: `You are already teaching "${c.course_name}"!` 
                        };
                    }
                }
            }

            // 3. Check: Global code-to-subject consistency
            // If cCode is already in use anywhere in the portal, it MUST belong to the SAME subject name
            for (const c of allCourses) {
                const isCurrentEditing = excludeName && c.course_name.toLowerCase() === excludeName;
                if (isCurrentEditing) continue;

                if (c.course_code.toUpperCase() === cCode && c.course_name.toLowerCase() !== cName.toLowerCase()) {
                    return {
                        valid: false,
                        message: `Course code "${cCode}" is already assigned to "${c.course_name}". A course code can only be used for that specific course.`
                    };
                }
            }

            // 4. Check: Global subject-to-code consistency
            // If cName is already in use anywhere in the portal, it MUST use the SAME course code
            for (const c of allCourses) {
                const isCurrentEditing = excludeName && c.course_name.toLowerCase() === excludeName;
                if (isCurrentEditing) continue;

                if (c.course_name.toLowerCase() === cName.toLowerCase() && c.course_code.toUpperCase() !== cCode) {
                    return {
                        valid: false,
                        message: `The course "${c.course_name}" is already registered under course code "${c.course_code}". Please use "${c.course_code}" for this course.`
                    };
                }
            }

            return { valid: true };
        },

        /**
         * Helper: Find course_id for course_name owned by current teacher
         */
        _getCourseId: async function (courseName) {
            const client = getClient();
            if (!client || !courseName) return null;
            const teacherId = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").trim();
            const cleanName = courseName.trim();

            try {
                // 1. Try matching current teacher's course
                const { data: teacherCourse, error: tErr } = await client
                    .from("courses")
                    .select("course_id")
                    .ilike("course_name", cleanName)
                    .eq("teacher_id", teacherId)
                    .limit(1);

                if (!tErr && teacherCourse && teacherCourse.length > 0) {
                    return teacherCourse[0].course_id;
                }

                // 2. Fallback: match any course with this name across all teachers
                const { data: anyCourse, error: aErr } = await client
                    .from("courses")
                    .select("course_id")
                    .ilike("course_name", cleanName)
                    .limit(1);

                if (!aErr && anyCourse && anyCourse.length > 0) {
                    return anyCourse[0].course_id;
                }
            } catch (e) {
                console.warn("[TrackED Backend] Error resolving course_id for:", courseName, e);
            }

            return null;
        },

        /**
         * Cloud-aware Attendance Syncing
         */
        saveAttendanceToCloud: async function (courseName, dateString, attendanceMap) {
            const client = getClient();
            if (!client) return false;

            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;

                const rows = Object.keys(attendanceMap).map(studentId => ({
                    course_id: courseId,
                    student_id: studentId,
                    attendance_date: dateString,
                    status: (attendanceMap[studentId] || "present").toLowerCase()
                }));

                const { error } = await client
                    .from("attendance")
                    .upsert(rows, { onConflict: "course_id,student_id,attendance_date" });

                if (error) throw error;
                console.log("[TrackED Backend] Attendance successfully synced to Supabase Cloud! ☁️");
                return true;
            } catch (err) {
                console.warn("[TrackED Backend] Cloud attendance sync failed:", err);
                return false;
            }
        },

        /**
         * Delete student from Cloud Database and cascaded records
         */
        deleteStudent: async function (studentId) {
            const client = getClient();
            if (!client) return false;
            try {
                const { error } = await client.from("students").delete().eq("student_id", studentId);
                if (error) throw error;
                console.log(`[TrackED Backend] Student ${studentId} deleted from Supabase Cloud! 🗑️`);
                return true;
            } catch (err) {
                console.warn("[TrackED Backend] Cloud student delete failed:", err);
                return false;
            }
        },

        /**
         * Add or update student in Cloud Database
         */
        addStudent: async function (student) {
            const client = getClient();
            if (!client) return false;
            try {
                const sid = (student.id || student.student_id || "").trim();
                const firstName = (student.firstName || student.first_name || "").trim();
                const middleName = (student.middleName || student.middle_name || "").trim();
                const lastName = (student.lastName || student.last_name || "").trim();
                
                let displayName = student.name ? student.name.trim() : "";
                if (!displayName && (firstName || lastName)) {
                    const mi = middleName ? middleName.charAt(0).toUpperCase() + "." : "";
                    displayName = mi ? `${lastName}, ${firstName} ${mi}` : `${lastName}, ${firstName}`;
                }

                const emailVal = (student.email && student.email.trim()) ? student.email.trim() : null;
                const phoneVal = (student.phone && student.phone.trim()) ? student.phone.trim() : null;

                const { error } = await client.from("students").upsert([{
                    student_id: sid,
                    first_name: firstName,
                    middle_name: middleName,
                    last_name: lastName,
                    name: displayName,
                    email: emailVal,
                    phone: phoneVal,
                    program: student.program || "BS Computer Science",
                    year_level: student.yearLevel || student.year_level || "1st Year",
                    password: student.password || "1234",
                    password_changed: student.password_changed || false,
                    avatar_data: student.avatar_data || null
                }], { onConflict: "student_id" });

                if (error) throw error;
                console.log(`[TrackED Backend] Student ${sid} (${displayName}) synced to Supabase Cloud! ✨`);
                return true;
            } catch (err) {
                console.warn("[TrackED Backend] Cloud student upsert:", err);
                return false;
            }
        },

        /**
         * Course Methods
         */
        addCourse: async function (courseCode, courseName) {
            const client = getClient();
            if (!client) return { success: true };
            try {
                const teacherId = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").trim();
                const { error } = await client.from("courses").upsert([{
                    course_code: courseCode.trim().toUpperCase(),
                    course_name: courseName.trim(),
                    teacher_id: teacherId
                }], { onConflict: "teacher_id,course_code" });
                if (error) throw error;
                console.log(`[TrackED Backend] Course "${courseName}" synced to Supabase Cloud! 📚`);
                return { success: true };
            } catch (e) {
                console.warn("[TrackED Backend] Cloud course add failed:", e);
                return { success: false, error: e };
            }
        },

        editCourse: async function (oldName, newCode, newName) {
            const client = getClient();
            if (!client) return { success: true };
            try {
                const teacherId = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").trim();
                const { error } = await client.from("courses").update({
                    course_code: newCode.trim().toUpperCase(),
                    course_name: newName.trim()
                }).match({
                    course_name: oldName.trim(),
                    teacher_id: teacherId
                });
                if (error) throw error;
                console.log(`[TrackED Backend] Course updated in Supabase Cloud: "${oldName}" -> "${newName}" ✏️`);
                return { success: true };
            } catch (e) {
                console.warn("[TrackED Backend] Cloud course edit failed:", e);
                return { success: false, error: e };
            }
        },

        deleteCourse: async function (courseName) {
            const client = getClient();
            if (!client) return false;
            try {
                const teacherId = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").trim();
                const { error } = await client.from("courses").delete().match({
                    course_name: courseName.trim(),
                    teacher_id: teacherId
                });
                if (error) throw error;
                console.log(`[TrackED Backend] Course "${courseName}" deleted from Supabase Cloud! 🗑️`);
                return true;
            } catch (e) {
                console.warn("[TrackED Backend] Cloud course delete failed:", e);
                return false;
            }
        },

        /**
         * Enrollment Methods
         */
        enrollStudent: async function (courseName, studentId) {
            const client = getClient();
            if (!client || !courseName || !studentId) return false;
            try {
                let courseId = await this._getCourseId(courseName);
                if (!courseId) {
                    // Auto-register course in Cloud if missing
                    console.log(`[TrackED Backend] Course "${courseName}" missing from cloud, auto-registering...`);
                    let courseCode = "CS101";
                    try {
                        const stored = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
                        const match = stored.find(c => c.name && c.name.trim().toLowerCase() === courseName.trim().toLowerCase());
                        if (match && match.code) courseCode = match.code;
                    } catch (e) {}

                    await this.addCourse(courseCode, courseName);
                    courseId = await this._getCourseId(courseName);
                }

                if (!courseId) {
                    console.warn(`[TrackED Backend] Could not resolve course ID for "${courseName}". Enrollment skipped.`);
                    return false;
                }

                const { error } = await client.from("course_enrollments").upsert([{
                    course_id: courseId,
                    student_id: studentId.trim()
                }], { onConflict: "course_id,student_id" });
                if (error) throw error;
                console.log(`[TrackED Backend] Student ${studentId} enrolled in ${courseName} in Supabase Cloud! 🎓`);
                return true;
            } catch (e) {
                console.warn("[TrackED Backend] Cloud enroll failed:", e);
                return false;
            }
        },

        unenrollStudent: async function (courseName, studentId) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                const { error } = await client.from("course_enrollments").delete().match({
                    course_id: courseId,
                    student_id: studentId.trim()
                });
                if (error) throw error;
                console.log(`[TrackED Backend] Student ${studentId} unenrolled from ${courseName} in Supabase Cloud!`);
                return true;
            } catch (e) {
                console.warn("[TrackED Backend] Cloud unenroll failed:", e);
                return false;
            }
        },

        /**
         * Fetch enrolled courses directly from Supabase Cloud for a given student ID
         */
        getStudentEnrolledCourses: async function (studentId) {
            const client = getClient();
            if (!client || !studentId) return [];
            try {
                const sid = studentId.trim();

                // 1. Primary query: Query course_enrollments with courses & teachers relations
                const { data, error } = await client
                    .from("course_enrollments")
                    .select(`
                        course_id,
                        courses (
                            course_id,
                            course_code,
                            course_name,
                            teacher_id,
                            teachers (
                                name
                            )
                        )
                    `)
                    .eq("student_id", sid);

                if (!error && Array.isArray(data) && data.length > 0) {
                    const list = [];
                    for (const item of data) {
                        const c = item.courses;
                        if (!c || !c.course_name) continue;
                        const instName = (c.teachers && c.teachers.name) ? c.teachers.name : "Prof. Billie Eilish";
                        list.push({
                            id: c.course_id,
                            code: c.course_code || "CS",
                            name: c.course_name,
                            instructor: instName,
                            icon: "fa-graduation-cap",
                            colorClass: "tab-course"
                        });
                    }
                    if (list.length > 0) return list;
                }

                // 2. Fallback query if nested relation join is not enabled or returns empty
                const { data: rawEnrolls } = await client
                    .from("course_enrollments")
                    .select("course_id")
                    .eq("student_id", sid);

                if (rawEnrolls && rawEnrolls.length > 0) {
                    const courseIds = rawEnrolls.map(r => r.course_id);
                    const { data: rawCourses } = await client
                        .from("courses")
                        .select("course_id, course_code, course_name, teacher_id")
                        .in("course_id", courseIds);

                    if (rawCourses && rawCourses.length > 0) {
                        const teacherIds = [...new Set(rawCourses.map(c => c.teacher_id).filter(Boolean))];
                        let teacherMap = {};
                        if (teacherIds.length > 0) {
                            const { data: teacherList } = await client
                                .from("teachers")
                                .select("teacher_id, name")
                                .in("teacher_id", teacherIds);
                            (teacherList || []).forEach(t => { teacherMap[t.teacher_id] = t.name; });
                        }

                        return rawCourses.map(c => ({
                            id: c.course_id,
                            code: c.course_code || "CS",
                            name: c.course_name,
                            instructor: teacherMap[c.teacher_id] || "Prof. Billie Eilish",
                            icon: "fa-graduation-cap",
                            colorClass: "tab-course"
                        }));
                    }
                }
                return [];
            } catch (err) {
                console.warn("[TrackED Backend] Exception in getStudentEnrolledCourses:", err);
                return [];
            }
        },

        /**
         * Activities & Scores Methods
         */
        addActivity: async function (courseName, act) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                const { error } = await client.from("activities").upsert([{
                    course_id: courseId,
                    activity_number: act.num,
                    activity_name: act.name,
                    max_score: act.maxScore || 50
                }], { onConflict: "course_id,activity_number" });
                if (error) throw error;
                return true;
            } catch (e) {
                console.warn("[TrackED Backend] Cloud addActivity failed:", e);
                return false;
            }
        },

        deleteActivity: async function (courseName, actNumber) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                await client.from("activities").delete().match({ course_id: courseId, activity_number: actNumber });
                return true;
            } catch (e) { return false; }
        },

        saveActivityScores: async function (courseName, scoresMap) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                const { data: acts } = await client.from("activities").select("activity_id, activity_number").eq("course_id", courseId);
                if (!acts || acts.length === 0) return false;
                const actMap = {};
                acts.forEach(a => { actMap[a.activity_number] = a.activity_id; });

                const rows = [];
                Object.keys(scoresMap).forEach(sid => {
                    const stObj = scoresMap[sid] || {};
                    Object.keys(stObj).forEach(actNum => {
                        const actId = actMap[actNum];
                        if (actId) {
                            rows.push({
                                activity_id: actId,
                                student_id: sid.trim(),
                                score: parseFloat(stObj[actNum]) || 0
                            });
                        }
                    });
                });
                if (rows.length > 0) {
                    await client.from("activity_scores").upsert(rows, { onConflict: "activity_id,student_id" });
                }
                return true;
            } catch (e) { return false; }
        },

        /**
         * Quizzes & Scores Methods
         */
        addQuiz: async function (courseName, quiz) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                await client.from("quizzes").upsert([{
                    course_id: courseId,
                    quiz_number: quiz.num,
                    quiz_name: quiz.name,
                    max_score: quiz.maxScore || 20
                }], { onConflict: "course_id,quiz_number" });
                return true;
            } catch (e) { return false; }
        },

        deleteQuiz: async function (courseName, quizNumber) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                await client.from("quizzes").delete().match({ course_id: courseId, quiz_number: quizNumber });
                return true;
            } catch (e) { return false; }
        },

        saveQuizScores: async function (courseName, scoresMap) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                const { data: quizzes } = await client.from("quizzes").select("quiz_id, quiz_number").eq("course_id", courseId);
                if (!quizzes || quizzes.length === 0) return false;
                const quizMap = {};
                quizzes.forEach(q => { quizMap[q.quiz_number] = q.quiz_id; });

                const rows = [];
                Object.keys(scoresMap).forEach(sid => {
                    const stObj = scoresMap[sid] || {};
                    Object.keys(stObj).forEach(qNum => {
                        const qId = quizMap[qNum];
                        if (qId) {
                            rows.push({
                                quiz_id: qId,
                                student_id: sid.trim(),
                                score: parseFloat(stObj[qNum]) || 0
                            });
                        }
                    });
                });
                if (rows.length > 0) {
                    await client.from("quiz_scores").upsert(rows, { onConflict: "quiz_id,student_id" });
                }
                return true;
            } catch (e) { return false; }
        },

        /**
         * Exams & Scores Methods
         */
        addExam: async function (courseName, exam) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                await client.from("exams").upsert([{
                    course_id: courseId,
                    exam_number: exam.num,
                    exam_name: exam.name,
                    max_score: exam.maxScore || 100
                }], { onConflict: "course_id,exam_number" });
                return true;
            } catch (e) { return false; }
        },

        deleteExam: async function (courseName, examNumber) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                await client.from("exams").delete().match({ course_id: courseId, exam_number: examNumber });
                return true;
            } catch (e) { return false; }
        },

        saveExamScores: async function (courseName, scoresMap) {
            const client = getClient();
            if (!client) return false;
            try {
                const courseId = await this._getCourseId(courseName);
                if (!courseId) return false;
                const { data: exams } = await client.from("exams").select("exam_id, exam_number").eq("course_id", courseId);
                if (!exams || exams.length === 0) return false;
                const exMap = {};
                exams.forEach(x => { exMap[x.exam_number] = x.exam_id; });

                const rows = [];
                Object.keys(scoresMap).forEach(sid => {
                    const stObj = scoresMap[sid] || {};
                    Object.keys(stObj).forEach(xNum => {
                        const xId = exMap[xNum];
                        if (xId) {
                            rows.push({
                                exam_id: xId,
                                student_id: sid.trim(),
                                score: parseFloat(stObj[xNum]) || 0
                            });
                        }
                    });
                });
                if (rows.length > 0) {
                    await client.from("exam_scores").upsert(rows, { onConflict: "exam_id,student_id" });
                }
                return true;
            } catch (e) { return false; }
        },

        /**
         * Two-Way Cloud Sync: pulls all students and courses from Supabase into LocalStorage cache
         */
        syncAllFromCloud: async function () {
            const client = getClient();
            if (!client) return false;
            try {
                const teacherId = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").trim();
                const userRole = localStorage.getItem("tracked_user_role") || "teacher";

                // 1. Sync students
                const { data: dbStudents } = await client.from("students").select("*");
                if (Array.isArray(dbStudents)) {
                    const mapped = dbStudents.map(s => ({
                        id: s.student_id,
                        firstName: s.first_name || "",
                        middleName: s.middle_name || "",
                        lastName: s.last_name || "",
                        name: s.name,
                        email: s.email || "",
                        phone: s.phone || "",
                        program: s.program || "BS Computer Science",
                        yearLevel: s.year_level || "1st Year",
                        password: s.password || "1234",
                        password_changed: s.password_changed || false,
                        avatar_data: s.avatar_data || null,
                        createdAt: s.created_at
                    }));
                    localStorage.setItem("tracked_database_students", JSON.stringify(mapped));
                }

                // 2. Sync courses
                let courseQuery = client.from("courses").select("*");
                if (userRole === "teacher") {
                    courseQuery = courseQuery.eq("teacher_id", teacherId);
                }
                const { data: dbCourses } = await courseQuery;
                if (Array.isArray(dbCourses)) {
                    // For teachers: auto-push any locally created courses missing in Supabase Cloud
                    if (userRole === "teacher") {
                        let localCourses = [];
                        try {
                            localCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
                        } catch (e) {}
                        for (const lc of localCourses) {
                            if (!lc.name) continue;
                            const exists = dbCourses.some(c => c.course_name.trim().toLowerCase() === lc.name.trim().toLowerCase());
                            if (!exists) {
                                console.log(`[TrackED Backend] Auto-syncing missing local course to cloud: ${lc.name}`);
                                await this.addCourse(lc.code || "CS101", lc.name);
                            }
                        }
                    }

                    const mappedCourses = dbCourses.map(c => ({
                        code: c.course_code,
                        name: c.course_name
                    }));
                    // Cache courses for BOTH teacher and student so UI can resolve course details
                    localStorage.setItem("tracked_teacher_courses", JSON.stringify(mappedCourses));

                    // 3. For each course, sync enrollments, activities, quizzes, exams, attendance
                    for (const c of dbCourses) {
                        const cName = c.course_name;

                        // For teachers: auto-push any local enrollments missing in Cloud
                        if (userRole === "teacher") {
                            let localEnrolled = [];
                            try {
                                localEnrolled = JSON.parse(localStorage.getItem(`tracked_enrolled_${cName}`) || "[]");
                            } catch (e) {}
                            if (localEnrolled.length > 0) {
                                const { data: cloudEnrolls } = await client.from("course_enrollments").select("student_id").eq("course_id", c.course_id);
                                const cloudSids = new Set((cloudEnrolls || []).map(e => (e.student_id || "").toLowerCase()));
                                const missingInCloud = localEnrolled.filter(s => s.id && !cloudSids.has(s.id.trim().toLowerCase()));
                                if (missingInCloud.length > 0) {
                                    const toUpsert = missingInCloud.map(s => ({
                                        course_id: c.course_id,
                                        student_id: s.id.trim()
                                    }));
                                    await client.from("course_enrollments").upsert(toUpsert, { onConflict: "course_id,student_id" });
                                    console.log(`[TrackED Backend] Auto-synced ${toUpsert.length} local enrollments for "${cName}" to Cloud! 🎓`);
                                }
                            }
                        }

                        // Enrollments
                        const { data: enrolls } = await client.from("course_enrollments").select("student_id").eq("course_id", c.course_id);
                        if (enrolls) {
                            const enrolledStudents = enrolls.map(e => {
                                const stMatch = (dbStudents || []).find(s => s.student_id === e.student_id);
                                return {
                                    id: e.student_id,
                                    name: stMatch ? stMatch.name : e.student_id,
                                    firstName: stMatch ? stMatch.first_name : "",
                                    middleName: stMatch ? stMatch.middle_name : "",
                                    lastName: stMatch ? stMatch.last_name : ""
                                };
                            });
                            localStorage.setItem(`tracked_enrolled_${cName}`, JSON.stringify(enrolledStudents));
                        }

                        // Activities
                        const { data: acts } = await client.from("activities").select("*").eq("course_id", c.course_id);
                        if (acts) {
                            const actList = acts.map(a => ({ num: a.activity_number, name: a.activity_name, maxScore: a.max_score }));
                            localStorage.setItem(`tracked_course_activities_${cName}`, JSON.stringify(actList));
                            const actIds = acts.map(a => a.activity_id);
                            if (actIds.length > 0) {
                                const { data: aScores } = await client.from("activity_scores").select("*").in("activity_id", actIds);
                                if (aScores) {
                                    const scoreMap = {};
                                    aScores.forEach(sc => {
                                        const actObj = acts.find(a => a.activity_id === sc.activity_id);
                                        if (actObj) {
                                            if (!scoreMap[sc.student_id]) scoreMap[sc.student_id] = {};
                                            scoreMap[sc.student_id][actObj.activity_number] = sc.score;
                                        }
                                    });
                                    localStorage.setItem(`tracked_activity_scores_${cName}`, JSON.stringify(scoreMap));
                                }
                            }
                        }

                        // Quizzes
                        const { data: quizzes } = await client.from("quizzes").select("*").eq("course_id", c.course_id);
                        if (quizzes) {
                            const qList = quizzes.map(q => ({ num: q.quiz_number, name: q.quiz_name, maxScore: q.max_score }));
                            localStorage.setItem(`tracked_course_quizzes_${cName}`, JSON.stringify(qList));
                            const qIds = quizzes.map(q => q.quiz_id);
                            if (qIds.length > 0) {
                                const { data: qScores } = await client.from("quiz_scores").select("*").in("quiz_id", qIds);
                                if (qScores) {
                                    const scoreMap = {};
                                    qScores.forEach(sc => {
                                        const qObj = quizzes.find(q => q.quiz_id === sc.quiz_id);
                                        if (qObj) {
                                            if (!scoreMap[sc.student_id]) scoreMap[sc.student_id] = {};
                                            scoreMap[sc.student_id][qObj.quiz_number] = sc.score;
                                        }
                                    });
                                    localStorage.setItem(`tracked_quiz_scores_${cName}`, JSON.stringify(scoreMap));
                                }
                            }
                        }

                        // Exams
                        const { data: exams } = await client.from("exams").select("*").eq("course_id", c.course_id);
                        if (exams) {
                            const exList = exams.map(x => ({ num: x.exam_number, name: x.exam_name, maxScore: x.max_score }));
                            localStorage.setItem(`tracked_course_exams_${cName}`, JSON.stringify(exList));
                            const exIds = exams.map(x => x.exam_id);
                            if (exIds.length > 0) {
                                const { data: exScores } = await client.from("exam_scores").select("*").in("exam_id", exIds);
                                if (exScores) {
                                    const scoreMap = {};
                                    exScores.forEach(sc => {
                                        const xObj = exams.find(x => x.exam_id === sc.exam_id);
                                        if (xObj) {
                                            if (!scoreMap[sc.student_id]) scoreMap[sc.student_id] = {};
                                            scoreMap[sc.student_id][xObj.exam_number] = sc.score;
                                        }
                                    });
                                    localStorage.setItem(`tracked_exam_scores_${cName}`, JSON.stringify(scoreMap));
                                }
                            }
                        }

                        // Attendance
                        const { data: attRecords } = await client.from("attendance").select("*").eq("course_id", c.course_id);
                        if (attRecords) {
                            const attMap = {};
                            attRecords.forEach(ar => {
                                if (!attMap[ar.attendance_date]) attMap[ar.attendance_date] = {};
                                attMap[ar.attendance_date][ar.student_id] = ar.status;
                            });
                            localStorage.setItem(`tracked_course_attendance_${cName}`, JSON.stringify(attMap));
                        }
                    }
                }
                console.log("[TrackED Backend] 🚀 All data synced from Supabase Cloud to local cache!");
                window.dispatchEvent(new CustomEvent("tracked_sync_completed"));
                return true;
            } catch (err) {
                console.warn("[TrackED Backend] Error syncing from cloud:", err);
                return false;
            }
        },

        // Session helpers
        _setTeacherSession: function (teacher) {
            localStorage.setItem("tracked_user_role", "teacher");
            localStorage.setItem("tracked_teacher_id", teacher.teacher_id || teacher.id);
            localStorage.setItem("tracked_teacher_name", teacher.name);
            localStorage.setItem("tracked_teacher_dept", teacher.department || "College of Computer Studies");
            if (teacher.email) {
                localStorage.setItem("tracked_teacher_recovery_email", teacher.email);
            } else {
                localStorage.removeItem("tracked_teacher_recovery_email");
            }
            if (teacher.phone) {
                localStorage.setItem("tracked_teacher_phone", teacher.phone);
            } else {
                localStorage.removeItem("tracked_teacher_phone");
            }
            const tid = teacher.teacher_id || teacher.id;
            const tidKey = (tid || "default").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
            if (teacher.avatar_data && !teacher.avatar_data.includes("profile.jpg")) {
                localStorage.setItem(`tracked_teacher_avatar_${tidKey}`, teacher.avatar_data);
                localStorage.setItem("tracked_teacher_avatar_data", teacher.avatar_data);
            } else {
                localStorage.removeItem(`tracked_teacher_avatar_${tidKey}`);
                localStorage.removeItem("tracked_teacher_avatar_data");
            }
            if (teacher.password_changed) {
                localStorage.setItem("tracked_teacher_password_changed", "true");
            }
        },

        _setStudentSession: function (student) {
            const sid = student.student_id || student.id;
            let sName = student.name;
            let sProg = student.program || "BS Computer Science";
            let sYear = student.year_level || student.yearLevel || "1st Year";
            let sFirst = student.firstName || "";
            let sMiddle = student.middleName || "";
            let sLast = student.lastName || "";

            // If locally updated with custom name, prefer custom name
            try {
                const storedCustom = JSON.parse(localStorage.getItem("tracked_database_students") || "[]");
                const matched = storedCustom.find(s => s.id && s.id.trim().toLowerCase() === sid.trim().toLowerCase());
                if (matched && matched.name) {
                    sName   = matched.name;
                    sFirst  = matched.firstName  || sFirst;
                    sMiddle = matched.middleName || sMiddle;
                    sLast   = matched.lastName   || sLast;
                    if (matched.program)   sProg = matched.program;
                    if (matched.yearLevel) sYear = matched.yearLevel;
                }
            } catch (e) {}

            // Build formatted display name: "Last, First M."
            let displayName = sName || "Student";
            if (sFirst && sLast) {
                const mi = sMiddle ? sMiddle.charAt(0).toUpperCase() + "." : "";
                displayName = mi ? `${sLast}, ${sFirst} ${mi}` : `${sLast}, ${sFirst}`;
            }

            localStorage.setItem("tracked_user_role", "student");
            localStorage.setItem("tracked_student_id", sid);
            localStorage.setItem("tracked_student_name", displayName);
            localStorage.setItem("tracked_student_program", `${sProg} • ${sYear}`);
            if (student.email) {
                localStorage.setItem("tracked_student_recovery_email", student.email);
            } else {
                localStorage.removeItem("tracked_student_recovery_email");
            }
            if (student.phone) {
                localStorage.setItem("tracked_student_phone", student.phone);
            } else {
                localStorage.removeItem("tracked_student_phone");
            }
            
            const sidKey = sid.trim().toLowerCase();
            const defaultPwd = student.password || "1234";
            if (!localStorage.getItem(`tracked_student_pwd_${sidKey}`)) {
                localStorage.setItem(`tracked_student_pwd_${sidKey}`, defaultPwd);
            }
            localStorage.setItem("tracked_student_password", localStorage.getItem(`tracked_student_pwd_${sidKey}`) || defaultPwd);

            // Sync cloud avatar to local if available
            if (student.avatar_data) {
                localStorage.setItem(`tracked_student_avatar_${sidKey}`, student.avatar_data);
                localStorage.setItem("tracked_student_avatar_data", student.avatar_data);
            }

            const isChanged = (student.password_changed === true) || (localStorage.getItem(`tracked_student_pwd_changed_${sidKey}`) === "true");
            if (isChanged) {
                localStorage.setItem("tracked_student_password_changed", "true");
            } else {
                localStorage.removeItem("tracked_student_password_changed");
            }
            sessionStorage.removeItem("tracked_student_pwd_dismissed");
        }
    };

    // Auto-sync from Supabase Cloud on load if connected
    if (window.TrackED_DB && window.TrackED_DB.isCloudConnected()) {
        window.TrackED_DB.syncAllFromCloud();
    }
})();

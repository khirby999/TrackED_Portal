document.addEventListener("DOMContentLoaded", () => {
    // Mark current session as teacher
    localStorage.setItem("tracked_user_role", "teacher");

    // Fresh wipe to remove all mock students and mock courses requested by user
    if (localStorage.getItem("tracked_clean_slate_v3") !== "true") {
        localStorage.setItem("tracked_database_students", JSON.stringify([]));
        localStorage.setItem("tracked_teacher_courses", JSON.stringify([]));
        localStorage.removeItem("tracked_selected_course");
        localStorage.removeItem("tracked_selected_course_code");
        // Clear all mock enrolled, course, activity, quiz, exam, attendance keys
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

    // =========================================
    // STUDENT DATABASE (LOCALSTORAGE)
    // =========================================
    const DEFAULT_DATABASE_STUDENTS = [];

    function getStudentDatabase() {
        const stored = localStorage.getItem("tracked_database_students");
        if (stored === null) {
            localStorage.setItem("tracked_database_students", JSON.stringify([]));
            return [];
        }
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    // =========================================
    // NAME HELPERS
    // =========================================
    /**
     * Build the full display name from parts.
     * Format: "Last Name, First Name M."  e.g. "Dela Cruz, Juan S."
     * Falls back to legacy `name` field if no parts stored yet.
     */
    function formatStudentName(student) {
        if (!student) return "";
        const first  = (student.firstName  || "").trim();
        const middle = (student.middleName || "").trim();
        const last   = (student.lastName   || "").trim();

        if (!first && !last) {
            // Legacy record stored as full name only
            return student.name || "";
        }

        const mi = middle ? middle.charAt(0).toUpperCase() + "." : "";
        const firstMi = mi ? `${first} ${mi}` : first;

        return last ? `${last}, ${firstMi}` : firstMi;
    }

    /**
     * Returns a sort key for alphabetical ordering: lastName → firstName.
     */
    function studentSortKey(student) {
        const last  = (student.lastName  || student.name || "").trim().toLowerCase();
        const first = (student.firstName || "").trim().toLowerCase();
        return `${last}|${first}`;
    }

    /**
     * Build the computed full name string stored in the `name` field.
     * Format: "First Middle Last"  e.g. "Juan Santos Dela Cruz"
     */
    function buildFullName(firstName, middleName, lastName) {
        return [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
    }

    function saveStudentToDatabase(student) {
        const db = getStudentDatabase();
        const sidKey = student.id.trim().toLowerCase();
        const existingIndex = db.findIndex(s => s.id.trim().toLowerCase() === sidKey);
        
        const firstName  = (student.firstName  || "").trim();
        const middleName = (student.middleName || "").trim();
        const lastName   = (student.lastName   || "").trim();
        // Compute full name for backward-compat and login lookup
        const fullName   = firstName || lastName
            ? buildFullName(firstName, middleName, lastName)
            : (student.name || "").trim();

        const studentRecord = {
            id: student.id.trim(),
            firstName,
            middleName,
            lastName,
            name: fullName,
            email: student.email ? student.email.trim() : "",
            phone: student.phone ? student.phone.trim() : "",
            program: student.program || "BS Computer Science",
            yearLevel: student.yearLevel || "1st Year",
            password: "1234",
            createdAt: new Date().toISOString()
        };

        if (existingIndex > -1) {
            db[existingIndex] = { ...db[existingIndex], ...studentRecord, updatedAt: new Date().toISOString() };
        } else {
            db.push(studentRecord);
        }
        localStorage.setItem("tracked_database_students", JSON.stringify(db));

        // Initialize per-student password credentials (default: 1234, unflagged)
        localStorage.setItem(`tracked_student_pwd_${sidKey}`, "1234");
        localStorage.removeItem(`tracked_student_pwd_changed_${sidKey}`);

        // Update student in course enrolled lists:
        // If brand new student: ensure they start with ZERO enrolled courses.
        // If existing student update: sync updated name.
        let teacherCourses = [];
        try {
            teacherCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
        } catch (e) {}

        teacherCourses.map(c => c.name).filter(Boolean).forEach(cName => {
            const key = `tracked_enrolled_${cName}`;
            let enrolled = [];
            try {
                enrolled = JSON.parse(localStorage.getItem(key) || "[]");
            } catch (e) {}

            if (existingIndex === -1) {
                // Brand new student: ensure they are not in any course until teacher enrolls them
                enrolled = enrolled.filter(s => s.id && s.id.trim().toLowerCase() !== sidKey);
                localStorage.setItem(key, JSON.stringify(enrolled));

                // Ensure new student has no lingering activity scores
                const actKey = `tracked_activity_scores_${cName}`;
                try {
                    const actScores = JSON.parse(localStorage.getItem(actKey) || "{}");
                    if (actScores[student.id] || actScores[sidKey]) {
                        delete actScores[student.id];
                        delete actScores[sidKey];
                        localStorage.setItem(actKey, JSON.stringify(actScores));
                    }
                } catch (e) {}

                // Ensure new student has no lingering quiz scores
                const qKey = `tracked_quiz_scores_${cName}`;
                try {
                    const qScores = JSON.parse(localStorage.getItem(qKey) || "{}");
                    if (qScores[student.id] || qScores[sidKey]) {
                        delete qScores[student.id];
                        delete qScores[sidKey];
                        localStorage.setItem(qKey, JSON.stringify(qScores));
                    }
                } catch (e) {}

                // Ensure new student has no lingering exam scores
                const exKey = `tracked_exam_scores_${cName}`;
                try {
                    const exScores = JSON.parse(localStorage.getItem(exKey) || "{}");
                    if (exScores[student.id] || exScores[sidKey]) {
                        delete exScores[student.id];
                        delete exScores[sidKey];
                        localStorage.setItem(exKey, JSON.stringify(exScores));
                    }
                } catch (e) {}

                // Ensure new student has no lingering attendance
                const attKey = `tracked_course_attendance_${cName}`;
                try {
                    const attMap = JSON.parse(localStorage.getItem(attKey) || "{}");
                    let attChanged = false;
                    Object.keys(attMap).forEach(d => {
                        if (attMap[d] && (attMap[d][student.id] || attMap[d][sidKey])) {
                            delete attMap[d][student.id];
                            delete attMap[d][sidKey];
                            attChanged = true;
                        }
                    });
                    if (attChanged) localStorage.setItem(attKey, JSON.stringify(attMap));
                } catch (e) {}
            } else {
                let changed = false;
                enrolled.forEach(s => {
                    if (s.id && s.id.trim().toLowerCase() === sidKey) {
                        s.name = student.name.trim();
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem(key, JSON.stringify(enrolled));
                }
            }
        });

        // Sync to Cloud if connected
        if (window.TrackED_DB && typeof window.TrackED_DB.addStudent === "function") {
            window.TrackED_DB.addStudent(studentRecord);
        }

        return db;
    }

    function findStudentInDatabase(studentId) {
        if (!studentId) return null;
        const db = getStudentDatabase();
        const query = studentId.trim().toLowerCase();
        return db.find(s => s.id.trim().toLowerCase() === query) || null;
    }

    function removeStudentFromDatabase(studentId) {
        if (!studentId) return false;
        const query = studentId.trim().toLowerCase();
        let db = getStudentDatabase();
        const initialLen = db.length;
        db = db.filter(s => s.id.trim().toLowerCase() !== query);
        if (db.length === initialLen) return false;

        localStorage.setItem("tracked_database_students", JSON.stringify(db));

        // Clean up per-student password & avatar keys
        localStorage.removeItem(`tracked_student_pwd_${query}`);
        localStorage.removeItem(`tracked_student_pwd_changed_${query}`);
        localStorage.removeItem(`tracked_student_avatar_${query}`);

        // If currently logged-in student session belongs to this student, clear session
        const currentActiveSid = (localStorage.getItem("tracked_student_id") || "").trim().toLowerCase();
        if (currentActiveSid === query) {
            localStorage.removeItem("tracked_student_id");
            localStorage.removeItem("tracked_student_name");
            localStorage.removeItem("tracked_student_program");
            localStorage.removeItem("tracked_student_recovery_email");
            localStorage.removeItem("tracked_student_password");
            localStorage.removeItem("tracked_student_password_changed");
            localStorage.removeItem("tracked_student_avatar_data");
            localStorage.removeItem("tracked_student_selected_course");
            localStorage.removeItem("tracked_student_selected_course_code");
            localStorage.removeItem("tracked_student_selected_instructor");
        }

        // Wipe student from all enrolled courses, scores, and attendance maps
        Object.keys(localStorage).forEach(key => {
            // 1. Enrolled students lists
            if (key.startsWith("tracked_enrolled_")) {
                try {
                    let enrolled = JSON.parse(localStorage.getItem(key) || "[]");
                    if (Array.isArray(enrolled)) {
                        const filtered = enrolled.filter(s => s.id && s.id.trim().toLowerCase() !== query);
                        if (filtered.length !== enrolled.length) {
                            localStorage.setItem(key, JSON.stringify(filtered));
                        }
                    }
                } catch (e) {}
            }

            // 2. Activity scores
            if (key.startsWith("tracked_activity_scores_")) {
                try {
                    let scores = JSON.parse(localStorage.getItem(key) || "{}");
                    if (scores[studentId] || scores[query]) {
                        delete scores[studentId];
                        delete scores[query];
                        localStorage.setItem(key, JSON.stringify(scores));
                    }
                } catch (e) {}
            }

            // 3. Quiz scores
            if (key.startsWith("tracked_quiz_scores_")) {
                try {
                    let scores = JSON.parse(localStorage.getItem(key) || "{}");
                    if (scores[studentId] || scores[query]) {
                        delete scores[studentId];
                        delete scores[query];
                        localStorage.setItem(key, JSON.stringify(scores));
                    }
                } catch (e) {}
            }

            // 4. Exam scores
            if (key.startsWith("tracked_exam_scores_")) {
                try {
                    let scores = JSON.parse(localStorage.getItem(key) || "{}");
                    if (scores[studentId] || scores[query]) {
                        delete scores[studentId];
                        delete scores[query];
                        localStorage.setItem(key, JSON.stringify(scores));
                    }
                } catch (e) {}
            }

            // 5. Course attendance maps
            if (key.startsWith("tracked_course_attendance_")) {
                try {
                    let attMap = JSON.parse(localStorage.getItem(key) || "{}");
                    let changed = false;
                    Object.keys(attMap).forEach(d => {
                        if (attMap[d] && (attMap[d][studentId] || attMap[d][query])) {
                            delete attMap[d][studentId];
                            delete attMap[d][query];
                            changed = true;
                        }
                    });
                    if (changed) {
                        localStorage.setItem(key, JSON.stringify(attMap));
                    }
                } catch (e) {}
            }
        });

        // Also delete from Supabase Cloud if connected
        if (window.TrackED_DB && typeof window.TrackED_DB.deleteStudent === "function") {
            window.TrackED_DB.deleteStudent(studentId);
        }

        return true;
    }

    // Initialize database on first visit
    getStudentDatabase();

    // =========================================
    // ACCOUNT DROPDOWN
    // =========================================
    const accountBtn = document.getElementById("accountBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if (accountBtn && dropdownMenu) {
        accountBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle("show");
        });

        document.addEventListener("click", (event) => {
            if (!accountBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove("show");
            }
        });
    }

    // =========================================
    // TEACHER PROFILE POPUP
    // =========================================
    const profileTrigger = document.getElementById("profileTrigger");
    const profilePopup   = document.getElementById("profilePopup");
    const profileOverlay = document.getElementById("profileOverlay");
    const profileClose   = document.getElementById("profileClose");

    function openProfilePopup() {
        if (profilePopup && profileOverlay) {
            profilePopup.classList.add("show");
            profileOverlay.classList.add("show");
        }
    }

    function closeProfilePopup() {
        if (profilePopup && profileOverlay) {
            profilePopup.classList.remove("show");
            profileOverlay.classList.remove("show");
        }
    }

    if (profileTrigger) {
        profileTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            openProfilePopup();
        });
    }

    if (profileClose)   profileClose.addEventListener("click", closeProfilePopup);
    if (profileOverlay) profileOverlay.addEventListener("click", closeProfilePopup);

    // =========================================
    // ADD STUDENT MODAL (DATABASE REGISTRATION)
    // =========================================
    const addStudentBtn           = document.getElementById("addStudentBtn");
    const studentModalOverlay     = document.getElementById("studentModalOverlay");
    const closeStudentModal       = document.getElementById("closeStudentModal");
    const cancelStudentBtn        = document.getElementById("cancelStudentBtn");
    const addStudentForm          = document.getElementById("addStudentForm");
    const studentIdInput          = document.getElementById("studentIdInput");
    const studentFirstNameInput   = document.getElementById("studentFirstNameInput");
    const studentMiddleNameInput  = document.getElementById("studentMiddleNameInput");
    const studentLastNameInput    = document.getElementById("studentLastNameInput");
    const studentProgramInput     = document.getElementById("studentProgramInput");
    const studentYearInput        = document.getElementById("studentYearInput");
    const studentSuccessAlert     = document.getElementById("studentSuccessAlert");
    const studentSuccessMsg       = document.getElementById("studentSuccessMsg");
    const studentErrorAlert       = document.getElementById("studentErrorAlert");
    const studentErrorMsg         = document.getElementById("studentErrorMsg");

    function clearStudentModalFields() {
        if (studentIdInput)         studentIdInput.value = "";
        if (studentFirstNameInput)  studentFirstNameInput.value = "";
        if (studentMiddleNameInput) studentMiddleNameInput.value = "";
        if (studentLastNameInput)   studentLastNameInput.value = "";
        if (studentProgramInput)    studentProgramInput.value = "";
        if (studentYearInput)       studentYearInput.value = "";
    }

    function openStudentModal() {
        if (studentModalOverlay) {
            studentModalOverlay.classList.add("show");
            if (studentSuccessAlert) studentSuccessAlert.style.display = "none";
            if (studentErrorAlert)   studentErrorAlert.style.display = "none";
            clearStudentModalFields();
            setTimeout(() => { if (studentIdInput) studentIdInput.focus(); }, 100);
        }
    }

    function closeStudentModalFunc() {
        if (studentModalOverlay) {
            studentModalOverlay.classList.remove("show");
            if (studentSuccessAlert) studentSuccessAlert.style.display = "none";
            if (studentErrorAlert)   studentErrorAlert.style.display = "none";
        }
    }

    if (studentIdInput) {
        studentIdInput.addEventListener("input", () => {
            if (studentErrorAlert) studentErrorAlert.style.display = "none";
        });
    }

    if (addStudentBtn)     addStudentBtn.addEventListener("click", openStudentModal);
    if (closeStudentModal) closeStudentModal.addEventListener("click", closeStudentModalFunc);
    if (cancelStudentBtn)  cancelStudentBtn.addEventListener("click", closeStudentModalFunc);

    if (studentModalOverlay) {
        studentModalOverlay.addEventListener("click", (e) => {
            if (e.target === studentModalOverlay) closeStudentModalFunc();
        });
    }

    if (addStudentForm) {
        addStudentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const studentId    = studentIdInput         ? studentIdInput.value.trim()         : "";
            const firstName    = studentFirstNameInput  ? studentFirstNameInput.value.trim()  : "";
            const middleName   = studentMiddleNameInput ? studentMiddleNameInput.value.trim() : "";
            const lastName     = studentLastNameInput   ? studentLastNameInput.value.trim()   : "";
            const studentProgram = studentProgramInput  ? studentProgramInput.value.trim()    : "";
            const studentYear    = studentYearInput     ? studentYearInput.value.trim()       : "";

            if (!studentId || !firstName || !middleName || !lastName) return;

            // Check if student ID already exists in the database
            const existingStudent = findStudentInDatabase(studentId);
            if (existingStudent) {
                if (studentErrorAlert && studentErrorMsg) {
                    studentErrorMsg.textContent = `Student ID "${studentId}" is already registered in the database (${formatStudentName(existingStudent)})!`;
                    studentErrorAlert.style.display = "flex";
                }
                if (studentSuccessAlert) studentSuccessAlert.style.display = "none";
                if (studentIdInput) { studentIdInput.focus(); studentIdInput.select(); }
                return;
            }

            // Save student to the shared database
            saveStudentToDatabase({ id: studentId, firstName, middleName, lastName, program: studentProgram, yearLevel: studentYear });

            const displayName = formatStudentName({ firstName, middleName, lastName });

            // Show success alert
            if (studentSuccessAlert && studentSuccessMsg) {
                studentSuccessMsg.textContent = `Student "${displayName}" (${studentId}) added to database!`;
                studentSuccessAlert.style.display = "flex";
            }
            if (studentErrorAlert) studentErrorAlert.style.display = "none";

            // Reset and close after brief delay
            setTimeout(() => {
                clearStudentModalFields();
                closeStudentModalFunc();
            }, 1300);
        });
    }

    // =========================================
    // REMOVE STUDENT POPUP MODAL (ID SEARCH & REMOVE)
    // =========================================
    const removeStudentBtn           = document.getElementById("removeStudentBtn");
    const removeStudentModalOverlay  = document.getElementById("removeStudentModalOverlay");
    const closeRemoveStudentModal    = document.getElementById("closeRemoveStudentModal");
    const cancelRemoveStudentBtn     = document.getElementById("cancelRemoveStudentBtn");
    const removeStudentForm          = document.getElementById("removeStudentForm");
    const removeStudentIdInput       = document.getElementById("removeStudentIdInput");
    const removeStudentFoundBox      = document.getElementById("removeStudentFoundBox");
    const removeFoundName            = document.getElementById("removeFoundName");
    const removeFoundProgram         = document.getElementById("removeFoundProgram");
    const removeStudentNotFound      = document.getElementById("removeStudentNotFound");
    const confirmRemoveStudentBtn    = document.getElementById("confirmRemoveStudentBtn");
    const removeStudentSuccessAlert  = document.getElementById("removeStudentSuccessAlert");
    const removeStudentSuccessMsg    = document.getElementById("removeStudentSuccessMsg");

    let currentFoundStudent = null;

    function resetRemoveStudentModal() {
        currentFoundStudent = null;
        if (removeStudentIdInput) removeStudentIdInput.value = "";
        if (removeStudentFoundBox) removeStudentFoundBox.style.display = "none";
        if (removeStudentNotFound) removeStudentNotFound.style.display = "none";
        if (removeStudentSuccessAlert) removeStudentSuccessAlert.style.display = "none";
        if (confirmRemoveStudentBtn) confirmRemoveStudentBtn.disabled = true;
    }

    function openRemoveStudentModal() {
        if (removeStudentModalOverlay) {
            resetRemoveStudentModal();
            removeStudentModalOverlay.classList.add("show");
            setTimeout(() => {
                if (removeStudentIdInput) removeStudentIdInput.focus();
            }, 100);
        }
    }

    function closeRemoveStudentModalFunc() {
        if (removeStudentModalOverlay) {
            removeStudentModalOverlay.classList.remove("show");
            resetRemoveStudentModal();
        }
    }

    if (removeStudentBtn) {
        removeStudentBtn.addEventListener("click", openRemoveStudentModal);
    }
    if (closeRemoveStudentModal) {
        closeRemoveStudentModal.addEventListener("click", closeRemoveStudentModalFunc);
    }
    if (cancelRemoveStudentBtn) {
        cancelRemoveStudentBtn.addEventListener("click", closeRemoveStudentModalFunc);
    }
    if (removeStudentModalOverlay) {
        removeStudentModalOverlay.addEventListener("click", (e) => {
            if (e.target === removeStudentModalOverlay) closeRemoveStudentModalFunc();
        });
    }

    // Real-time lookup as teacher types the Student ID
    if (removeStudentIdInput) {
        removeStudentIdInput.addEventListener("input", () => {
            const enteredId = removeStudentIdInput.value.trim();

            if (!enteredId) {
                currentFoundStudent = null;
                if (removeStudentFoundBox) removeStudentFoundBox.style.display = "none";
                if (removeStudentNotFound) removeStudentNotFound.style.display = "none";
                if (confirmRemoveStudentBtn) confirmRemoveStudentBtn.disabled = true;
                return;
            }

            const found = findStudentInDatabase(enteredId);

            if (found) {
                currentFoundStudent = found;
                if (removeFoundName) removeFoundName.textContent = found.name;
                if (removeFoundProgram) removeFoundProgram.textContent = `${found.program || "BS Computer Science"}${found.yearLevel ? " • " + found.yearLevel : ""}`;
                if (removeStudentFoundBox) removeStudentFoundBox.style.display = "flex";
                if (removeStudentNotFound) removeStudentNotFound.style.display = "none";
                if (confirmRemoveStudentBtn) confirmRemoveStudentBtn.disabled = false;
            } else {
                currentFoundStudent = null;
                if (removeStudentFoundBox) removeStudentFoundBox.style.display = "none";
                // Show "not found" if they typed at least 3 characters
                if (enteredId.length >= 3) {
                    if (removeStudentNotFound) removeStudentNotFound.style.display = "flex";
                } else {
                    if (removeStudentNotFound) removeStudentNotFound.style.display = "none";
                }
                if (confirmRemoveStudentBtn) confirmRemoveStudentBtn.disabled = true;
            }
        });
    }

    // On form submit, remove the confirmed student
    if (removeStudentForm) {
        removeStudentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!currentFoundStudent) return;

            const studentId = currentFoundStudent.id;
            const studentName = currentFoundStudent.name;

            removeStudentFromDatabase(studentId);

            if (removeStudentSuccessAlert && removeStudentSuccessMsg) {
                removeStudentSuccessMsg.textContent = `Student "${studentName}" (${studentId}) removed from database!`;
                removeStudentSuccessAlert.style.display = "flex";
            }

            // Hide the found card and disable button
            if (removeStudentFoundBox) removeStudentFoundBox.style.display = "none";
            if (confirmRemoveStudentBtn) confirmRemoveStudentBtn.disabled = true;

            // Refresh any active enrolled tables on course pages if open
            if (typeof renderEnrolledTable === "function") {
                renderEnrolledTable();
            }

            setTimeout(() => {
                closeRemoveStudentModalFunc();
            }, 1300);
        });
    }

    // =========================================
    // ADD COURSE MODAL & DYNAMIC COURSES
    // =========================================
    const addCourseBtn        = document.getElementById("addCourseBtn");
    const courseModalOverlay  = document.getElementById("courseModalOverlay");
    const closeCourseModal    = document.getElementById("closeCourseModal");
    const cancelCourseBtn     = document.getElementById("cancelCourseBtn");
    const addCourseForm       = document.getElementById("addCourseForm");
    const courseCodeInput     = document.getElementById("courseCodeInput");
    const courseNameInput     = document.getElementById("courseNameInput");
    const courseSuccessAlert  = document.getElementById("courseSuccessAlert");
    const courseSuccessMsg    = document.getElementById("courseSuccessMsg");
    const courseErrorAlert    = document.getElementById("courseErrorAlert");
    const courseErrorMsg      = document.getElementById("courseErrorMsg");
    const coursesGrid         = document.getElementById("coursesGrid");

    function openCourseModal() {
        if (courseModalOverlay) {
            courseModalOverlay.classList.add("show");
            if (courseSuccessAlert) courseSuccessAlert.style.display = "none";
            if (courseErrorAlert)   courseErrorAlert.style.display   = "none";
            if (courseCodeInput) {
                courseCodeInput.value = "";
                if (courseNameInput) courseNameInput.value = "";
                setTimeout(() => courseCodeInput.focus(), 100);
            }
        }
    }

    function closeCourseModalFunc() {
        if (courseModalOverlay) {
            courseModalOverlay.classList.remove("show");
            if (courseSuccessAlert) courseSuccessAlert.style.display = "none";
            if (courseErrorAlert)   courseErrorAlert.style.display   = "none";
        }
    }

    if (courseCodeInput) {
        courseCodeInput.addEventListener("input", () => {
            if (courseErrorAlert) courseErrorAlert.style.display = "none";
        });
    }
    if (courseNameInput) {
        courseNameInput.addEventListener("input", () => {
            if (courseErrorAlert) courseErrorAlert.style.display = "none";
        });
    }

    if (addCourseBtn) {
        addCourseBtn.addEventListener("click", openCourseModal);
    }

    if (closeCourseModal) {
        closeCourseModal.addEventListener("click", closeCourseModalFunc);
    }

    if (cancelCourseBtn) {
        cancelCourseBtn.addEventListener("click", closeCourseModalFunc);
    }

    if (courseModalOverlay) {
        courseModalOverlay.addEventListener("click", (e) => {
            if (e.target === courseModalOverlay) {
                closeCourseModalFunc();
            }
        });
    }

    // =========================================
    // EDIT COURSE MODAL & LOGIC
    // =========================================
    const editCourseModalOverlay = document.getElementById("editCourseModalOverlay");
    const closeEditCourseModal   = document.getElementById("closeEditCourseModal");
    const cancelEditCourseBtn    = document.getElementById("cancelEditCourseBtn");
    const editCourseForm         = document.getElementById("editCourseForm");
    const editCourseCodeInput    = document.getElementById("editCourseCodeInput");
    const editCourseNameInput    = document.getElementById("editCourseNameInput");
    const editCourseSuccessAlert = document.getElementById("editCourseSuccessAlert");
    const editCourseSuccessMsg   = document.getElementById("editCourseSuccessMsg");
    const editCourseErrorAlert   = document.getElementById("editCourseErrorAlert");
    const editCourseErrorMsg     = document.getElementById("editCourseErrorMsg");

    let currentEditingCourseCode = "";
    let currentEditingCourseName = "";
    let currentEditingCard = null;

    function openEditCourseModal(code, name, cardElement) {
        currentEditingCourseCode = code || "";
        currentEditingCourseName = name || "";
        currentEditingCard = cardElement;

        if (editCourseCodeInput) editCourseCodeInput.value = currentEditingCourseCode;
        if (editCourseNameInput) editCourseNameInput.value = currentEditingCourseName;

        if (editCourseSuccessAlert) editCourseSuccessAlert.style.display = "none";
        if (editCourseErrorAlert) editCourseErrorAlert.style.display = "none";

        if (editCourseModalOverlay) {
            editCourseModalOverlay.classList.add("show");
            setTimeout(() => {
                if (editCourseNameInput) editCourseNameInput.focus();
            }, 100);
        }
    }

    function closeEditCourseModalFunc() {
        if (editCourseModalOverlay) {
            editCourseModalOverlay.classList.remove("show");
            if (editCourseSuccessAlert) editCourseSuccessAlert.style.display = "none";
            if (editCourseErrorAlert) editCourseErrorAlert.style.display = "none";
        }
        currentEditingCourseCode = "";
        currentEditingCourseName = "";
        currentEditingCard = null;
    }

    if (closeEditCourseModal) closeEditCourseModal.addEventListener("click", closeEditCourseModalFunc);
    if (cancelEditCourseBtn) cancelEditCourseBtn.addEventListener("click", closeEditCourseModalFunc);

    if (editCourseModalOverlay) {
        editCourseModalOverlay.addEventListener("click", (e) => {
            if (e.target === editCourseModalOverlay) {
                closeEditCourseModalFunc();
            }
        });
    }

    if (editCourseNameInput) {
        editCourseNameInput.addEventListener("input", () => {
            if (editCourseErrorAlert) editCourseErrorAlert.style.display = "none";
        });
    }
    if (editCourseCodeInput) {
        editCourseCodeInput.addEventListener("input", () => {
            if (editCourseErrorAlert) editCourseErrorAlert.style.display = "none";
        });
    }

    if (editCourseForm) {
        editCourseForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newCode = (editCourseCodeInput ? editCourseCodeInput.value.trim() : "").toUpperCase();
            const newName = editCourseNameInput ? editCourseNameInput.value.trim() : "";

            if (!newCode || !newName) return;

            // Validate course uniqueness & consistency across the portal
            if (window.TrackED_DB && typeof window.TrackED_DB.validateCourse === "function") {
                const validation = await window.TrackED_DB.validateCourse(newCode, newName, currentEditingCourseName);
                if (!validation.valid) {
                    if (editCourseErrorAlert && editCourseErrorMsg) {
                        editCourseErrorMsg.textContent = validation.message;
                        editCourseErrorAlert.style.display = "flex";
                    }
                    return;
                }
            } else {
                let customCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
                const isDuplicateName = customCourses.some(c => 
                    c.name && c.name.trim().toLowerCase() === newName.toLowerCase() &&
                    c.name.trim().toLowerCase() !== currentEditingCourseName.toLowerCase()
                );
                if (isDuplicateName) {
                    if (editCourseErrorAlert && editCourseErrorMsg) {
                        editCourseErrorMsg.textContent = `A course named "${newName}" already exists!`;
                        editCourseErrorAlert.style.display = "flex";
                    }
                    return;
                }
                const isDuplicateCode = customCourses.some(c => 
                    c.code && c.code.trim().toUpperCase() === newCode &&
                    c.name.trim().toLowerCase() !== currentEditingCourseName.toLowerCase()
                );
                if (isDuplicateCode) {
                    if (editCourseErrorAlert && editCourseErrorMsg) {
                        editCourseErrorMsg.textContent = `Course code "${newCode}" is already in use by one of your courses!`;
                        editCourseErrorAlert.style.display = "flex";
                    }
                    return;
                }
            }

            if (editCourseErrorAlert) editCourseErrorAlert.style.display = "none";

            let customCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");

            const oldName = currentEditingCourseName;
            const oldCode = currentEditingCourseCode;

            // Find and update course in tracked_teacher_courses
            const courseIdx = customCourses.findIndex(c => c.name && c.name.trim().toLowerCase() === oldName.toLowerCase());
            if (courseIdx > -1) {
                customCourses[courseIdx] = { code: newCode, name: newName };
            } else {
                customCourses.push({ code: newCode, name: newName });
            }
            localStorage.setItem("tracked_teacher_courses", JSON.stringify(customCourses));

            // Sync to Supabase Cloud if connected
            if (window.TrackED_DB && typeof window.TrackED_DB.editCourse === "function") {
                window.TrackED_DB.editCourse(oldName, newCode, newName);
            }

            // If course name changed, migrate all associated localStorage keys
            if (oldName !== newName) {
                const migrateKey = (oldK, newK) => {
                    const val = localStorage.getItem(oldK);
                    if (val !== null) {
                        localStorage.setItem(newK, val);
                        localStorage.removeItem(oldK);
                    }
                };

                migrateKey(`tracked_enrolled_${oldName}`, `tracked_enrolled_${newName}`);
                migrateKey(`tracked_course_activities_${oldName}`, `tracked_course_activities_${newName}`);
                migrateKey(`tracked_activity_scores_${oldName}`, `tracked_activity_scores_${newName}`);
                migrateKey(`tracked_course_quizzes_${oldName}`, `tracked_course_quizzes_${newName}`);
                migrateKey(`tracked_quiz_scores_${oldName}`, `tracked_quiz_scores_${newName}`);
                migrateKey(`tracked_course_exams_${oldName}`, `tracked_course_exams_${newName}`);
                migrateKey(`tracked_exam_scores_${oldName}`, `tracked_exam_scores_${newName}`);
                migrateKey(`tracked_course_attendance_${oldName}`, `tracked_course_attendance_${newName}`);

                // Student sync keys
                migrateKey(`tracked_activity_${oldName.trim().toLowerCase()}`, `tracked_activity_${newName.trim().toLowerCase()}`);
                migrateKey(`tracked_quizzes_${oldName.trim().toLowerCase()}`, `tracked_quizzes_${newName.trim().toLowerCase()}`);
                migrateKey(`tracked_exams_${oldName.trim().toLowerCase()}`, `tracked_exams_${newName.trim().toLowerCase()}`);
                migrateKey(`tracked_attendance_${oldName.trim().toLowerCase()}`, `tracked_attendance_${newName.trim().toLowerCase()}`);

                // Active course session keys
                if (localStorage.getItem("tracked_selected_course") === oldName) {
                    localStorage.setItem("tracked_selected_course", newName);
                    localStorage.setItem("tracked_selected_course_code", newCode);
                }
                if (localStorage.getItem("tracked_student_selected_course") === oldName) {
                    localStorage.setItem("tracked_student_selected_course", newName);
                    localStorage.setItem("tracked_student_selected_course_code", newCode);
                }

                // Clean from deleted courses if present
                const delList = JSON.parse(localStorage.getItem("tracked_deleted_courses") || "[]");
                const delIdx = delList.indexOf(oldName);
                if (delIdx > -1) {
                    delList.splice(delIdx, 1);
                    localStorage.setItem("tracked_deleted_courses", JSON.stringify(delList));
                }
            } else {
                if (localStorage.getItem("tracked_selected_course") === oldName) {
                    localStorage.setItem("tracked_selected_course_code", newCode);
                }
                if (localStorage.getItem("tracked_student_selected_course") === oldName) {
                    localStorage.setItem("tracked_student_selected_course_code", newCode);
                }
            }

            // Update DOM card
            if (currentEditingCard) {
                currentEditingCard.setAttribute("data-course-name", newName);
                currentEditingCard.setAttribute("data-course-code", newCode);
                const titleEl = currentEditingCard.querySelector("h3");
                if (titleEl) titleEl.textContent = newName;
                const descEl = currentEditingCard.querySelector(".tab-info p");
                if (descEl) {
                    descEl.textContent = `${newCode ? newCode + " • " : ""}Manage students, attendance, activities, quizzes, and exams`;
                }
            }

            // Show success feedback
            if (editCourseSuccessAlert && editCourseSuccessMsg) {
                editCourseSuccessMsg.textContent = `Course updated to "${newName}" (${newCode}) successfully!`;
                editCourseSuccessAlert.style.display = "flex";
            }
            if (editCourseErrorAlert) editCourseErrorAlert.style.display = "none";

            setTimeout(() => {
                closeEditCourseModalFunc();
            }, 1100);
        });
    }

    // =========================================
    // DELETE COURSE MODAL & LOGIC
    // =========================================
    const deleteCourseModalOverlay = document.getElementById("deleteCourseModalOverlay");
    const closeDeleteModal         = document.getElementById("closeDeleteModal");
    const cancelDeleteBtn          = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn         = document.getElementById("confirmDeleteBtn");
    const deleteCourseTargetName   = document.getElementById("deleteCourseTargetName");

    let courseToDeleteName = "";
    let courseToDeleteCard = null;

    function openDeleteModal(courseName, cardElement) {
        courseToDeleteName = courseName;
        courseToDeleteCard = cardElement;
        if (deleteCourseTargetName) {
            deleteCourseTargetName.textContent = `"${courseName}"`;
        }
        if (deleteCourseModalOverlay) {
            deleteCourseModalOverlay.classList.add("show");
        }
    }

    function closeDeleteModalFunc() {
        if (deleteCourseModalOverlay) {
            deleteCourseModalOverlay.classList.remove("show");
        }
        courseToDeleteName = "";
        courseToDeleteCard = null;
    }

    if (closeDeleteModal) closeDeleteModal.addEventListener("click", closeDeleteModalFunc);
    if (cancelDeleteBtn)  cancelDeleteBtn.addEventListener("click", closeDeleteModalFunc);

    if (deleteCourseModalOverlay) {
        deleteCourseModalOverlay.addEventListener("click", (e) => {
            if (e.target === deleteCourseModalOverlay) {
                closeDeleteModalFunc();
            }
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", () => {
            if (!courseToDeleteName || !courseToDeleteCard) {
                closeDeleteModalFunc();
                return;
            }

            // Remove card from DOM with smooth animation
            const cardToRemove = courseToDeleteCard;
            cardToRemove.style.transition = "all 0.25s ease";
            cardToRemove.style.opacity = "0";
            cardToRemove.style.transform = "scale(0.85)";
            setTimeout(() => cardToRemove.remove(), 250);

            // Remove from custom courses if stored
            let customCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
            customCourses = customCourses.filter(c => c.name !== courseToDeleteName);
            localStorage.setItem("tracked_teacher_courses", JSON.stringify(customCourses));

            // Clean up course-specific data keys
            localStorage.removeItem(`tracked_enrolled_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_activities_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_activity_scores_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_quizzes_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_quiz_scores_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_exams_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_exam_scores_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_attendance_${courseToDeleteName}`);

            // Record in deleted courses list so default courses remain deleted
            const deletedCourses = JSON.parse(localStorage.getItem("tracked_deleted_courses") || "[]");
            if (!deletedCourses.includes(courseToDeleteName)) {
                deletedCourses.push(courseToDeleteName);
                localStorage.setItem("tracked_deleted_courses", JSON.stringify(deletedCourses));
            }

            // Sync deletion to Supabase Cloud if connected
            if (window.TrackED_DB && typeof window.TrackED_DB.deleteCourse === "function") {
                window.TrackED_DB.deleteCourse(courseToDeleteName);
            }

            closeDeleteModalFunc();
        });
    }

    // Delegated click handler on coursesGrid for edit/delete buttons and card selection
    if (coursesGrid) {
        coursesGrid.addEventListener("click", (e) => {
            const editBtn = e.target.closest(".edit-course-btn");
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = editBtn.closest(".tab-card");
                if (card) {
                    const courseName = card.getAttribute("data-course-name") ||
                                       (card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "");
                    const courseCode = card.getAttribute("data-course-code") || "";
                    openEditCourseModal(courseCode, courseName, card);
                }
                return;
            }

            const deleteBtn = e.target.closest(".delete-course-btn");
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = deleteBtn.closest(".tab-card");
                if (card) {
                    const courseName = card.getAttribute("data-course-name") ||
                                       (card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "this course");
                    openDeleteModal(courseName, card);
                }
                return;
            }

            // If clicking the card itself (not edit/delete or add course button), store selected course
            const card = e.target.closest(".tab-card");
            if (card && !card.classList.contains("tab-add-course")) {
                const courseName = card.getAttribute("data-course-name") ||
                                   (card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "");
                const courseCode = card.getAttribute("data-course-code") || "";
                if (courseName) {
                    localStorage.setItem("tracked_selected_course", courseName);
                    localStorage.setItem("tracked_selected_course_code", courseCode);
                }
            }
        });
    }

    // Hide any previously deleted default courses on page load
    const deletedCourses = JSON.parse(localStorage.getItem("tracked_deleted_courses") || "[]");
    document.querySelectorAll(".tab-card[data-course-name]").forEach(card => {
        const name = card.getAttribute("data-course-name");
        if (deletedCourses.includes(name)) {
            card.remove();
        }
    });

    // Create DOM element for a course card
    function renderCourseCard(course) {
        if (!coursesGrid || !addCourseBtn) return;
        if (deletedCourses.includes(course.name)) return;

        const card = document.createElement("a");
        card.href = "teacherCourse.html";
        card.className = "tab-card tab-custom";
        card.setAttribute("data-course-name", course.name);
        if (course.code) card.setAttribute("data-course-code", course.code);
        card.innerHTML = `
            <div class="tab-icon">
                <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <div class="tab-info">
                <h3>${escapeHtml(course.name)}</h3>
                <p>${escapeHtml(course.code ? course.code + " • " : "")}Manage students, attendance, activities, quizzes, and exams</p>
            </div>
            <div class="tab-actions">
                <button type="button" class="edit-course-btn" title="Edit Course">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" class="delete-course-btn" title="Delete Course">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <i class="fa-solid fa-arrow-right tab-arrow"></i>
            </div>
        `;

        coursesGrid.insertBefore(card, addCourseBtn);
    }

    function escapeHtml(str) {
        if (!str) return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // Load custom courses stored in localStorage
    const savedCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
    savedCourses.forEach(renderCourseCard);

    if (addCourseForm) {
        addCourseForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const courseCode = (courseCodeInput ? courseCodeInput.value.trim() : "").toUpperCase();
            const courseName = courseNameInput ? courseNameInput.value.trim() : "";

            if (!courseCode || !courseName) return;

            // Validate course uniqueness & consistency across the portal
            if (window.TrackED_DB && typeof window.TrackED_DB.validateCourse === "function") {
                const validation = await window.TrackED_DB.validateCourse(courseCode, courseName);
                if (!validation.valid) {
                    if (courseErrorAlert && courseErrorMsg) {
                        courseErrorMsg.textContent = validation.message;
                        courseErrorAlert.style.display = "flex";
                    }
                    if (courseSuccessAlert) courseSuccessAlert.style.display = "none";
                    return;
                }
            } else {
                const courses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
                if (courses.some(c => c.code && c.code.trim().toUpperCase() === courseCode)) {
                    if (courseErrorAlert && courseErrorMsg) {
                        courseErrorMsg.textContent = `You already have a course with code "${courseCode}".`;
                        courseErrorAlert.style.display = "flex";
                    }
                    if (courseSuccessAlert) courseSuccessAlert.style.display = "none";
                    return;
                }
                if (courses.some(c => c.name && c.name.trim().toLowerCase() === courseName.toLowerCase())) {
                    if (courseErrorAlert && courseErrorMsg) {
                        courseErrorMsg.textContent = `You are already teaching "${courseName}".`;
                        courseErrorAlert.style.display = "flex";
                    }
                    if (courseSuccessAlert) courseSuccessAlert.style.display = "none";
                    return;
                }
            }

            if (courseErrorAlert) courseErrorAlert.style.display = "none";

            // If it was in deleted courses, remove it from deleted
            const delIndex = deletedCourses.indexOf(courseName);
            if (delIndex > -1) {
                deletedCourses.splice(delIndex, 1);
                localStorage.setItem("tracked_deleted_courses", JSON.stringify(deletedCourses));
            }

            const newCourse = { code: courseCode, name: courseName };

            // Save to localStorage
            const courses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
            courses.push(newCourse);
            localStorage.setItem("tracked_teacher_courses", JSON.stringify(courses));

            // Sync to Supabase Cloud if connected
            if (window.TrackED_DB && typeof window.TrackED_DB.addCourse === "function") {
                window.TrackED_DB.addCourse(courseCode, courseName);
            }

            // Ensure newly created course starts completely fresh with NO records across all 5 tabs
            localStorage.setItem(`tracked_enrolled_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_course_activities_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_activity_scores_${courseName}`, JSON.stringify({}));
            localStorage.setItem(`tracked_course_quizzes_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_quiz_scores_${courseName}`, JSON.stringify({}));
            localStorage.setItem(`tracked_course_exams_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_exam_scores_${courseName}`, JSON.stringify({}));
            localStorage.setItem(`tracked_course_attendance_${courseName}`, JSON.stringify({}));

            // Render immediately
            renderCourseCard(newCourse);

            // Show success
            if (courseSuccessAlert && courseSuccessMsg) {
                courseSuccessMsg.textContent = `Course "${courseName}" (${courseCode}) created successfully!`;
                courseSuccessAlert.style.display = "flex";
            }

            // Close after brief delay
            setTimeout(() => {
                if (courseCodeInput) courseCodeInput.value = "";
                if (courseNameInput) courseNameInput.value = "";
                closeCourseModalFunc();
            }, 1200);
        });
    }

    // =========================================
    // DYNAMIC COURSE HEADER SYNC ON SUBPAGES
    // =========================================
    const activeCourseName = localStorage.getItem("tracked_selected_course");
    if (activeCourseName) {
        // Sync course title on teacherCourse.html (#courseName)
        const courseHeading = document.getElementById("courseName");
        if (courseHeading) {
            courseHeading.textContent = activeCourseName;
        }

        // Sync course title on teacherStudent.html (.page-header-text h1)
        const studentPageHeader = document.querySelector(".student-content .page-header-text h1");
        if (studentPageHeader) {
            studentPageHeader.textContent = activeCourseName;
        }

        // Sync course title on teacherAttendance.html (.course-info-text h2)
        const attendanceCourseHeading = document.querySelector(".attendance-content .course-info-text h2");
        if (attendanceCourseHeading) {
            attendanceCourseHeading.textContent = activeCourseName;
        }

        // Sync course title on teacherActivity.html
        const activityCourseHeading = document.getElementById("activityCourseHeading") || document.querySelector(".activities-content .course-info-text h2");
        if (activityCourseHeading) {
            activityCourseHeading.textContent = activeCourseName;
        }

        // Sync course title on teacherQuizzes.html
        const quizCourseHeading = document.getElementById("quizCourseHeading") || document.querySelector(".quizzes-content .course-info-text h2");
        if (quizCourseHeading) {
            quizCourseHeading.textContent = activeCourseName;
        }

        // Sync course title on teacherExam.html
        const examCourseHeading = document.getElementById("examCourseHeading") || document.querySelector(".exams-content .course-info-text h2");
        if (examCourseHeading) {
            examCourseHeading.textContent = activeCourseName;
        }
    }

    // =========================================
    // TEACHER STUDENT PAGE: ENROLL STUDENT VIA ID
    // =========================================
    const enrollForm           = document.getElementById("enrollForm");
    const enrollStudentIdInput = document.getElementById("studentId");
    const enrollSuccessAlert   = document.getElementById("enrollSuccessAlert");
    const enrollSuccessMsg     = document.getElementById("enrollSuccessMsg");
    const enrollErrorAlert     = document.getElementById("enrollErrorAlert");
    const enrollErrorMsg       = document.getElementById("enrollErrorMsg");
    const enrolledStudentsBody = document.getElementById("enrolledStudentsBody");
    const studentCountBadge    = document.querySelector(".student-count");

    if (enrollForm && enrolledStudentsBody) {
        const currentCourseKey = `tracked_enrolled_${activeCourseName || "Programming Fundamentals"}`;

        function getEnrolledStudents() {
            const raw = localStorage.getItem(currentCourseKey);
            let list = [];
            if (raw === null) {
                list = [];
                localStorage.setItem(currentCourseKey, JSON.stringify([]));
            } else {
                try {
                    list = JSON.parse(raw) || [];
                } catch (e) {
                    list = [];
                }
            }

            // Always sync latest student name parts from database
            const db = getStudentDatabase();
            list.forEach(item => {
                const match = db.find(s => s.id && s.id.trim().toLowerCase() === (item.id || "").trim().toLowerCase());
                if (match) {
                    if (match.name)       item.name       = match.name;
                    if (match.firstName)  item.firstName  = match.firstName;
                    if (match.middleName !== undefined) item.middleName = match.middleName;
                    if (match.lastName)   item.lastName   = match.lastName;
                }
            });

            return list;
        }

        function saveEnrolledStudents(list) {
            localStorage.setItem(currentCourseKey, JSON.stringify(list));
        }

        function renderEnrolledTable() {
            const list = getEnrolledStudents();
            enrolledStudentsBody.innerHTML = "";

            if (list.length === 0) {
                enrolledStudentsBody.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #94a3b8; padding: 22px;">
                            No students enrolled yet. Enter a Student ID above to enroll.
                        </td>
                    </tr>
                `;
            } else {
                // Sort alphabetically by last name then first name
                const sorted = [...list].sort((a, b) => {
                    const ka = studentSortKey(a);
                    const kb = studentSortKey(b);
                    return ka.localeCompare(kb);
                });

                sorted.forEach(student => {
                    const tr = document.createElement("tr");
                    tr.setAttribute("data-student-id", student.id);
                    tr.innerHTML = `
                        <td>${escapeHtml(student.id)}</td>
                        <td>${escapeHtml(formatStudentName(student))}</td>
                        <td>
                            <button type="button" class="remove-btn" title="Remove Student">
                                <i class="fa-solid fa-trash"></i> Remove
                            </button>
                        </td>
                    `;
                    enrolledStudentsBody.appendChild(tr);
                });
            }

            if (studentCountBadge) {
                studentCountBadge.textContent = `${list.length} Student${list.length === 1 ? "" : "s"}`;
            }
        }

        // Initial render
        renderEnrolledTable();

        // Grab the new preview elements
        const enrollStudentFoundBox  = document.getElementById("enrollStudentFoundBox");
        const enrollFoundName        = document.getElementById("enrollFoundName");
        const enrollFoundProgram     = document.getElementById("enrollFoundProgram");
        const enrollStudentNotFound  = document.getElementById("enrollStudentNotFound");
        const enrollBtn              = document.getElementById("enrollBtn");

        let currentEnrollStudent = null;

        function resetEnrollPreview() {
            currentEnrollStudent = null;
            if (enrollStudentFoundBox) enrollStudentFoundBox.style.display = "none";
            if (enrollStudentNotFound) enrollStudentNotFound.style.display = "none";
            if (enrollBtn) enrollBtn.disabled = true;
            if (enrollSuccessAlert) enrollSuccessAlert.style.display = "none";
            if (enrollErrorAlert) enrollErrorAlert.style.display = "none";
        }

        // Real-time lookup as teacher types the Student ID
        if (enrollStudentIdInput) {
            enrollStudentIdInput.addEventListener("input", () => {
                const enteredId = enrollStudentIdInput.value.trim();

                if (enrollSuccessAlert) enrollSuccessAlert.style.display = "none";
                if (enrollErrorAlert) enrollErrorAlert.style.display = "none";

                if (!enteredId) {
                    resetEnrollPreview();
                    return;
                }

                const found = findStudentInDatabase(enteredId);

                if (found) {
                    currentEnrollStudent = found;
                    if (enrollFoundName) enrollFoundName.textContent = formatStudentName(found);
                    if (enrollFoundProgram) enrollFoundProgram.textContent =
                        `${found.program || "BS Computer Science"}${found.yearLevel ? " • " + found.yearLevel : ""}`;
                    if (enrollStudentFoundBox) enrollStudentFoundBox.style.display = "flex";
                    if (enrollStudentNotFound) enrollStudentNotFound.style.display = "none";
                    if (enrollBtn) enrollBtn.disabled = false;
                } else {
                    currentEnrollStudent = null;
                    if (enrollStudentFoundBox) enrollStudentFoundBox.style.display = "none";
                    if (enteredId.length >= 3) {
                        if (enrollStudentNotFound) enrollStudentNotFound.style.display = "flex";
                    } else {
                        if (enrollStudentNotFound) enrollStudentNotFound.style.display = "none";
                    }
                    if (enrollBtn) enrollBtn.disabled = true;
                }
            });
        }

        // Handle student enrollment on form submit
        enrollForm.addEventListener("submit", (e) => {
            e.preventDefault();

            if (!currentEnrollStudent) return;

            if (enrollSuccessAlert) enrollSuccessAlert.style.display = "none";
            if (enrollErrorAlert) enrollErrorAlert.style.display = "none";

            // Check if student is already enrolled
            const enrolledList = getEnrolledStudents();
            const isAlreadyEnrolled = enrolledList.some(
                s => s.id.trim().toLowerCase() === currentEnrollStudent.id.trim().toLowerCase()
            );

            if (isAlreadyEnrolled) {
                if (enrollErrorAlert && enrollErrorMsg) {
                    enrollErrorMsg.textContent = `Student "${currentEnrollStudent.name}" (${currentEnrollStudent.id}) is already enrolled in this course!`;
                    enrollErrorAlert.style.display = "flex";
                }
                return;
            }

            // Add student to enrolled list (store all name parts for formatted display)
            enrolledList.push({
                id:         currentEnrollStudent.id,
                name:       currentEnrollStudent.name,
                firstName:  currentEnrollStudent.firstName  || "",
                middleName: currentEnrollStudent.middleName || "",
                lastName:   currentEnrollStudent.lastName   || ""
            });
            saveEnrolledStudents(enrolledList);
            renderEnrolledTable();

            // Sync enrollment to Supabase Cloud if connected
            if (window.TrackED_DB && typeof window.TrackED_DB.enrollStudent === "function") {
                window.TrackED_DB.enrollStudent(activeCourseName || "Programming Fundamentals", currentEnrollStudent.id);
            }

            // Show success feedback
            if (enrollSuccessAlert && enrollSuccessMsg) {
                enrollSuccessMsg.textContent = `"${currentEnrollStudent.name}" (${currentEnrollStudent.id}) enrolled successfully!`;
                enrollSuccessAlert.style.display = "flex";
            }

            // Clear input and reset preview
            if (enrollStudentIdInput) enrollStudentIdInput.value = "";
            resetEnrollPreview();

            setTimeout(() => {
                if (enrollSuccessAlert) enrollSuccessAlert.style.display = "none";
            }, 3500);
        });

        // Handle student removal
        enrolledStudentsBody.addEventListener("click", (e) => {
            const removeBtn = e.target.closest(".remove-btn");
            if (removeBtn) {
                const tr = removeBtn.closest("tr");
                if (tr) {
                    const studentId = tr.getAttribute("data-student-id");
                    let enrolledList = getEnrolledStudents();
                    enrolledList = enrolledList.filter(s => s.id !== studentId);
                    saveEnrolledStudents(enrolledList);

                    // Sync unenrollment to Supabase Cloud if connected
                    if (window.TrackED_DB && typeof window.TrackED_DB.unenrollStudent === "function") {
                        window.TrackED_DB.unenrollStudent(activeCourseName || "Programming Fundamentals", studentId);
                    }

                    tr.style.transition = "all 0.2s ease";
                    tr.style.opacity = "0";
                    tr.style.transform = "translateX(20px)";
                    setTimeout(() => {
                        renderEnrolledTable();
                    }, 200);
                }
            }
        });
    }

    // =========================================
    // HELPER: GET ENROLLED STUDENTS FOR ACTIVE COURSE
    // =========================================
    function getEnrolledStudentsForCourse(course) {
        const key = `tracked_enrolled_${course}`;
        const raw = localStorage.getItem(key);
        if (raw !== null) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const db = getStudentDatabase();
                    parsed.forEach(item => {
                        const match = db.find(s => s.id && s.id.trim().toLowerCase() === (item.id || "").trim().toLowerCase());
                        if (match) {
                            if (match.name)       item.name       = match.name;
                            if (match.firstName)  item.firstName  = match.firstName;
                            if (match.middleName !== undefined) item.middleName = match.middleName;
                            if (match.lastName)   item.lastName   = match.lastName;
                        }
                    });
                    return parsed;
                }
            } catch (e) {}
        }
        return [];
    }

    const currentActiveCourse = activeCourseName || "Programming Fundamentals";

    // =========================================
    // 1. TEACHER ACTIVITIES MANAGEMENT
    // =========================================
    const addActivityBtn          = document.getElementById("addActivityBtn");
    const addActivityModalOverlay = document.getElementById("addActivityModalOverlay");
    const closeActivityModalBtn   = document.getElementById("closeActivityModalBtn");
    const cancelActivityModalBtn  = document.getElementById("cancelActivityModalBtn");
    const addActivityForm         = document.getElementById("addActivityForm");
    const autoActivityText        = document.getElementById("autoActivityText");
    const addActivityModalTitle   = document.getElementById("addActivityModalTitle");
    const activityMaxScoreInput   = document.getElementById("activityMaxScoreInput");
    const activityTableHead       = document.getElementById("activityTableHead");
    const activityTableBody       = document.getElementById("activityTableBody");
    const saveScoresBtn           = document.getElementById("saveScoresBtn");
    const activityAlertSuccess    = document.getElementById("activityAlertSuccess");
    const activityAlertSuccessMsg = document.getElementById("activityAlertSuccessMsg");

    if (activityTableBody && addActivityBtn) {
        const activitiesKey = `tracked_course_activities_${currentActiveCourse}`;
        const scoresKey     = `tracked_activity_scores_${currentActiveCourse}`;

        function getActivities() {
            const raw = localStorage.getItem(activitiesKey);
            if (raw !== null) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            return [];
        }

        function getScores() {
            const raw = localStorage.getItem(scoresKey);
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let currentActivities  = getActivities();
        let currentScores      = getScores();
        const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);

        function saveActivitiesData() {
            localStorage.setItem(activitiesKey, JSON.stringify(currentActivities));
        }

        function saveScoresData() {
            localStorage.setItem(scoresKey, JSON.stringify(currentScores));
        }

        function getNextActivityNum() {
            if (!currentActivities || currentActivities.length === 0) return 1;
            const maxNum = currentActivities.reduce((max, a) => Math.max(max, parseInt(a.num, 10) || 0), 0);
            return maxNum + 1;
        }

        function renderActivityTable() {
            // Render Head
            if (activityTableHead) {
                let thHtml = `
                    <tr>
                        <th style="width: 140px;">Student ID</th>
                        <th style="width: 210px;">Student Name</th>
                `;
                if (currentActivities.length === 0) {
                    thHtml += `<th>Activities</th>`;
                } else {
                    currentActivities.forEach(act => {
                        thHtml += `
                            <th class="th-activity-header" data-act-num="${act.num}">
                                <div class="th-header-inner">
                                    <div class="th-title-row">
                                        <span class="th-activity-title">${escapeHtml(act.name)}</span>
                                        <button type="button" class="th-delete-btn" data-act-num="${act.num}" title="Delete ${escapeHtml(act.name)}">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                    <span class="th-activity-max">Max: ${act.maxScore}</span>
                                </div>
                            </th>
                        `;
                    });
                }
                thHtml += `</tr>`;
                activityTableHead.innerHTML = thHtml;
            }

            // Render Body
            activityTableBody.innerHTML = "";
            if (enrolledStudents.length === 0) {
                activityTableBody.innerHTML = `
                    <tr>
                        <td colspan="${Math.max(2, 2 + currentActivities.length)}" style="text-align: center; color: #94a3b8; padding: 30px;">
                            No students enrolled in this course yet.
                        </td>
                    </tr>
                `;
                return;
            }

            if (currentActivities.length === 0) {
                [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                    const tr = document.createElement("tr");
                    tr.setAttribute("data-student-id", st.id);
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(st.id)}</strong></td>
                        <td>${escapeHtml(formatStudentName(st))}</td>
                        <td style="color: #94a3b8; font-style: italic;">No activities created yet. Click "+ Add Activity" above to create Activity 1.</td>
                    `;
                    activityTableBody.appendChild(tr);
                });
                return;
            }

            [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-student-id", st.id);

                let rowHtml = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                `;

                currentActivities.forEach(act => {
                    const stScores = currentScores[st.id] || {};
                    const val = (stScores[act.num] !== undefined && stScores[act.num] !== null) ? stScores[act.num] : "";
                    rowHtml += `
                        <td class="score-cell">
                            <div class="score-input-wrap">
                                <input 
                                    type="number" 
                                    class="score-num-input" 
                                    data-student-id="${escapeHtml(st.id)}" 
                                    data-act-num="${act.num}" 
                                    min="0" 
                                    max="${act.maxScore}" 
                                    value="${val}" 
                                    placeholder="0"
                                >
                                <span class="score-max-label">/ ${act.maxScore}</span>
                            </div>
                        </td>
                    `;
                });

                tr.innerHTML = rowHtml;
                activityTableBody.appendChild(tr);
            });
        }

        // Initial render
        renderActivityTable();

        // Modal triggers
        let pendingActNum = getNextActivityNum();
        function openAddActivityModal() {
            pendingActNum = getNextActivityNum();
            if (autoActivityText) autoActivityText.textContent = `Activity ${pendingActNum}`;
            if (addActivityModalTitle) addActivityModalTitle.textContent = `Add Activity ${pendingActNum}`;
            if (activityMaxScoreInput) activityMaxScoreInput.value = "";
            if (addActivityModalOverlay) {
                addActivityModalOverlay.classList.add("show");
                setTimeout(() => {
                    if (activityMaxScoreInput) activityMaxScoreInput.focus();
                }, 100);
            }
        }

        function closeAddActivityModal() {
            if (addActivityModalOverlay) {
                addActivityModalOverlay.classList.remove("show");
            }
        }

        addActivityBtn.addEventListener("click", openAddActivityModal);
        if (closeActivityModalBtn) closeActivityModalBtn.addEventListener("click", closeAddActivityModal);
        if (cancelActivityModalBtn) cancelActivityModalBtn.addEventListener("click", closeAddActivityModal);
        if (addActivityModalOverlay) {
            addActivityModalOverlay.addEventListener("click", (e) => {
                if (e.target === addActivityModalOverlay) closeAddActivityModal();
            });
        }

        // Add Activity Form submit
        if (addActivityForm) {
            addActivityForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const maxVal = parseInt(activityMaxScoreInput.value, 10);
                if (!maxVal || maxVal <= 0) return;

                const newActivity = {
                    num: pendingActNum,
                    name: `Activity ${pendingActNum}`,
                    maxScore: maxVal
                };

                currentActivities.push(newActivity);
                saveActivitiesData();
                renderActivityTable();
                closeAddActivityModal();

                // Sync activity to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.addActivity === "function") {
                    window.TrackED_DB.addActivity(currentActiveCourse, newActivity);
                }

                if (activityAlertSuccess && activityAlertSuccessMsg) {
                    activityAlertSuccessMsg.textContent = `Activity ${pendingActNum} (Max Score: ${maxVal}) added successfully!`;
                    activityAlertSuccess.style.display = "flex";
                    setTimeout(() => {
                        activityAlertSuccess.style.display = "none";
                    }, 3500);
                }
            });
        }

        // Delete Activity Column
        if (activityTableHead) {
            activityTableHead.addEventListener("click", (e) => {
                const delBtn = e.target.closest(".th-delete-btn");
                if (delBtn) {
                    const actNum = parseInt(delBtn.getAttribute("data-act-num"), 10);
                    if (confirm(`Are you sure you want to remove Activity ${actNum}?`)) {
                        currentActivities = currentActivities.filter(a => a.num !== actNum);
                        Object.keys(currentScores).forEach(sId => {
                            if (currentScores[sId]) delete currentScores[sId][actNum];
                        });
                        saveActivitiesData();
                        saveScoresData();
                        renderActivityTable();

                        // Sync delete to Supabase Cloud if connected
                        if (window.TrackED_DB && typeof window.TrackED_DB.deleteActivity === "function") {
                            window.TrackED_DB.deleteActivity(currentActiveCourse, actNum);
                        }
                    }
                }
            });
        }

        // Save Scores Button
        if (saveScoresBtn) {
            saveScoresBtn.addEventListener("click", () => {
                const inputs = activityTableBody.querySelectorAll(".score-num-input");
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const aNum = inp.getAttribute("data-act-num");
                    const val = inp.value.trim();
                    if (!currentScores[sId]) currentScores[sId] = {};
                    currentScores[sId][aNum] = val === "" ? "" : Number(val);
                });
                saveScoresData();

                // Sync scores to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveActivityScores === "function") {
                    window.TrackED_DB.saveActivityScores(currentActiveCourse, currentScores);
                }

                // Sync with student portal localStorage key: tracked_activity_${currentCourse}
                const studentStorageKey = `tracked_activity_${currentActiveCourse.trim().toLowerCase()}`;
                const syncRecords = currentActivities.map(act => {
                    const repStudent = enrolledStudents[0] || { id: "2024-00123" };
                    const sc = currentScores[repStudent.id]?.[act.num] !== undefined
                        ? currentScores[repStudent.id][act.num]
                        : "";
                    return {
                        number: act.name,
                        date: "September 2026",
                        score: sc !== "" ? `${sc}/${act.maxScore}` : `0/${act.maxScore}`
                    };
                });
                localStorage.setItem(studentStorageKey, JSON.stringify(syncRecords));

                // Button visual feedback
                const origHtml = saveScoresBtn.innerHTML;
                saveScoresBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Scores Saved!`;
                saveScoresBtn.style.backgroundColor = "#059669";

                if (activityAlertSuccess && activityAlertSuccessMsg) {
                    activityAlertSuccessMsg.textContent = "All student activity scores have been saved successfully!";
                    activityAlertSuccess.style.display = "flex";
                }

                setTimeout(() => {
                    saveScoresBtn.innerHTML = origHtml;
                    saveScoresBtn.style.backgroundColor = "";
                    if (activityAlertSuccess) activityAlertSuccess.style.display = "none";
                }, 2000);
            });
        }
    }

    // =========================================
    // 2. TEACHER QUIZZES MANAGEMENT
    // =========================================
    const addQuizBtn          = document.getElementById("addQuizBtn");
    const addQuizModalOverlay = document.getElementById("addQuizModalOverlay");
    const closeQuizModalBtn   = document.getElementById("closeQuizModalBtn");
    const cancelQuizModalBtn  = document.getElementById("cancelQuizModalBtn");
    const addQuizForm         = document.getElementById("addQuizForm");
    const autoQuizText        = document.getElementById("autoQuizText");
    const addQuizModalTitle   = document.getElementById("addQuizModalTitle");
    const quizMaxScoreInput   = document.getElementById("quizMaxScoreInput");
    const quizTableHead       = document.getElementById("quizTableHead");
    const quizTableBody       = document.getElementById("quizTableBody");
    const saveQuizScoresBtn   = document.getElementById("saveQuizScoresBtn");
    const quizAlertSuccess    = document.getElementById("quizAlertSuccess");
    const quizAlertSuccessMsg = document.getElementById("quizAlertSuccessMsg");

    if (quizTableBody && addQuizBtn) {
        const quizzesKey = `tracked_course_quizzes_${currentActiveCourse}`;
        const scoresKey  = `tracked_quiz_scores_${currentActiveCourse}`;

        function getQuizzes() {
            const raw = localStorage.getItem(quizzesKey);
            if (raw !== null) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            return [];
        }

        function getQuizScores() {
            const raw = localStorage.getItem(scoresKey);
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let currentQuizzes     = getQuizzes();
        let currentQuizScores  = getQuizScores();
        const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);

        function saveQuizzesData() {
            localStorage.setItem(quizzesKey, JSON.stringify(currentQuizzes));
        }

        function saveQuizScoresData() {
            localStorage.setItem(scoresKey, JSON.stringify(currentQuizScores));
        }

        function getNextQuizNum() {
            if (!currentQuizzes || currentQuizzes.length === 0) return 1;
            const maxNum = currentQuizzes.reduce((max, a) => Math.max(max, parseInt(a.num, 10) || 0), 0);
            return maxNum + 1;
        }

        function renderQuizTable() {
            if (quizTableHead) {
                let thHtml = `
                    <tr>
                        <th style="width: 140px;">Student ID</th>
                        <th style="width: 210px;">Student Name</th>
                `;
                if (currentQuizzes.length === 0) {
                    thHtml += `<th>Quizzes</th>`;
                } else {
                    currentQuizzes.forEach(q => {
                        thHtml += `
                            <th class="th-activity-header" data-quiz-num="${q.num}">
                                <div class="th-header-inner">
                                    <div class="th-title-row">
                                        <span class="th-activity-title">${escapeHtml(q.name)}</span>
                                        <button type="button" class="th-delete-btn" data-quiz-num="${q.num}" title="Delete ${escapeHtml(q.name)}">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                    <span class="th-activity-max">Max: ${q.maxScore}</span>
                                </div>
                            </th>
                        `;
                    });
                }
                thHtml += `</tr>`;
                quizTableHead.innerHTML = thHtml;
            }

            quizTableBody.innerHTML = "";
            if (enrolledStudents.length === 0) {
                quizTableBody.innerHTML = `
                    <tr>
                        <td colspan="${Math.max(2, 2 + currentQuizzes.length)}" style="text-align: center; color: #94a3b8; padding: 30px;">
                            No students enrolled in this course yet.
                        </td>
                    </tr>
                `;
                return;
            }

            if (currentQuizzes.length === 0) {
                [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                    const tr = document.createElement("tr");
                    tr.setAttribute("data-student-id", st.id);
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(st.id)}</strong></td>
                        <td>${escapeHtml(formatStudentName(st))}</td>
                        <td style="color: #94a3b8; font-style: italic;">No quizzes created yet. Click "+ Add Quiz" above to create Quiz 1.</td>
                    `;
                    quizTableBody.appendChild(tr);
                });
                return;
            }

            [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-student-id", st.id);

                let rowHtml = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                `;

                currentQuizzes.forEach(q => {
                    const stScores = currentQuizScores[st.id] || {};
                    const val = (stScores[q.num] !== undefined && stScores[q.num] !== null) ? stScores[q.num] : "";
                    rowHtml += `
                        <td class="score-cell">
                            <div class="score-input-wrap">
                                <input 
                                    type="number" 
                                    class="score-num-input" 
                                    data-student-id="${escapeHtml(st.id)}" 
                                    data-quiz-num="${q.num}" 
                                    min="0" 
                                    max="${q.maxScore}" 
                                    value="${val}" 
                                    placeholder="0"
                                >
                                <span class="score-max-label">/ ${q.maxScore}</span>
                            </div>
                        </td>
                    `;
                });

                tr.innerHTML = rowHtml;
                quizTableBody.appendChild(tr);
            });
        }

        renderQuizTable();

        let pendingQuizNum = getNextQuizNum();
        function openAddQuizModal() {
            pendingQuizNum = getNextQuizNum();
            if (autoQuizText) autoQuizText.textContent = `Quiz ${pendingQuizNum}`;
            if (addQuizModalTitle) addQuizModalTitle.textContent = `Add Quiz ${pendingQuizNum}`;
            if (quizMaxScoreInput) quizMaxScoreInput.value = "";
            if (addQuizModalOverlay) {
                addQuizModalOverlay.classList.add("show");
                setTimeout(() => {
                    if (quizMaxScoreInput) quizMaxScoreInput.focus();
                }, 100);
            }
        }

        function closeAddQuizModal() {
            if (addQuizModalOverlay) {
                addQuizModalOverlay.classList.remove("show");
            }
        }

        addQuizBtn.addEventListener("click", openAddQuizModal);
        if (closeQuizModalBtn) closeQuizModalBtn.addEventListener("click", closeAddQuizModal);
        if (cancelQuizModalBtn) cancelQuizModalBtn.addEventListener("click", closeAddQuizModal);
        if (addQuizModalOverlay) {
            addQuizModalOverlay.addEventListener("click", (e) => {
                if (e.target === addQuizModalOverlay) closeAddQuizModal();
            });
        }

        if (addQuizForm) {
            addQuizForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const maxVal = parseInt(quizMaxScoreInput.value, 10);
                if (!maxVal || maxVal <= 0) return;

                const newQuiz = {
                    num: pendingQuizNum,
                    name: `Quiz ${pendingQuizNum}`,
                    maxScore: maxVal
                };

                currentQuizzes.push(newQuiz);
                saveQuizzesData();
                renderQuizTable();
                closeAddQuizModal();

                // Sync quiz to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.addQuiz === "function") {
                    window.TrackED_DB.addQuiz(currentActiveCourse, newQuiz);
                }

                if (quizAlertSuccess && quizAlertSuccessMsg) {
                    quizAlertSuccessMsg.textContent = `Quiz ${pendingQuizNum} (Max Score: ${maxVal}) added successfully!`;
                    quizAlertSuccess.style.display = "flex";
                    setTimeout(() => {
                        quizAlertSuccess.style.display = "none";
                    }, 3500);
                }
            });
        }

        if (quizTableHead) {
            quizTableHead.addEventListener("click", (e) => {
                const delBtn = e.target.closest(".th-delete-btn");
                if (delBtn) {
                    const qNum = parseInt(delBtn.getAttribute("data-quiz-num"), 10);
                    if (confirm(`Are you sure you want to remove Quiz ${qNum}?`)) {
                        currentQuizzes = currentQuizzes.filter(q => q.num !== qNum);
                        Object.keys(currentQuizScores).forEach(sId => {
                            if (currentQuizScores[sId]) delete currentQuizScores[sId][qNum];
                        });
                        saveQuizzesData();
                        saveQuizScoresData();
                        renderQuizTable();

                        // Sync delete quiz to Supabase Cloud if connected
                        if (window.TrackED_DB && typeof window.TrackED_DB.deleteQuiz === "function") {
                            window.TrackED_DB.deleteQuiz(currentActiveCourse, qNum);
                        }
                    }
                }
            });
        }

        if (saveQuizScoresBtn) {
            saveQuizScoresBtn.addEventListener("click", () => {
                const inputs = quizTableBody.querySelectorAll(".score-num-input");
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const qNum = inp.getAttribute("data-quiz-num");
                    const val = inp.value.trim();
                    if (!currentQuizScores[sId]) currentQuizScores[sId] = {};
                    currentQuizScores[sId][qNum] = val === "" ? "" : Number(val);
                });
                saveQuizScoresData();

                // Sync quiz scores to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveQuizScores === "function") {
                    window.TrackED_DB.saveQuizScores(currentActiveCourse, currentQuizScores);
                }

                const studentStorageKey = `tracked_quizzes_${currentActiveCourse.trim().toLowerCase()}`;
                const syncRecords = currentQuizzes.map(q => {
                    const repStudent = enrolledStudents[0] || { id: "2024-00123" };
                    const sc = currentQuizScores[repStudent.id]?.[q.num] !== undefined
                        ? currentQuizScores[repStudent.id][q.num]
                        : "";
                    return {
                        number: q.name,
                        date: "September 2026",
                        score: sc !== "" ? `${sc}/${q.maxScore}` : `0/${q.maxScore}`
                    };
                });
                localStorage.setItem(studentStorageKey, JSON.stringify(syncRecords));

                const origHtml = saveQuizScoresBtn.innerHTML;
                saveQuizScoresBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Scores Saved!`;
                saveQuizScoresBtn.style.backgroundColor = "#059669";

                if (quizAlertSuccess && quizAlertSuccessMsg) {
                    quizAlertSuccessMsg.textContent = "All student quiz scores have been saved successfully!";
                    quizAlertSuccess.style.display = "flex";
                }

                setTimeout(() => {
                    saveQuizScoresBtn.innerHTML = origHtml;
                    saveQuizScoresBtn.style.backgroundColor = "";
                    if (quizAlertSuccess) quizAlertSuccess.style.display = "none";
                }, 2000);
            });
        }
    }

    // =========================================
    // 3. TEACHER EXAMS MANAGEMENT
    // =========================================
    const addExamBtn          = document.getElementById("addExamBtn");
    const addExamModalOverlay = document.getElementById("addExamModalOverlay");
    const closeExamModalBtn   = document.getElementById("closeExamModalBtn");
    const cancelExamModalBtn  = document.getElementById("cancelExamModalBtn");
    const addExamForm         = document.getElementById("addExamForm");
    const autoExamText        = document.getElementById("autoExamText");
    const addExamModalTitle   = document.getElementById("addExamModalTitle");
    const examMaxScoreInput   = document.getElementById("examMaxScoreInput");
    const examTableHead       = document.getElementById("examTableHead");
    const examTableBody       = document.getElementById("examTableBody");
    const saveExamScoresBtn   = document.getElementById("saveExamScoresBtn");
    const examAlertSuccess    = document.getElementById("examAlertSuccess");
    const examAlertSuccessMsg = document.getElementById("examAlertSuccessMsg");

    if (examTableBody && addExamBtn) {
        const examsKey  = `tracked_course_exams_${currentActiveCourse}`;
        const scoresKey = `tracked_exam_scores_${currentActiveCourse}`;

        function getExams() {
            const raw = localStorage.getItem(examsKey);
            if (raw !== null) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            return [];
        }

        function getExamScores() {
            const raw = localStorage.getItem(scoresKey);
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let currentExams       = getExams();
        let currentExamScores  = getExamScores();
        const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);

        function saveExamsData() {
            localStorage.setItem(examsKey, JSON.stringify(currentExams));
        }

        function saveExamScoresData() {
            localStorage.setItem(scoresKey, JSON.stringify(currentExamScores));
        }

        function getNextExamNum() {
            if (!currentExams || currentExams.length === 0) return 1;
            const maxNum = currentExams.reduce((max, a) => Math.max(max, parseInt(a.num, 10) || 0), 0);
            return maxNum + 1;
        }

        function renderExamTable() {
            if (examTableHead) {
                let thHtml = `
                    <tr>
                        <th style="width: 140px;">Student ID</th>
                        <th style="width: 210px;">Student Name</th>
                `;
                if (currentExams.length === 0) {
                    thHtml += `<th>Exams</th>`;
                } else {
                    currentExams.forEach(ex => {
                        thHtml += `
                            <th class="th-activity-header" data-exam-num="${ex.num}">
                                <div class="th-header-inner">
                                    <div class="th-title-row">
                                        <span class="th-activity-title">${escapeHtml(ex.name)}</span>
                                        <button type="button" class="th-delete-btn" data-exam-num="${ex.num}" title="Delete ${escapeHtml(ex.name)}">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                    <span class="th-activity-max">Max: ${ex.maxScore}</span>
                                </div>
                            </th>
                        `;
                    });
                }
                thHtml += `</tr>`;
                examTableHead.innerHTML = thHtml;
            }

            examTableBody.innerHTML = "";
            if (enrolledStudents.length === 0) {
                examTableBody.innerHTML = `
                    <tr>
                        <td colspan="${Math.max(2, 2 + currentExams.length)}" style="text-align: center; color: #94a3b8; padding: 30px;">
                            No students enrolled in this course yet.
                        </td>
                    </tr>
                `;
                return;
            }

            if (currentExams.length === 0) {
                [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                    const tr = document.createElement("tr");
                    tr.setAttribute("data-student-id", st.id);
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(st.id)}</strong></td>
                        <td>${escapeHtml(formatStudentName(st))}</td>
                        <td style="color: #94a3b8; font-style: italic;">No exams created yet. Click "+ Add Exam" above to create Exam 1.</td>
                    `;
                    examTableBody.appendChild(tr);
                });
                return;
            }

            [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-student-id", st.id);

                let rowHtml = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                `;

                currentExams.forEach(ex => {
                    const stScores = currentExamScores[st.id] || {};
                    const val = (stScores[ex.num] !== undefined && stScores[ex.num] !== null) ? stScores[ex.num] : "";
                    rowHtml += `
                        <td class="score-cell">
                            <div class="score-input-wrap">
                                <input 
                                    type="number" 
                                    class="score-num-input" 
                                    data-student-id="${escapeHtml(st.id)}" 
                                    data-exam-num="${ex.num}" 
                                    min="0" 
                                    max="${ex.maxScore}" 
                                    value="${val}" 
                                    placeholder="0"
                                >
                                <span class="score-max-label">/ ${ex.maxScore}</span>
                            </div>
                        </td>
                    `;
                });

                tr.innerHTML = rowHtml;
                examTableBody.appendChild(tr);
            });
        }

        renderExamTable();

        let pendingExamNum = getNextExamNum();
        function openAddExamModal() {
            pendingExamNum = getNextExamNum();
            if (autoExamText) autoExamText.textContent = `Exam ${pendingExamNum}`;
            if (addExamModalTitle) addExamModalTitle.textContent = `Add Exam ${pendingExamNum}`;
            if (examMaxScoreInput) examMaxScoreInput.value = "";
            if (addExamModalOverlay) {
                addExamModalOverlay.classList.add("show");
                setTimeout(() => {
                    if (examMaxScoreInput) examMaxScoreInput.focus();
                }, 100);
            }
        }

        function closeAddExamModal() {
            if (addExamModalOverlay) {
                addExamModalOverlay.classList.remove("show");
            }
        }

        addExamBtn.addEventListener("click", openAddExamModal);
        if (closeExamModalBtn) closeExamModalBtn.addEventListener("click", closeAddExamModal);
        if (cancelExamModalBtn) cancelExamModalBtn.addEventListener("click", closeAddExamModal);
        if (addExamModalOverlay) {
            addExamModalOverlay.addEventListener("click", (e) => {
                if (e.target === addExamModalOverlay) closeAddExamModal();
            });
        }

        if (addExamForm) {
            addExamForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const maxVal = parseInt(examMaxScoreInput.value, 10);
                if (!maxVal || maxVal <= 0) return;

                const newExam = {
                    num: pendingExamNum,
                    name: `Exam ${pendingExamNum}`,
                    maxScore: maxVal
                };

                currentExams.push(newExam);
                saveExamsData();
                renderExamTable();
                closeAddExamModal();

                // Sync exam to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.addExam === "function") {
                    window.TrackED_DB.addExam(currentActiveCourse, newExam);
                }

                if (examAlertSuccess && examAlertSuccessMsg) {
                    examAlertSuccessMsg.textContent = `Exam ${pendingExamNum} (Max Score: ${maxVal}) added successfully!`;
                    examAlertSuccess.style.display = "flex";
                    setTimeout(() => {
                        examAlertSuccess.style.display = "none";
                    }, 3500);
                }
            });
        }

        if (examTableHead) {
            examTableHead.addEventListener("click", (e) => {
                const delBtn = e.target.closest(".th-delete-btn");
                if (delBtn) {
                    const exNum = parseInt(delBtn.getAttribute("data-exam-num"), 10);
                    if (confirm(`Are you sure you want to remove Exam ${exNum}?`)) {
                        currentExams = currentExams.filter(ex => ex.num !== exNum);
                        Object.keys(currentExamScores).forEach(sId => {
                            if (currentExamScores[sId]) delete currentExamScores[sId][exNum];
                        });
                        saveExamsData();
                        saveExamScoresData();
                        renderExamTable();

                        // Sync delete exam to Supabase Cloud if connected
                        if (window.TrackED_DB && typeof window.TrackED_DB.deleteExam === "function") {
                            window.TrackED_DB.deleteExam(currentActiveCourse, exNum);
                        }
                    }
                }
            });
        }

        if (saveExamScoresBtn) {
            saveExamScoresBtn.addEventListener("click", () => {
                const inputs = examTableBody.querySelectorAll(".score-num-input");
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const exNum = inp.getAttribute("data-exam-num");
                    const val = inp.value.trim();
                    if (!currentExamScores[sId]) currentExamScores[sId] = {};
                    currentExamScores[sId][exNum] = val === "" ? "" : Number(val);
                });
                saveExamScoresData();

                // Sync exam scores to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveExamScores === "function") {
                    window.TrackED_DB.saveExamScores(currentActiveCourse, currentExamScores);
                }

                const studentStorageKey = `tracked_exams_${currentActiveCourse.trim().toLowerCase()}`;
                const syncRecords = currentExams.map(ex => {
                    const repStudent = enrolledStudents[0] || { id: "2024-00123" };
                    const sc = currentExamScores[repStudent.id]?.[ex.num] !== undefined
                        ? currentExamScores[repStudent.id][ex.num]
                        : "";
                    return {
                        number: ex.name,
                        date: "September 2026",
                        score: sc !== "" ? `${sc}/${ex.maxScore}` : `0/${ex.maxScore}`
                    };
                });
                localStorage.setItem(studentStorageKey, JSON.stringify(syncRecords));

                const origHtml = saveExamScoresBtn.innerHTML;
                saveExamScoresBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Scores Saved!`;
                saveExamScoresBtn.style.backgroundColor = "#059669";

                if (examAlertSuccess && examAlertSuccessMsg) {
                    examAlertSuccessMsg.textContent = "All student exam scores have been saved successfully!";
                    examAlertSuccess.style.display = "flex";
                }

                setTimeout(() => {
                    saveExamScoresBtn.innerHTML = origHtml;
                    saveExamScoresBtn.style.backgroundColor = "";
                    if (examAlertSuccess) examAlertSuccess.style.display = "none";
                }, 2000);
            });
        }
    }

    // =========================================
    // 4. TEACHER ATTENDANCE MANAGEMENT
    // =========================================
    const attendanceDateInput   = document.getElementById("attendanceDate");
    const saveAttendanceBtn     = document.getElementById("saveAttendanceBtn");
    const attendanceTableBody   = document.getElementById("attendanceTableBody") || document.querySelector(".attendance-card tbody");
    const attendanceDateBadge   = document.getElementById("attendanceDateBadge");
    const attendanceAlertBanner = document.getElementById("attendanceAlertBanner");
    const attendanceAlertMsg    = document.getElementById("attendanceAlertMsg");

    if (attendanceTableBody && attendanceDateInput) {
        const enrolledStudents     = getEnrolledStudentsForCourse(currentActiveCourse);
        const attendanceStorageKey = `tracked_course_attendance_${currentActiveCourse}`;
        const studentHistoryKey    = `tracked_attendance_${currentActiveCourse.trim().toLowerCase()}`;

        function getAllAttendanceRecords() {
            const raw = localStorage.getItem(attendanceStorageKey);
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let attendanceMap = getAllAttendanceRecords();

        function saveAllAttendanceRecords() {
            localStorage.setItem(attendanceStorageKey, JSON.stringify(attendanceMap));
        }

        function formatDisplayDate(dateStr) {
            if (!dateStr) return "";
            try {
                const parts = dateStr.split("-");
                if (parts.length === 3) {
                    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    return dateObj.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
                }
            } catch (e) {}
            return dateStr;
        }

        function updateSelectStatusClass(selectEl) {
            selectEl.classList.remove("status-present", "status-late", "status-absent");
            const val = selectEl.value;
            if (val === "late") {
                selectEl.classList.add("status-late");
            } else if (val === "absent") {
                selectEl.classList.add("status-absent");
            } else {
                selectEl.classList.add("status-present");
            }
        }

        // Render attendance table for a given date
        function loadAttendanceForDate(dateStr) {
            const hasRecord = Boolean(attendanceMap[dateStr]);
            const dayRecord = attendanceMap[dateStr] || {};

            // Update date badge
            if (attendanceDateBadge) {
                if (hasRecord) {
                    attendanceDateBadge.className = "attendance-date-badge recorded";
                    attendanceDateBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Recorded`;
                } else {
                    attendanceDateBadge.className = "attendance-date-badge new";
                    attendanceDateBadge.innerHTML = `<i class="fa-solid fa-pen"></i> New Date`;
                }
            }

            // Show info banner if loading a previously recorded date
            if (attendanceAlertBanner && attendanceAlertMsg) {
                if (hasRecord) {
                    attendanceAlertBanner.className = "modal-alert info";
                    attendanceAlertBanner.style.display = "flex";
                    attendanceAlertMsg.textContent = `Showing recorded attendance for ${formatDisplayDate(dateStr)}. You can update and click Save Attendance.`;
                } else {
                    attendanceAlertBanner.style.display = "none";
                }
            }

            // Render students
            attendanceTableBody.innerHTML = "";
            if (enrolledStudents.length === 0) {
                attendanceTableBody.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #94a3b8; padding: 25px;">
                            No students enrolled in this course yet.
                        </td>
                    </tr>
                `;
                return;
            }

            [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b))).forEach(st => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-student-id", st.id);
                // If hasRecord, use saved status; otherwise reset to "present"
                const currentStatus = (hasRecord && dayRecord[st.id]) ? dayRecord[st.id] : "present";

                tr.innerHTML = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                    <td>
                        <select class="attendance-select" data-student-id="${escapeHtml(st.id)}">
                            <option value="present" ${currentStatus === "present" ? "selected" : ""}>Present</option>
                            <option value="late" ${currentStatus === "late" ? "selected" : ""}>Late</option>
                            <option value="absent" ${currentStatus === "absent" ? "selected" : ""}>Absent</option>
                        </select>
                    </td>
                `;
                attendanceTableBody.appendChild(tr);

                const selectEl = tr.querySelector(".attendance-select");
                if (selectEl) {
                    updateSelectStatusClass(selectEl);
                    selectEl.addEventListener("change", () => {
                        updateSelectStatusClass(selectEl);
                    });
                }
            });
        }

        // Set default date to today
        if (!attendanceDateInput.value) {
            const today = new Date().toISOString().split("T")[0];
            attendanceDateInput.value = today;
        }

        // Load initial date
        loadAttendanceForDate(attendanceDateInput.value);

        // When teacher picks or navigates any date using the date selector:
        attendanceDateInput.addEventListener("change", () => {
            const chosenDate = attendanceDateInput.value;
            if (chosenDate) {
                loadAttendanceForDate(chosenDate);
            }
        });

        // Save Attendance button handler
        if (saveAttendanceBtn) {
            saveAttendanceBtn.addEventListener("click", () => {
                const dateKey = attendanceDateInput.value;
                if (!dateKey) {
                    alert("Please select a date first.");
                    return;
                }

                const selects = attendanceTableBody.querySelectorAll(".attendance-select");
                const dayStatusMap = {};
                let lateCount = 0;
                let absentCount = 0;

                selects.forEach(sel => {
                    const stId = sel.getAttribute("data-student-id");
                    const stVal = sel.value; // "present" | "late" | "absent"
                    dayStatusMap[stId] = stVal;
                    if (stVal === "late") lateCount++;
                    if (stVal === "absent") absentCount++;
                });

                // Save for this date
                attendanceMap[dateKey] = dayStatusMap;
                saveAllAttendanceRecords();

                // Sync to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveAttendanceToCloud === "function") {
                    window.TrackED_DB.saveAttendanceToCloud(currentActiveCourse, dateKey, dayStatusMap);
                }

                // Sync ONLY Late and Absent records into the student portal attendance history
                const studentHistoryRecords = [];
                const sortedDates = Object.keys(attendanceMap).sort().reverse();
                sortedDates.forEach(d => {
                    const stMap = attendanceMap[d];
                    const repStudent = enrolledStudents[0] || { id: "2024-00123" };
                    const status = stMap[repStudent.id];
                    // Only record late and absent!
                    if (status === "late" || status === "absent") {
                        studentHistoryRecords.push({
                            date: formatDisplayDate(d),
                            status: status === "late" ? "Late" : "Absent"
                        });
                    }
                });
                localStorage.setItem(studentHistoryKey, JSON.stringify(studentHistoryRecords));

                // Update badge to Recorded
                if (attendanceDateBadge) {
                    attendanceDateBadge.className = "attendance-date-badge recorded";
                    attendanceDateBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Recorded`;
                }

                // Show success feedback
                const origHtml = saveAttendanceBtn.innerHTML;
                saveAttendanceBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Attendance Saved!`;
                saveAttendanceBtn.style.backgroundColor = "#059669";

                if (attendanceAlertBanner && attendanceAlertMsg) {
                    attendanceAlertBanner.className = "modal-alert success";
                    attendanceAlertBanner.style.display = "flex";
                    const summaryMsg = (lateCount === 0 && absentCount === 0)
                        ? "All students marked Present!"
                        : `Recorded: ${absentCount > 0 ? absentCount + " Absent" : ""}${absentCount > 0 && lateCount > 0 ? ", " : ""}${lateCount > 0 ? lateCount + " Late" : ""}`;
                    attendanceAlertMsg.textContent = `Attendance for ${formatDisplayDate(dateKey)} saved successfully! (${summaryMsg})`;
                }

                setTimeout(() => {
                    saveAttendanceBtn.innerHTML = origHtml;
                    saveAttendanceBtn.style.backgroundColor = "";
                }, 2000);
            });
        }
    }

    // =========================================
    // FIRST TIME LOGIN: DEFAULT PASSWORD WARNING POPUP (TEACHER)
    // =========================================
    const teacherPwdChanged   = localStorage.getItem("tracked_teacher_password_changed") === "true";
    const teacherPwdDismissed = sessionStorage.getItem("tracked_teacher_pwd_dismissed") === "true";
    const pwdWarningOverlay   = document.getElementById("pwdWarningOverlay");
    const pwdWarningClose     = document.getElementById("pwdWarningClose");
    const pwdWarningLaterBtn  = document.getElementById("pwdWarningLaterBtn");

    if (!teacherPwdChanged && !teacherPwdDismissed && pwdWarningOverlay) {
        setTimeout(() => {
            pwdWarningOverlay.classList.add("show");
        }, 500);
    }

    function dismissTeacherPwdWarning() {
        if (pwdWarningOverlay) {
            pwdWarningOverlay.classList.remove("show");
        }
        sessionStorage.setItem("tracked_teacher_pwd_dismissed", "true");
    }

    if (pwdWarningClose)    pwdWarningClose.addEventListener("click", dismissTeacherPwdWarning);
    if (pwdWarningLaterBtn) pwdWarningLaterBtn.addEventListener("click", dismissTeacherPwdWarning);
    if (pwdWarningOverlay) {
        pwdWarningOverlay.addEventListener("click", (e) => {
            if (e.target === pwdWarningOverlay) dismissTeacherPwdWarning();
        });
    }
});


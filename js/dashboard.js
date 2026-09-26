document.addEventListener("DOMContentLoaded", () => {
    // Mark current session as student
    localStorage.setItem("tracked_user_role", "student");

    // =========================================
    // LOAD CURRENT LOGGED-IN STUDENT PROFILE
    // =========================================
    const currentStudentName = localStorage.getItem("tracked_student_name") || "Billie Eilish";
    const currentStudentId   = localStorage.getItem("tracked_student_id") || "2024-00123";
    const rawProgram         = localStorage.getItem("tracked_student_program") || "BS Computer Science • 2nd Year";
    
    let displayProgram = "BS Computer Science";
    let displayYear    = "2nd Year";
    if (rawProgram.includes("•")) {
        const parts = rawProgram.split("•").map(p => p.trim());
        displayProgram = parts[0] || displayProgram;
        displayYear    = parts[1] || displayYear;
    } else {
        displayProgram = rawProgram;
    }

    const headerStudentName   = document.getElementById("headerStudentName");
    const popupStudentId      = document.getElementById("popupStudentId");
    const popupStudentName    = document.getElementById("popupStudentName");
    const popupStudentProgram = document.getElementById("popupStudentProgram");
    const popupStudentYear    = document.getElementById("popupStudentYear");

    if (headerStudentName)   headerStudentName.textContent = currentStudentName;
    if (popupStudentId)      popupStudentId.textContent    = currentStudentId;
    if (popupStudentName)    popupStudentName.textContent  = currentStudentName;
    if (popupStudentProgram) popupStudentProgram.textContent = displayProgram;
    if (popupStudentYear)    popupStudentYear.textContent    = displayYear;

    // Per-student avatar resolution:
    // If student uploaded photo -> use it.
    // If demo student 2024-00123 -> profile.jpg.
    // All newly created students -> clean blank white profile (default-avatar.svg).
    const headerProfileImg = document.getElementById("headerProfileImg");
    const popupProfileImg  = document.getElementById("popupProfileImg");
    const currentSidKey    = (currentStudentId || "").trim().toLowerCase();
    const studentAvatar    = localStorage.getItem(`tracked_student_avatar_${currentSidKey}`) ||
                             (currentStudentId === "2024-00123" ? "images/profile.jpg" : "images/default-avatar.svg");

    if (headerProfileImg) headerProfileImg.src = studentAvatar;
    if (popupProfileImg)  popupProfileImg.src  = studentAvatar;

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
    // PROFILE POPUP
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
    // ENROLLED COURSES FOR STUDENT
    // =========================================
    const studentCoursesGrid = document.getElementById("studentCoursesGrid");

    function getEnrolledCourses() {
        const sid = (currentStudentId || "").trim().toLowerCase();

        let teacherCourses = [];
        try {
            teacherCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
        } catch (e) {}

        const deletedCourses = JSON.parse(localStorage.getItem("tracked_deleted_courses") || "[]").map(d => d.toLowerCase());

        // Purge orphan enrollment keys ONLY if we have an active list of valid courses
        const validCourseNames = new Set(teacherCourses.map(c => (c.name || "").trim().toLowerCase()));
        if (validCourseNames.size > 0) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith("tracked_enrolled_")) {
                    const cName = k.replace("tracked_enrolled_", "").trim().toLowerCase();
                    if (!validCourseNames.has(cName)) {
                        localStorage.removeItem(k);
                    }
                }
            });
        }

        // Check which courses THIS student is actually enrolled in
        const enrolledCourses = [];
        teacherCourses.forEach(c => {
            if (!c.name) return;
            const cLower = c.name.trim().toLowerCase();
            if (deletedCourses.includes(cLower)) return;

            const enrollKey = `tracked_enrolled_${c.name}`;
            let enrollList = [];
            const raw = localStorage.getItem(enrollKey);
            if (raw) {
                try { enrollList = JSON.parse(raw) || []; } catch(e) {}
            }
            const isEnrolled = enrollList.some(s => s.id && s.id.trim().toLowerCase() === sid);
            if (isEnrolled) {
                enrolledCourses.push({
                    code: c.code || "CS",
                    name: c.name,
                    instructor: "Prof. Billie Eilish",
                    icon: "fa-graduation-cap",
                    colorClass: "tab-course"
                });
            }
        });

        return enrolledCourses;
    }

    function renderStudentCourses(customCoursesList) {
        if (!studentCoursesGrid) return;

        const courses = Array.isArray(customCoursesList) ? customCoursesList : getEnrolledCourses();
        studentCoursesGrid.innerHTML = "";

        if (courses.length === 0) {
            studentCoursesGrid.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 40px; width: 100%;">
                    <i class="fa-solid fa-folder-open" style="font-size: 40px; margin-bottom: 12px; color: #94a3b8;"></i>
                    <h3>No Enrolled Courses Found</h3>
                    <p style="font-size: 14px; margin-top: 6px;">Your instructor has not enrolled you in any active courses yet.</p>
                </div>
            `;
            return;
        }

        courses.forEach(course => {
            const card = document.createElement("a");
            card.href = "Student_Pages/Course.html";
            card.className = `tab-card ${course.colorClass || "tab-course"}`;
            card.setAttribute("data-course-name", course.name);
            card.setAttribute("data-course-code", course.code || "");
            card.setAttribute("data-instructor", course.instructor || "Prof. Billie Eilish");

            card.innerHTML = `
                <div class="tab-icon">
                    <i class="fa-solid ${course.icon || "fa-graduation-cap"}"></i>
                </div>
                <div class="tab-info">
                    <h3>${escapeHtml(course.name)}</h3>
                    <p>${escapeHtml(course.code ? course.code + " • " : "")}${escapeHtml(course.instructor || "Instructor")}</p>
                </div>
                <i class="fa-solid fa-arrow-right tab-arrow"></i>
            `;

            studentCoursesGrid.appendChild(card);
        });
    }

    // Save selected course when clicking any course card
    if (studentCoursesGrid) {
        studentCoursesGrid.addEventListener("click", (e) => {
            const card = e.target.closest(".tab-card");
            if (card) {
                const cName = card.getAttribute("data-course-name");
                const cCode = card.getAttribute("data-course-code");
                const cInst = card.getAttribute("data-instructor");

                if (cName) {
                    localStorage.setItem("tracked_student_selected_course", cName);
                    localStorage.setItem("tracked_student_selected_course_code", cCode || "");
                    localStorage.setItem("tracked_student_selected_instructor", cInst || "Prof. Billie Eilish");
                }
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    async function loadStudentCourses() {
        // 1. Initial render from local cache so the dashboard renders immediately
        const localCourses = getEnrolledCourses();
        if (localCourses.length > 0) {
            renderStudentCourses(localCourses);
        } else {
            // Show subtle spinner if cache is initially empty on a fresh browser
            if (studentCoursesGrid) {
                studentCoursesGrid.innerHTML = `
                    <div style="text-align: center; color: #64748b; padding: 40px; width: 100%;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 36px; margin-bottom: 12px; color: #3b82f6;"></i>
                        <p style="font-size: 14px; color: #64748b;">Loading your enrolled courses...</p>
                    </div>
                `;
            }
        }

        // 2. Fetch directly from Supabase Cloud in real-time
        if (window.TrackED_DB && typeof window.TrackED_DB.getStudentEnrolledCourses === "function") {
            try {
                const sid = (currentStudentId || "").trim();
                const cloudCourses = await window.TrackED_DB.getStudentEnrolledCourses(sid);
                if (cloudCourses && cloudCourses.length > 0) {
                    try {
                        let teacherCourses = JSON.parse(localStorage.getItem("tracked_teacher_courses") || "[]");
                        cloudCourses.forEach(cc => {
                            if (!teacherCourses.some(tc => tc.name && tc.name.trim().toLowerCase() === cc.name.trim().toLowerCase())) {
                                teacherCourses.push({ code: cc.code, name: cc.name });
                            }
                            const enrollKey = `tracked_enrolled_${cc.name}`;
                            let enrollList = JSON.parse(localStorage.getItem(enrollKey) || "[]");
                            if (!enrollList.some(s => s.id && s.id.trim().toLowerCase() === sid.toLowerCase())) {
                                enrollList.push({
                                    id: sid,
                                    name: currentStudentName
                                });
                                localStorage.setItem(enrollKey, JSON.stringify(enrollList));
                            }
                        });
                        localStorage.setItem("tracked_teacher_courses", JSON.stringify(teacherCourses));
                    } catch (e) {}

                    renderStudentCourses(cloudCourses);
                    return;
                }
            } catch (err) {
                console.warn("[Dashboard] Error fetching cloud courses for student:", err);
            }
        }

        renderStudentCourses();
    }

    // Load enrolled courses (local + cloud)
    loadStudentCourses();

    // Re-render when background two-way sync finishes
    window.addEventListener("tracked_sync_completed", () => {
        loadStudentCourses();
    });

    // =========================================
    // FIRST TIME LOGIN: DEFAULT PASSWORD WARNING POPUP
    // =========================================
    const sidKey              = (currentStudentId || "").trim().toLowerCase();
    const studentPwdChanged   = localStorage.getItem("tracked_student_password_changed") === "true" ||
                                localStorage.getItem(`tracked_student_pwd_changed_${sidKey}`) === "true";
    const studentPwdDismissed = sessionStorage.getItem("tracked_student_pwd_dismissed") === "true";
    const pwdWarningOverlay   = document.getElementById("pwdWarningOverlay");
    const pwdWarningClose     = document.getElementById("pwdWarningClose");
    const pwdWarningLaterBtn  = document.getElementById("pwdWarningLaterBtn");

    if (!studentPwdChanged && !studentPwdDismissed && pwdWarningOverlay) {
        setTimeout(() => {
            pwdWarningOverlay.classList.add("show");
        }, 500);
    }

    function dismissStudentPwdWarning() {
        if (pwdWarningOverlay) {
            pwdWarningOverlay.classList.remove("show");
        }
        sessionStorage.setItem("tracked_student_pwd_dismissed", "true");
    }

    if (pwdWarningClose)    pwdWarningClose.addEventListener("click", dismissStudentPwdWarning);
    if (pwdWarningLaterBtn) pwdWarningLaterBtn.addEventListener("click", dismissStudentPwdWarning);
    if (pwdWarningOverlay) {
        pwdWarningOverlay.addEventListener("click", (e) => {
            if (e.target === pwdWarningOverlay) dismissStudentPwdWarning();
        });
    }
});
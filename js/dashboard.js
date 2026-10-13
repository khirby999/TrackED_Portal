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
        const enrolledCourses = [];

        // 1. Check student-scoped cached course list first
        const studentScoped = localStorage.getItem(`tracked_student_courses_${sid}`);
        if (studentScoped !== null) {
            try {
                const list = JSON.parse(studentScoped);
                if (Array.isArray(list)) {
                    return list;
                }
            } catch(e) {}
        }

        // 2. Fallback: inspect tracked_enrolled_* keys in localStorage
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith("tracked_enrolled_")) {
                const courseName = k.replace("tracked_enrolled_", "").trim();
                if (!courseName) return;
                try {
                    const enrollList = JSON.parse(localStorage.getItem(k) || "[]");
                    if (Array.isArray(enrollList) && enrollList.some(s => s && s.id && s.id.trim().toLowerCase() === sid)) {
                        enrolledCourses.push({
                            code: "CS",
                            name: courseName,
                            instructor: "Instructor",
                            icon: "fa-graduation-cap",
                            colorClass: "tab-course"
                        });
                    }
                } catch(e) {}
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
            card.setAttribute("data-instructor", course.instructor || "Instructor");

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
                    localStorage.setItem("tracked_student_selected_instructor", cInst || "Instructor");
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
                const sidLower = sid.toLowerCase();
                const cloudCourses = await window.TrackED_DB.getStudentEnrolledCourses(sid);
                
                if (Array.isArray(cloudCourses)) {
                    const studentCourseList = cloudCourses.map(cc => ({
                        code: cc.code || "CS",
                        name: cc.name,
                        instructor: cc.instructor || "Instructor",
                        icon: "fa-graduation-cap",
                        colorClass: "tab-course"
                    }));

                    // Save to student-scoped cache (reflects cloud truth 1:1, including empty list if all courses deleted)
                    localStorage.setItem(`tracked_student_courses_${sidLower}`, JSON.stringify(studentCourseList));

                    // Clean up any stale tracked_enrolled keys for courses student is no longer in
                    const activeCloudNames = new Set(cloudCourses.map(c => (c.name || "").trim().toLowerCase()));
                    Object.keys(localStorage).forEach(k => {
                        if (k.startsWith("tracked_enrolled_")) {
                            const cName = k.replace("tracked_enrolled_", "").trim().toLowerCase();
                            if (!activeCloudNames.has(cName)) {
                                try {
                                    let enrollList = JSON.parse(localStorage.getItem(k) || "[]");
                                    if (Array.isArray(enrollList)) {
                                        const filtered = enrollList.filter(s => s && s.id && s.id.trim().toLowerCase() !== sidLower);
                                        if (filtered.length !== enrollList.length) {
                                            localStorage.setItem(k, JSON.stringify(filtered));
                                        }
                                    }
                                } catch(e) {}
                            }
                        }
                    });

                    cloudCourses.forEach(cc => {
                        const enrollKey = `tracked_enrolled_${cc.name}`;
                        let enrollList = [];
                        try { enrollList = JSON.parse(localStorage.getItem(enrollKey) || "[]"); } catch(e) {}
                        if (!enrollList.some(s => s.id && s.id.trim().toLowerCase() === sidLower)) {
                            enrollList.push({
                                id: sid,
                                name: currentStudentName
                            });
                            localStorage.setItem(enrollKey, JSON.stringify(enrollList));
                        }
                    });

                    renderStudentCourses(studentCourseList);
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

    // Real-time multi-tab sync: if teacher deletes/modifies course in another tab, update student immediately
    window.addEventListener("storage", (e) => {
        if (!e.key) return;
        const sidLower = (currentStudentId || "").trim().toLowerCase();
        if (e.key === `tracked_student_courses_${sidLower}` || e.key.startsWith("tracked_enrolled_")) {
            loadStudentCourses();
        }
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
document.addEventListener("DOMContentLoaded", () => {
    // 0. Session & Role Verification Guard
    const userRole = localStorage.getItem("tracked_user_role");
    const currentTeacherId = localStorage.getItem("tracked_teacher_id");
    if (userRole !== "teacher" || !currentTeacherId) {
        window.location.href = "../index.html";
        return;
    }

    // =========================================
    // LOAD LOGGED-IN TEACHER PROFILE & AVATAR
    // =========================================
    const currentTeacherName = localStorage.getItem("tracked_teacher_name") || "Faculty";
    const currentTeacherDept = localStorage.getItem("tracked_teacher_dept") || "College of Computer Studies";
    const currentTidKey      = currentTeacherId.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const defaultTeacherAvatar = "../images/default-avatar.svg";

    // Course helpers scoped to active teacher ID
    function getTeacherCourses() {
        const scoped = localStorage.getItem(`tracked_teacher_courses_${currentTidKey}`);
        if (scoped !== null) {
            try { return JSON.parse(scoped) || []; } catch(e) {}
        }
        return [];
    }

    function saveTeacherCourses(courses) {
        localStorage.setItem(`tracked_teacher_courses_${currentTidKey}`, JSON.stringify(courses));
        localStorage.setItem("tracked_teacher_courses", JSON.stringify(courses));
    }

    // Shared Date & HTML helpers
    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        const div = document.createElement("div");
        div.textContent = String(str);
        return div.innerHTML;
    }

    // =========================================
    // CUSTOM MODAL POPUP ALERT SYSTEM (Instructor UI)
    // Small window pop-up in center of screen
    // =========================================
    function ensureTrackedAlertStyles() {
        if (document.getElementById("trackedAlertStyles")) return;
        const style = document.createElement("style");
        style.id = "trackedAlertStyles";
        style.textContent = `
            .tracked-alert-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.52);
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                box-sizing: border-box;
                animation: trackedAlertFadeIn 0.18s ease-out;
            }
            .tracked-alert-box {
                background: #ffffff;
                border-radius: 18px;
                width: 100%;
                max-width: 360px;
                padding: 24px 22px 20px;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06);
                position: relative;
                text-align: center;
                box-sizing: border-box;
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                animation: trackedAlertPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .tracked-alert-close-btn {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: #f1f5f9;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-size: 13px;
                transition: all 0.2s ease;
                outline: none;
            }
            .tracked-alert-close-btn:hover {
                background: #e2e8f0;
                color: #0f172a;
                transform: rotate(90deg);
            }
            .tracked-alert-icon-badge {
                width: 48px;
                height: 48px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 14px;
                font-size: 22px;
            }
            .tracked-alert-icon-badge.warning {
                background: #fef3c7;
                color: #d97706;
                border: 1px solid #fde68a;
            }
            .tracked-alert-icon-badge.info {
                background: #eff6ff;
                color: #2563eb;
                border: 1px solid #bfdbfe;
            }
            .tracked-alert-icon-badge.danger {
                background: #fee2e2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }
            .tracked-alert-icon-badge.success {
                background: #dcfce7;
                color: #16a34a;
                border: 1px solid #bbf7d0;
            }
            .tracked-alert-title {
                font-size: 17px;
                font-weight: 600;
                color: #0f172a;
                margin: 0 0 6px;
                line-height: 1.3;
            }
            .tracked-alert-msg {
                font-size: 13px;
                color: #475569;
                line-height: 1.5;
                margin: 0 0 18px;
                word-wrap: break-word;
            }
            .tracked-alert-ok-btn {
                width: 100%;
                height: 40px;
                background: #2563eb;
                color: #ffffff;
                border: none;
                border-radius: 10px;
                font-size: 13.5px;
                font-weight: 600;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                outline: none;
            }
            .tracked-alert-ok-btn:hover {
                background: #1d4ed8;
                box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
                transform: translateY(-1px);
            }
            .tracked-alert-ok-btn:focus-visible {
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4);
            }
            @keyframes trackedAlertFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes trackedAlertPopIn {
                from {
                    opacity: 0;
                    transform: scale(0.92) translateY(-8px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function showTrackedAlert(message, title, type) {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", () => showTrackedAlert(message, title, type));
            return;
        }

        ensureTrackedAlertStyles();

        const existing = document.getElementById("trackedAlertOverlay");
        if (existing) existing.remove();

        const msgStr = String(message || "");
        let alertType = type;
        let alertTitle = title;
        let iconHtml = '<i class="fa-solid fa-circle-info"></i>';

        if (!alertType) {
            if (/saturday|sunday|weekend/i.test(msgStr)) {
                alertType = "warning";
                alertTitle = alertTitle || "Class Schedule Notice";
                iconHtml = '<i class="fa-solid fa-calendar-xmark"></i>';
            } else if (/prior to|future|cannot record/i.test(msgStr)) {
                alertType = "warning";
                alertTitle = alertTitle || "Date Restriction";
                iconHtml = '<i class="fa-solid fa-calendar-day"></i>';
            } else if (/locked|saved|already/i.test(msgStr)) {
                alertType = "info";
                alertTitle = alertTitle || "Record Notice";
                iconHtml = '<i class="fa-solid fa-lock"></i>';
            } else if (/error|failed|invalid/i.test(msgStr)) {
                alertType = "danger";
                alertTitle = alertTitle || "Notice";
                iconHtml = '<i class="fa-solid fa-circle-exclamation"></i>';
            } else {
                alertType = "info";
                alertTitle = alertTitle || "Notice";
                iconHtml = '<i class="fa-solid fa-circle-info"></i>';
            }
        } else {
            if (alertType === "warning") {
                iconHtml = /saturday|sunday/i.test(msgStr) ? '<i class="fa-solid fa-calendar-xmark"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
            } else if (alertType === "danger") {
                iconHtml = '<i class="fa-solid fa-circle-exclamation"></i>';
            } else if (alertType === "success") {
                iconHtml = '<i class="fa-solid fa-circle-check"></i>';
            } else {
                iconHtml = '<i class="fa-solid fa-circle-info"></i>';
            }
            alertTitle = alertTitle || "Notice";
        }

        const overlay = document.createElement("div");
        overlay.className = "tracked-alert-overlay";
        overlay.id = "trackedAlertOverlay";

        overlay.innerHTML = `
            <div class="tracked-alert-box" role="dialog" aria-modal="true">
                <button type="button" class="tracked-alert-close-btn" id="trackedAlertCloseBtn" title="Close" aria-label="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="tracked-alert-icon-badge ${escapeHtml(alertType)}">
                    ${iconHtml}
                </div>
                <h3 class="tracked-alert-title">${escapeHtml(alertTitle)}</h3>
                <p class="tracked-alert-msg">${escapeHtml(msgStr)}</p>
                <button type="button" class="tracked-alert-ok-btn" id="trackedAlertOkBtn">
                    Got it
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        function closeAlert() {
            document.removeEventListener("keydown", keyHandler);
            overlay.remove();
        }

        function keyHandler(e) {
            if (e.key === "Escape" || e.key === "Enter") {
                e.preventDefault();
                closeAlert();
            }
        }

        const okBtn = overlay.querySelector("#trackedAlertOkBtn");
        const closeBtn = overlay.querySelector("#trackedAlertCloseBtn");

        if (okBtn) okBtn.addEventListener("click", closeAlert);
        if (closeBtn) closeBtn.addEventListener("click", closeAlert);

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeAlert();
        });

        document.addEventListener("keydown", keyHandler);

        setTimeout(() => {
            if (okBtn) okBtn.focus();
        }, 50);
    }

    // Override browser window.alert so all alerts render as modern small window popups
    window.alert = function(msg) {
        showTrackedAlert(msg);
    };
    function getTodayLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function formatDisplayDate(dateStr) {
        if (!dateStr) return "";
        try {
            const parts = String(dateStr).trim().split("-");
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const dateObj = new Date(y, m, d);
                return dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            }
        } catch (e) {}
        return dateStr;
    }

    function getDayOfWeek(dateStr) {
        if (!dateStr) return -1;
        const parts = String(dateStr).trim().split("-");
        if (parts.length !== 3) return -1;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        return dt.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    }

    function isSaturday(dateStr) {
        return getDayOfWeek(dateStr) === 6;
    }

    function isSunday(dateStr) {
        return getDayOfWeek(dateStr) === 0;
    }

    function getLatestValidClassDate(referenceDateStr) {
        let baseStr = referenceDateStr || getTodayLocalDate();
        let parts = baseStr.split("-");
        if (parts.length !== 3) return getTodayLocalDate();
        let dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (dt.getDay() === 6) {
            dt.setDate(dt.getDate() - 1); // Saturday -> Friday
        } else if (dt.getDay() === 0) {
            dt.setDate(dt.getDate() - 2); // Sunday -> Friday
        }
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const d = String(dt.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function getCourseCreationDate(cName) {
        if (!cName) return getTodayLocalDate();
        const cleanName = cName.trim();
        // 1. Check scoped local key
        let d = localStorage.getItem(`tracked_course_created_${currentTidKey}_${cleanName}`) ||
                localStorage.getItem(`tracked_course_created_${cleanName}`);
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

        // 2. Check courses array
        const courses = getTeacherCourses();
        const c = courses.find(item => item.name && item.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (c && (c.createdAt || c.created_at)) {
            const str = String(c.createdAt || c.created_at).substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                localStorage.setItem(`tracked_course_created_${currentTidKey}_${cleanName}`, str);
                return str;
            }
        }

        // 3. Check earliest attendance record if any exists
        let attRaw = localStorage.getItem(`tracked_course_attendance_${currentTidKey}_${cleanName}`) ||
                     localStorage.getItem(`tracked_course_attendance_${cleanName}`);
        if (attRaw) {
            try {
                const attObj = JSON.parse(attRaw) || {};
                const validDates = Object.keys(attObj).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
                if (validDates.length > 0) {
                    const earliest = validDates[0];
                    localStorage.setItem(`tracked_course_created_${currentTidKey}_${cleanName}`, earliest);
                    return earliest;
                }
            } catch (e) {}
        }

        // 4. Fallback to today and lock it in
        const todayStr = getTodayLocalDate();
        localStorage.setItem(`tracked_course_created_${currentTidKey}_${cleanName}`, todayStr);
        if (c) {
            c.createdAt = todayStr;
            saveTeacherCourses(courses);
        }
        return todayStr;
    }

    // Shared PDF / Printable Academic Report Generator (Native Print & Save as PDF)
    function printAcademicReport({
        reportTitle,
        assessmentName,
        dateStr,
        courseCode,
        courseName,
        instructorName,
        headers,
        rows
    }) {
        const displayDate = formatDisplayDate(dateStr) || dateStr || getTodayLocalDate();
        const fullCourse = `${courseCode ? escapeHtml(courseCode) + " - " : ""}${escapeHtml(courseName || "Course")}`;
        const teacherNameText = escapeHtml(instructorName || currentTeacherName || "Faculty Instructor");

        const thCells = headers.map(h => `<th>${escapeHtml(h)}</th>`).join("");
        const trRows = rows.map(r => {
            return `<tr>${r.map((cell, idx) => {
                const isHtml = typeof cell === "string" && (cell.includes("<span") || cell.includes("<strong"));
                const alignClass = idx === 0 ? " class='text-center'" : "";
                return `<td${alignClass}>${isHtml ? cell : escapeHtml(cell)}</td>`;
            }).join("")}</tr>`;
        }).join("");

        const reportStyles = `
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 24px;
                background: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                font-size: 13px;
                line-height: 1.4;
            }
            .report-container {
                max-width: 820px;
                margin: 0 auto;
                background: #ffffff;
            }
            .report-header {
                text-align: center;
                border-bottom: 2px solid #1e3a8a;
                padding-bottom: 12px;
                margin-bottom: 16px;
            }
            .report-header .inst-title {
                font-size: 19px;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: #1e3a8a;
                margin: 0;
            }
            .report-header .doc-title {
                font-size: 15px;
                font-weight: 700;
                color: #0f172a;
                margin: 6px 0 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .report-meta-box {
                margin-bottom: 16px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                padding: 12px 16px;
                background: #f8fafc;
            }
            .meta-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .meta-row:last-child {
                margin-bottom: 0;
            }
            .meta-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
            }
            .meta-label {
                font-weight: 700;
                color: #334155;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            .meta-val {
                font-weight: 600;
                color: #0f172a;
            }
            .meta-line {
                display: inline-block;
                border-bottom: 1.5px solid #334155;
                min-width: 170px;
                height: 14px;
            }
            table.report-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
                margin-bottom: 16px;
            }
            table.report-table th, table.report-table td {
                border: 1px solid #94a3b8;
                padding: 7px 10px;
                font-size: 12px;
                text-align: left;
            }
            table.report-table th {
                background: #1e3a8a;
                color: #ffffff;
                font-weight: 700;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            table.report-table tr:nth-child(even) td {
                background: #f8fafc;
            }
            .text-center {
                text-align: center;
            }
            .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .badge-present { background: #dcfce7; color: #15803d; }
            .badge-late    { background: #fef3c7; color: #b45309; }
            .badge-absent  { background: #fee2e2; color: #dc2626; }
            .badge-dropped { background: #f1f5f9; color: #64748b; }
            .badge-score   { font-weight: 700; color: #1e3a8a; }
            .date-bar {
                font-size: 12px;
                font-weight: 600;
                color: #334155;
                padding: 8px 12px;
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                margin-bottom: 30px;
            }
            .signature-block {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                page-break-inside: avoid;
            }
            .signature-box {
                width: 250px;
                text-align: center;
            }
            .sig-line {
                border-bottom: 1.5px solid #0f172a;
                margin-bottom: 6px;
                height: 40px;
            }
            .sig-name {
                font-weight: 700;
                font-size: 13px;
            }
            .sig-role {
                font-size: 11px;
                color: #64748b;
            }
            @media print {
                @page {
                    size: letter portrait;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 15mm 18mm;
                    background: #ffffff;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print {
                    display: none !important;
                }
            }
        `;

        const reportContentInner = `
            <div class="report-header">
                <h1 class="inst-title">TrackED Academic Portal</h1>
                <div class="doc-title">${escapeHtml(reportTitle)}</div>
            </div>

            <div class="report-meta-box">
                <div class="meta-row">
                    <div class="meta-item">
                        <span class="meta-label">Date:</span>
                        <span class="meta-val">${displayDate}</span>
                    </div>
                    ${assessmentName ? `
                    <div class="meta-item">
                        <span class="meta-label">Assessment:</span>
                        <span class="meta-val">${escapeHtml(assessmentName)}</span>
                    </div>` : `
                    <div class="meta-item">
                        <span class="meta-label">Course:</span>
                        <span class="meta-val">${fullCourse}</span>
                    </div>`}
                </div>

                <div class="meta-row">
                    <div class="meta-item">
                        <span class="meta-label">Instructor Name:</span>
                        <span class="meta-val">${teacherNameText}</span>
                    </div>
                    ${assessmentName ? `
                    <div class="meta-item">
                        <span class="meta-label">Course:</span>
                        <span class="meta-val">${fullCourse}</span>
                    </div>` : `
                    <div class="meta-item">
                        <span class="meta-label">Record Type:</span>
                        <span class="meta-val">Daily Class Attendance</span>
                    </div>`}
                </div>

                <div class="meta-row">
                    <div class="meta-item">
                        <span class="meta-label">Program:</span>
                        <span class="meta-line"></span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Year Level:</span>
                        <span class="meta-line"></span>
                    </div>
                </div>
            </div>

            <table class="report-table">
                <thead>
                    <tr>${thCells}</tr>
                </thead>
                <tbody>
                    ${trRows}
                </tbody>
            </table>

            <div class="date-bar">
                <span>Date: ${displayDate}</span>
            </div>

            <div class="signature-block">
                <div class="signature-box">
                    <div class="sig-line"></div>
                    <div class="sig-name">${teacherNameText}</div>
                    <div class="sig-role">Instructor Signature over Printed Name</div>
                </div>
                <div class="signature-box">
                    <div class="sig-line"></div>
                    <div class="sig-role" style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 6px;">Dean of Engineering and Architecture</div>
                </div>
            </div>
        `;

        const fullPrintableHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(reportTitle)} - ${fullCourse}</title>
<style>
  ${reportStyles}
</style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; background: #1e3a8a; color: #ffffff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 14px rgba(0,0,0,0.2); z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: -24px -24px 20px -24px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">📄</span>
      <span style="font-size: 14px; font-weight: 600;">TrackED Report • Select <strong>"Save as PDF"</strong> in destination</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #10b981; color: #ffffff; border: none; padding: 9px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        🖨️ Print / Save as PDF
      </button>
      <button onclick="window.close()" style="background: #64748b; color: #ffffff; border: none; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
        ✕ Close
      </button>
    </div>
  </div>
  <div class="report-container">
    ${reportContentInner}
  </div>
</body>
</html>`;

        const printWin = window.open("", "_blank");
        if (printWin) {
            printWin.document.open();
            printWin.document.write(fullPrintableHtml);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => {
                try {
                    printWin.print();
                } catch(e) {
                    console.warn("Print preview auto trigger:", e);
                }
            }, 300);
        } else {
            showTrackedAlert("Pop-up window was blocked by your browser. Please allow pop-ups for TrackED to print or save reports as PDF.", "Pop-up Blocked", "warning");
        }
    }

    // Clean legacy blacklist to ensure deleted courses are never permanently hidden
    localStorage.removeItem("tracked_deleted_courses");

    // Clean blank avatar by default unless teacher explicitly uploaded a custom image
    let rawTeacherAvatar = localStorage.getItem(`tracked_teacher_avatar_${currentTidKey}`) ||
                          localStorage.getItem("tracked_teacher_avatar_data");
    if (rawTeacherAvatar && (rawTeacherAvatar.includes("profile.jpg") || rawTeacherAvatar === "profile.jpg")) {
        rawTeacherAvatar = null;
        localStorage.removeItem(`tracked_teacher_avatar_${currentTidKey}`);
        localStorage.removeItem("tracked_teacher_avatar_data");
    }
    const teacherAvatar = rawTeacherAvatar || defaultTeacherAvatar;

    // Header updates across all teacher pages
    const headerProfileImg  = document.getElementById("headerProfileImg");
    const headerTeacherName = document.getElementById("headerTeacherName");
    if (headerProfileImg)  headerProfileImg.src = teacherAvatar;
    if (headerTeacherName) headerTeacherName.textContent = currentTeacherName;

    // Popup profile card updates (on teacherDashboard.html)
    const popupProfileImg  = document.getElementById("popupProfileImg");
    const popupTeacherId   = document.getElementById("popupTeacherId");
    const popupTeacherName = document.getElementById("popupTeacherName");
    const popupTeacherDept = document.getElementById("popupTeacherDept");
    if (popupProfileImg)  popupProfileImg.src         = teacherAvatar;
    if (popupTeacherId)   popupTeacherId.textContent   = currentTeacherId;
    if (popupTeacherName) popupTeacherName.textContent = currentTeacherName;
    if (popupTeacherDept) popupTeacherDept.textContent = currentTeacherDept;

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
            teacherCourses = getTeacherCourses();
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
                let customCourses = getTeacherCourses();
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

            let customCourses = getTeacherCourses();

            const oldName = currentEditingCourseName;
            const oldCode = currentEditingCourseCode;

            // Find and update course in teacher courses
            const courseIdx = customCourses.findIndex(c => c.name && c.name.trim().toLowerCase() === oldName.toLowerCase());
            if (courseIdx > -1) {
                customCourses[courseIdx] = { code: newCode, name: newName };
            } else {
                customCourses.push({ code: newCode, name: newName });
            }
            saveTeacherCourses(customCourses);

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
                migrateKey(`tracked_course_activities_locked_${oldName}`, `tracked_course_activities_locked_${newName}`);
                migrateKey(`tracked_course_activities_locked_${currentTidKey}_${oldName}`, `tracked_course_activities_locked_${currentTidKey}_${newName}`);
                migrateKey(`tracked_activity_scores_${oldName}`, `tracked_activity_scores_${newName}`);
                migrateKey(`tracked_course_quizzes_${oldName}`, `tracked_course_quizzes_${newName}`);
                migrateKey(`tracked_course_quizzes_locked_${oldName}`, `tracked_course_quizzes_locked_${newName}`);
                migrateKey(`tracked_course_quizzes_locked_${currentTidKey}_${oldName}`, `tracked_course_quizzes_locked_${currentTidKey}_${newName}`);
                migrateKey(`tracked_quiz_scores_${oldName}`, `tracked_quiz_scores_${newName}`);
                migrateKey(`tracked_course_exams_${oldName}`, `tracked_course_exams_${newName}`);
                migrateKey(`tracked_course_exams_locked_${oldName}`, `tracked_course_exams_locked_${newName}`);
                migrateKey(`tracked_course_exams_locked_${currentTidKey}_${oldName}`, `tracked_course_exams_locked_${currentTidKey}_${newName}`);
                migrateKey(`tracked_exam_scores_${oldName}`, `tracked_exam_scores_${newName}`);
                migrateKey(`tracked_course_attendance_${oldName}`, `tracked_course_attendance_${newName}`);
                migrateKey(`tracked_course_created_${currentTidKey}_${oldName}`, `tracked_course_created_${currentTidKey}_${newName}`);
                migrateKey(`tracked_course_created_${oldName}`, `tracked_course_created_${newName}`);

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
        confirmDeleteBtn.addEventListener("click", async () => {
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

            // Remove from teacher courses
            let customCourses = getTeacherCourses();
            customCourses = customCourses.filter(c => c.name && c.name.trim().toLowerCase() !== courseToDeleteName.toLowerCase());
            saveTeacherCourses(customCourses);

            // Clean up course-specific data keys
            const delNameLower = courseToDeleteName.trim().toLowerCase();
            localStorage.removeItem(`tracked_enrolled_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_enrolled_${delNameLower}`);
            localStorage.removeItem(`tracked_course_activities_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_activities_locked_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_activity_scores_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_quizzes_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_quizzes_locked_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_quiz_scores_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_exams_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_exams_locked_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_exam_scores_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_attendance_${courseToDeleteName}`);

            // Also clean up teacher-scoped keys
            const currentTidKey = (localStorage.getItem("tracked_teacher_id") || "T-2024-0042").toLowerCase().replace(/[^a-z0-9]/g, "_");
            localStorage.removeItem(`tracked_enrolled_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_activities_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_activities_locked_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_activity_scores_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_quizzes_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_quizzes_locked_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_quiz_scores_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_exams_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_exams_locked_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_exam_scores_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_attendance_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_created_${currentTidKey}_${courseToDeleteName}`);
            localStorage.removeItem(`tracked_course_created_${courseToDeleteName}`);

            // Remove this deleted course from ALL student-scoped cached course lists
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith("tracked_student_courses_")) {
                    try {
                        const list = JSON.parse(localStorage.getItem(key) || "[]");
                        if (Array.isArray(list)) {
                            const updatedList = list.filter(c => (c.name || "").trim().toLowerCase() !== delNameLower);
                            localStorage.setItem(key, JSON.stringify(updatedList));
                        }
                    } catch(e) {}
                }
            });

            // Ensure no legacy blacklist entry lingers
            localStorage.removeItem("tracked_deleted_courses");

            // Sync deletion to Supabase Cloud if connected
            if (window.TrackED_DB && typeof window.TrackED_DB.deleteCourse === "function") {
                await window.TrackED_DB.deleteCourse(courseToDeleteName);
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

    // Create DOM element for a course card
    function renderCourseCard(course) {
        if (!coursesGrid || !addCourseBtn || !course || !course.name) return;

        // Prevent duplicate cards if card already rendered in DOM
        const existing = Array.from(coursesGrid.querySelectorAll(".tab-card.tab-custom")).find(
            c => (c.getAttribute("data-course-name") || "").trim().toLowerCase() === course.name.trim().toLowerCase()
        );
        if (existing) return;

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

    function refreshCoursesGrid() {
        if (!coursesGrid || !addCourseBtn) return;
        coursesGrid.querySelectorAll(".tab-card.tab-custom").forEach(c => c.remove());
        const savedCourses = getTeacherCourses();
        savedCourses.forEach(renderCourseCard);
    }

    // Initial render of saved courses
    refreshCoursesGrid();

    // Re-render immediately when background Supabase sync finishes
    window.addEventListener("tracked_sync_completed", () => {
        refreshCoursesGrid();
    });

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
                const courses = getTeacherCourses();
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

            const todayCourseDate = getTodayLocalDate();
            const newCourse = { code: courseCode, name: courseName, createdAt: todayCourseDate };

            // Save to localStorage scoped to this teacher
            const courses = getTeacherCourses();
            courses.push(newCourse);
            saveTeacherCourses(courses);

            // Record creation date persistently
            localStorage.setItem(`tracked_course_created_${currentTidKey}_${courseName}`, todayCourseDate);
            localStorage.setItem(`tracked_course_created_${courseName}`, todayCourseDate);

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

            localStorage.setItem(`tracked_enrolled_${currentTidKey}_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_course_activities_${currentTidKey}_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_activity_scores_${currentTidKey}_${courseName}`, JSON.stringify({}));
            localStorage.setItem(`tracked_course_quizzes_${currentTidKey}_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_quiz_scores_${currentTidKey}_${courseName}`, JSON.stringify({}));
            localStorage.setItem(`tracked_course_exams_${currentTidKey}_${courseName}`, JSON.stringify([]));
            localStorage.setItem(`tracked_exam_scores_${currentTidKey}_${courseName}`, JSON.stringify({}));
            localStorage.setItem(`tracked_course_attendance_${currentTidKey}_${courseName}`, JSON.stringify({}));

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
    let activeCourseName = localStorage.getItem("tracked_selected_course");
    if (!activeCourseName) {
        const savedCourses = getTeacherCourses();
        if (savedCourses.length > 0 && savedCourses[0].name) {
            activeCourseName = savedCourses[0].name;
            localStorage.setItem("tracked_selected_course", activeCourseName);
            if (savedCourses[0].code) {
                localStorage.setItem("tracked_selected_course_code", savedCourses[0].code);
            }
        }
    }
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
        const currentCourseName = activeCourseName || "Programming Fundamentals";
        const currentCourseKey = `tracked_enrolled_${currentTidKey}_${currentCourseName}`;

        function getEnrolledStudents() {
            let raw = localStorage.getItem(currentCourseKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_enrolled_${currentCourseName}`);
            }
            let list = [];
            if (raw !== null) {
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
                if (!item.remarks) {
                    item.remarks = item.status || "Enrolled";
                }
            });

            return list;
        }

        function saveEnrolledStudents(list) {
            localStorage.setItem(currentCourseKey, JSON.stringify(list));
            localStorage.setItem(`tracked_enrolled_${currentCourseName}`, JSON.stringify(list));
        }

        function renderEnrolledTable() {
            const list = getEnrolledStudents();
            enrolledStudentsBody.innerHTML = "";

            if (list.length === 0) {
                enrolledStudentsBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #94a3b8; padding: 22px;">
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
                    const r = (student.remarks || student.status || "Enrolled").trim();
                    const isDropped = r.toLowerCase().startsWith("drop");

                    tr.innerHTML = `
                        <td>${escapeHtml(student.id)}</td>
                        <td>${escapeHtml(formatStudentName(student))}</td>
                        <td>
                            <select class="remarks-select ${isDropped ? 'remark-drop' : 'remark-enrolled'}" data-student-id="${escapeHtml(student.id)}" title="Enrollment Remarks">
                                <option value="Enrolled" ${!isDropped ? "selected" : ""}>Enrolled</option>
                                <option value="Drop" ${isDropped ? "selected" : ""}>Drop</option>
                            </select>
                        </td>
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

        // Refresh when background cloud sync completes
        window.addEventListener("tracked_sync_completed", () => {
            renderEnrolledTable();
        });

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
                lastName:   currentEnrollStudent.lastName   || "",
                remarks:    "Enrolled"
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

        // Handle student remarks dropdown change
        enrolledStudentsBody.addEventListener("change", (e) => {
            const selectEl = e.target.closest(".remarks-select");
            if (selectEl) {
                const studentId = selectEl.getAttribute("data-student-id");
                const newRemark = selectEl.value; // "Enrolled" or "Drop"
                let enrolledList = getEnrolledStudents();
                const student = enrolledList.find(s => s.id === studentId);
                if (student) {
                    student.remarks = newRemark;
                    saveEnrolledStudents(enrolledList);
                    if (newRemark === "Drop") {
                        selectEl.classList.remove("remark-enrolled");
                        selectEl.classList.add("remark-drop");
                    } else {
                        selectEl.classList.remove("remark-drop");
                        selectEl.classList.add("remark-enrolled");
                    }
                    if (window.TrackED_DB && typeof window.TrackED_DB.updateEnrollmentRemarks === "function") {
                        window.TrackED_DB.updateEnrollmentRemarks(currentCourseName, studentId, newRemark);
                    }
                }
            }
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

                    // Also immediately remove course from student's cached courses list
                    const sidKey = (studentId || "").trim().toLowerCase();
                    try {
                        const stCourses = JSON.parse(localStorage.getItem(`tracked_student_courses_${sidKey}`) || "[]");
                        if (Array.isArray(stCourses)) {
                            const filteredCourses = stCourses.filter(c => (c.name || "").trim().toLowerCase() !== (activeCourseName || "Programming Fundamentals").trim().toLowerCase());
                            localStorage.setItem(`tracked_student_courses_${sidKey}`, JSON.stringify(filteredCourses));
                        }
                    } catch(e) {}

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
        const scopedKey = `tracked_enrolled_${currentTidKey}_${course}`;
        let raw = localStorage.getItem(scopedKey);
        if (raw === null) {
            raw = localStorage.getItem(`tracked_enrolled_${course}`);
        }
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
                        if (!item.remarks) {
                            item.remarks = item.status || "Enrolled";
                        }
                    });
                    return parsed;
                }
            } catch (e) {}
        }
        return [];
    }

    function isStudentDropped(student) {
        if (!student) return false;
        const r = (student.remarks || student.status || "").trim().toLowerCase();
        return r.startsWith("drop");
    }

    const currentActiveCourse = activeCourseName || "Programming Fundamentals";
    const currentActiveCourseCode = localStorage.getItem("tracked_selected_course_code") ||
                                    (getTeacherCourses().find(c => c.name === currentActiveCourse) || {}).code || "";

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
        const activitiesKey       = `tracked_course_activities_${currentTidKey}_${currentActiveCourse}`;
        const scoresKey           = `tracked_activity_scores_${currentTidKey}_${currentActiveCourse}`;
        const lockedActivitiesKey = `tracked_course_activities_locked_${currentTidKey}_${currentActiveCourse}`;

        function getActivities() {
            let raw = localStorage.getItem(activitiesKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_activities_${currentActiveCourse}`);
            }
            if (raw !== null) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            return [];
        }

        function getScores() {
            let raw = localStorage.getItem(scoresKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_activity_scores_${currentActiveCourse}`);
            }
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let currentActivities  = getActivities();
        let currentScores      = getScores();

        function getLockedActivities() {
            let raw = localStorage.getItem(lockedActivitiesKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_activities_locked_${currentActiveCourse}`);
            }
            let list = [];
            if (raw !== null) {
                try {
                    list = JSON.parse(raw);
                    if (!Array.isArray(list)) list = [];
                } catch(e) {
                    list = [];
                }
            }
            // Auto-lock any activity where non-empty scores were previously saved
            currentActivities.forEach(act => {
                const actNumInt = parseInt(act.num, 10);
                if (!list.includes(actNumInt) && !list.includes(String(act.num))) {
                    const hasSaved = Object.keys(currentScores).some(sId => {
                        const sc = currentScores[sId];
                        return sc && sc[act.num] !== undefined && sc[act.num] !== null && sc[act.num] !== "";
                    });
                    if (hasSaved) list.push(actNumInt);
                }
            });
            return list.map(n => parseInt(n, 10));
        }

        function saveLockedActivities(list) {
            localStorage.setItem(lockedActivitiesKey, JSON.stringify(list));
            localStorage.setItem(`tracked_course_activities_locked_${currentActiveCourse}`, JSON.stringify(list));
        }

        function saveActivitiesData() {
            localStorage.setItem(activitiesKey, JSON.stringify(currentActivities));
            localStorage.setItem(`tracked_course_activities_${currentActiveCourse}`, JSON.stringify(currentActivities));
        }

        function saveScoresData() {
            localStorage.setItem(scoresKey, JSON.stringify(currentScores));
            localStorage.setItem(`tracked_activity_scores_${currentActiveCourse}`, JSON.stringify(currentScores));
        }

        function getNextActivityNum() {
            if (!currentActivities || currentActivities.length === 0) return 1;
            const maxNum = currentActivities.reduce((max, a) => Math.max(max, parseInt(a.num, 10) || 0), 0);
            return maxNum + 1;
        }

        function renderActivityTable() {
            currentActivities = getActivities();
            currentScores = getScores();
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const lockedActs = getLockedActivities();

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
                        const actNumInt = parseInt(act.num, 10);
                        const isLocked = lockedActs.includes(actNumInt);
                        thHtml += `
                            <th class="th-activity-header" data-act-num="${act.num}">
                                <div class="th-header-inner">
                                    <div class="th-title-row">
                                        <span class="th-activity-title">${escapeHtml(act.name)}</span>
                                        ${isLocked
                                            ? `<span class="th-locked-badge" title="Scores are saved and locked"><i class="fa-solid fa-lock"></i></span>`
                                            : `<button type="button" class="th-delete-btn" data-act-num="${act.num}" title="Delete ${escapeHtml(act.name)}">
                                                   <i class="fa-solid fa-trash-can"></i>
                                               </button>`
                                        }
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
                const stDropped = isStudentDropped(st);

                let rowHtml = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                `;

                currentActivities.forEach(act => {
                    const actNumInt = parseInt(act.num, 10);
                    const isActLocked = lockedActs.includes(actNumInt);
                    const stScores = currentScores[st.id] || {};
                    const val = (stScores[act.num] !== undefined && stScores[act.num] !== null) ? stScores[act.num] : "";

                    if (stDropped) {
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap dropped-student" title="Student is dropped - Cannot record scores">
                                    <input 
                                        type="text" 
                                        class="score-num-input" 
                                        disabled 
                                        value="${val !== '' ? val : '-'}" 
                                        placeholder="Drop" 
                                        title="Student is dropped - Cannot record scores"
                                    >
                                    <span class="score-max-label">/ ${act.maxScore}</span>
                                </div>
                            </td>
                        `;
                    } else if (isActLocked) {
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap locked" title="Score is already saved and locked">
                                    <input 
                                        type="number" 
                                        class="score-num-input" 
                                        disabled 
                                        value="${val}" 
                                        placeholder="0"
                                        title="Score is saved and locked"
                                    >
                                    <span class="score-max-label">/ ${act.maxScore}</span>
                                </div>
                            </td>
                        `;
                    } else {
                        const isInvalid = val !== "" && (Number(val) > act.maxScore || Number(val) < 0);
                        const invalidClass = isInvalid ? " invalid" : "";
                        const invalidTitle = isInvalid ? `title="Score cannot exceed maximum of ${act.maxScore}"` : "";
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap${invalidClass}">
                                    <input 
                                        type="number" 
                                        class="score-num-input" 
                                        data-student-id="${escapeHtml(st.id)}" 
                                        data-act-num="${act.num}" 
                                        min="0" 
                                        max="${act.maxScore}" 
                                        value="${val}" 
                                        placeholder="0"
                                        ${invalidTitle}
                                    >
                                    <span class="score-max-label">/ ${act.maxScore}</span>
                                </div>
                            </td>
                        `;
                    }
                });

                tr.innerHTML = rowHtml;
                activityTableBody.appendChild(tr);
            });

            // Update Save Button state
            if (saveScoresBtn) {
                const allLocked = currentActivities.length > 0 && currentActivities.every(a => lockedActs.includes(parseInt(a.num, 10)));
                if (allLocked) {
                    saveScoresBtn.disabled = true;
                    saveScoresBtn.classList.add("btn-locked");
                    saveScoresBtn.innerHTML = `<i class="fa-solid fa-lock"></i> All Scores Locked`;
                    saveScoresBtn.title = "All activity scores are already saved and locked";
                } else {
                    saveScoresBtn.disabled = false;
                    saveScoresBtn.classList.remove("btn-locked");
                    saveScoresBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Scores`;
                    saveScoresBtn.title = "";
                }
            }
        }

        // Real-time score validation on input
        if (activityTableBody) {
            activityTableBody.addEventListener("input", (e) => {
                const inp = e.target.closest(".score-num-input");
                if (!inp) return;
                const maxVal = parseFloat(inp.getAttribute("max"));
                const rawVal = inp.value.trim();
                const wrap = inp.closest(".score-input-wrap");
                if (!wrap) return;

                if (rawVal === "") {
                    wrap.classList.remove("invalid");
                    inp.removeAttribute("title");
                    return;
                }

                const num = parseFloat(rawVal);
                if (num > maxVal) {
                    wrap.classList.add("invalid");
                    inp.title = `Score cannot exceed the maximum score of ${maxVal}`;
                } else if (num < 0) {
                    wrap.classList.add("invalid");
                    inp.title = "Score cannot be negative";
                } else {
                    wrap.classList.remove("invalid");
                    inp.removeAttribute("title");
                }
            });
        }

        // Initial render
        renderActivityTable();

        // Reactive cloud sync listener
        window.addEventListener("tracked_sync_completed", () => {
            renderActivityTable();
        });

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
                const inputs = activityTableBody.querySelectorAll(".score-num-input:not([disabled])");
                if (inputs.length === 0) {
                    showTrackedAlert("No new scores to save or all activity scores are already locked.", "Activity Scores", "info");
                    return;
                }

                let hasError = false;
                let firstInvalidInp = null;
                let errorMsg = "";

                // 1. Strict validation against maximum scores
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const aNum = inp.getAttribute("data-act-num");
                    const maxVal = parseFloat(inp.getAttribute("max"));
                    const rawVal = inp.value.trim();
                    const wrap = inp.closest(".score-input-wrap");

                    if (rawVal !== "") {
                        const num = parseFloat(rawVal);
                        if (isNaN(num)) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                errorMsg = "Please enter valid numeric scores.";
                            }
                        } else if (num > maxVal) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                const actObj = currentActivities.find(a => a.num == aNum);
                                const actName = actObj ? actObj.name : `Activity ${aNum}`;
                                errorMsg = `Cannot save: Score (${num}) for ${actName} exceeds the maximum score of ${maxVal}!`;
                            }
                        } else if (num < 0) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                errorMsg = "Cannot save: Scores cannot be negative!";
                            }
                        } else {
                            if (wrap) wrap.classList.remove("invalid");
                        }
                    } else {
                        if (wrap) wrap.classList.remove("invalid");
                    }
                });

                if (hasError) {
                    if (firstInvalidInp) {
                        firstInvalidInp.focus();
                        firstInvalidInp.select();
                    }
                    if (activityAlertSuccess && activityAlertSuccessMsg) {
                        activityAlertSuccess.className = "modal-alert error";
                        const icon = activityAlertSuccess.querySelector("i");
                        if (icon) icon.className = "fa-solid fa-circle-exclamation";
                        activityAlertSuccessMsg.textContent = errorMsg;
                        activityAlertSuccess.style.display = "flex";
                        activityAlertSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                    return; // STRICTLY PREVENT SAVING
                }

                // 2. All scores are valid - proceed with save
                const newlySavedActs = new Set();
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const aNum = parseInt(inp.getAttribute("data-act-num"), 10);
                    const val = inp.value.trim();
                    if (!currentScores[sId]) currentScores[sId] = {};
                    currentScores[sId][aNum] = val === "" ? "" : Number(val);
                    if (!isNaN(aNum)) newlySavedActs.add(aNum);
                });
                saveScoresData();

                // Lock newly saved activities
                const lockedList = getLockedActivities();
                newlySavedActs.forEach(num => {
                    if (!lockedList.includes(num)) lockedList.push(num);
                });
                saveLockedActivities(lockedList);

                // Sync scores to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveActivityScores === "function") {
                    window.TrackED_DB.saveActivityScores(currentActiveCourse, currentScores);
                }

                // Sync with student portal localStorage key: tracked_activity_${currentCourse}
                const studentStorageKey = `tracked_activity_${currentActiveCourse.trim().toLowerCase()}`;
                const activeEnrolled = getEnrolledStudentsForCourse(currentActiveCourse);
                const syncRecords = currentActivities.map(act => {
                    const repStudent = activeEnrolled[0] || { id: "2024-00123" };
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

                // Re-render table so all saved inputs are immediately locked
                renderActivityTable();

                if (activityAlertSuccess && activityAlertSuccessMsg) {
                    activityAlertSuccess.className = "modal-alert success";
                    const icon = activityAlertSuccess.querySelector("i");
                    if (icon) icon.className = "fa-solid fa-circle-check";
                    activityAlertSuccessMsg.textContent = "All student activity scores have been saved successfully! Scores are now locked and cannot be edited.";
                    activityAlertSuccess.style.display = "flex";
                }

                setTimeout(() => {
                    if (activityAlertSuccess) activityAlertSuccess.style.display = "none";
                }, 4000);
            });
        }

        // =========================================
        // Activity Print Handlers (PDF Generation)
        // =========================================
        const printActivityBtn            = document.getElementById("printActivityBtn");
        const printScoresFooterBtn        = document.getElementById("printScoresFooterBtn");
        const printActivityModalOverlay   = document.getElementById("printActivityModalOverlay");
        const closePrintActivityModalBtn  = document.getElementById("closePrintActivityModalBtn");
        const cancelPrintActivityModalBtn = document.getElementById("cancelPrintActivityModalBtn");
        const printActivityForm           = document.getElementById("printActivityForm");
        const printActivitySelect         = document.getElementById("printActivitySelect");

        function printSingleActivity(actNum) {
            currentActivities = getActivities();
            currentScores = getScores();
            const act = currentActivities.find(a => parseInt(a.num, 10) === parseInt(actNum, 10));
            if (!act) return;
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const sorted = [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b)));

            let totalRecorded = 0;
            let totalScoreSum = 0;
            let droppedCount = 0;

            const rows = sorted.map((st) => {
                const stDropped = isStudentDropped(st);
                let scoreDisplay = "";
                if (stDropped) {
                    scoreDisplay = `<span style="color: #94a3b8;">Dropped</span>`;
                } else {
                    const stScores = currentScores[st.id] || {};
                    const val = stScores[act.num];
                    if (val !== undefined && val !== null && val !== "") {
                        scoreDisplay = `<span class="badge-score">${val} / ${act.maxScore}</span>`;
                    } else {
                        scoreDisplay = `0 / ${act.maxScore}`;
                    }
                }
                return [
                    escapeHtml(st.id),
                    escapeHtml(formatStudentName(st)),
                    scoreDisplay
                ];
            });

            printAcademicReport({
                reportTitle: "Student Activity Score Record",
                assessmentName: `${act.name} (Max Score: ${act.maxScore} pts)`,
                dateStr: getTodayLocalDate(),
                courseCode: currentActiveCourseCode || "",
                courseName: currentActiveCourse,
                instructorName: currentTeacherName,
                headers: ["Student ID", "Student Name", "Score"],
                rows: rows
            });
        }

        function openPrintActivityModal() {
            currentActivities = getActivities();
            currentScores = getScores();
            if (currentActivities.length === 0) {
                showTrackedAlert("No activities found for this course. Please create an activity first.", "No Activities", "info");
                return;
            }
            const lockedActs = getLockedActivities();
            const savedList = currentActivities.filter(a => lockedActs.includes(parseInt(a.num, 10)));
            if (savedList.length === 0) {
                showTrackedAlert("No saved activities found for this course. Please enter scores and click 'Save Scores' first before printing.", "Save Required", "warning");
                return;
            }
            if (printActivitySelect) {
                printActivitySelect.innerHTML = savedList.map(a => 
                    `<option value="${a.num}">${escapeHtml(a.name)} (Max: ${a.maxScore} pts)</option>`
                ).join("");
            }
            if (printActivityModalOverlay) {
                printActivityModalOverlay.classList.add("show");
            }
        }

        function closePrintActivityModal() {
            if (printActivityModalOverlay) {
                printActivityModalOverlay.classList.remove("show");
            }
        }

        if (printActivityBtn) printActivityBtn.addEventListener("click", openPrintActivityModal);
        if (closePrintActivityModalBtn) closePrintActivityModalBtn.addEventListener("click", closePrintActivityModal);
        if (cancelPrintActivityModalBtn) cancelPrintActivityModalBtn.addEventListener("click", closePrintActivityModal);
        if (printActivityModalOverlay) {
            printActivityModalOverlay.addEventListener("click", (e) => {
                if (e.target === printActivityModalOverlay) closePrintActivityModal();
            });
        }
        if (printActivityForm) {
            printActivityForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const chosen = printActivitySelect ? printActivitySelect.value : null;
                if (chosen) {
                    printSingleActivity(chosen);
                    closePrintActivityModal();
                }
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
        const quizzesKey       = `tracked_course_quizzes_${currentTidKey}_${currentActiveCourse}`;
        const scoresKey        = `tracked_quiz_scores_${currentTidKey}_${currentActiveCourse}`;
        const lockedQuizzesKey = `tracked_course_quizzes_locked_${currentTidKey}_${currentActiveCourse}`;

        function getQuizzes() {
            let raw = localStorage.getItem(quizzesKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_quizzes_${currentActiveCourse}`);
            }
            if (raw !== null) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            return [];
        }

        function getQuizScores() {
            let raw = localStorage.getItem(scoresKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_quiz_scores_${currentActiveCourse}`);
            }
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let currentQuizzes     = getQuizzes();
        let currentQuizScores  = getQuizScores();

        function getLockedQuizzes() {
            let raw = localStorage.getItem(lockedQuizzesKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_quizzes_locked_${currentActiveCourse}`);
            }
            let list = [];
            if (raw !== null) {
                try {
                    list = JSON.parse(raw);
                    if (!Array.isArray(list)) list = [];
                } catch(e) {
                    list = [];
                }
            }
            // Auto-lock any quiz where non-empty scores were previously saved
            currentQuizzes.forEach(q => {
                const qNumInt = parseInt(q.num, 10);
                if (!list.includes(qNumInt) && !list.includes(String(q.num))) {
                    const hasSaved = Object.keys(currentQuizScores).some(sId => {
                        const sc = currentQuizScores[sId];
                        return sc && sc[q.num] !== undefined && sc[q.num] !== null && sc[q.num] !== "";
                    });
                    if (hasSaved) list.push(qNumInt);
                }
            });
            return list.map(n => parseInt(n, 10));
        }

        function saveLockedQuizzes(list) {
            localStorage.setItem(lockedQuizzesKey, JSON.stringify(list));
            localStorage.setItem(`tracked_course_quizzes_locked_${currentActiveCourse}`, JSON.stringify(list));
        }

        function saveQuizzesData() {
            localStorage.setItem(quizzesKey, JSON.stringify(currentQuizzes));
            localStorage.setItem(`tracked_course_quizzes_${currentActiveCourse}`, JSON.stringify(currentQuizzes));
        }

        function saveQuizScoresData() {
            localStorage.setItem(scoresKey, JSON.stringify(currentQuizScores));
            localStorage.setItem(`tracked_quiz_scores_${currentActiveCourse}`, JSON.stringify(currentQuizScores));
        }

        function getNextQuizNum() {
            if (!currentQuizzes || currentQuizzes.length === 0) return 1;
            const maxNum = currentQuizzes.reduce((max, a) => Math.max(max, parseInt(a.num, 10) || 0), 0);
            return maxNum + 1;
        }

        function renderQuizTable() {
            currentQuizzes = getQuizzes();
            currentQuizScores = getQuizScores();
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const lockedQs = getLockedQuizzes();

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
                        const qNumInt = parseInt(q.num, 10);
                        const isLocked = lockedQs.includes(qNumInt);
                        thHtml += `
                            <th class="th-activity-header" data-quiz-num="${q.num}">
                                <div class="th-header-inner">
                                    <div class="th-title-row">
                                        <span class="th-activity-title">${escapeHtml(q.name)}</span>
                                        ${isLocked
                                            ? `<span class="th-locked-badge" title="Scores are saved and locked"><i class="fa-solid fa-lock"></i></span>`
                                            : `<button type="button" class="th-delete-btn" data-quiz-num="${q.num}" title="Delete ${escapeHtml(q.name)}">
                                                   <i class="fa-solid fa-trash-can"></i>
                                               </button>`
                                        }
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
                const stDropped = isStudentDropped(st);

                let rowHtml = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                `;

                currentQuizzes.forEach(q => {
                    const qNumInt = parseInt(q.num, 10);
                    const isQLocked = lockedQs.includes(qNumInt);
                    const stScores = currentQuizScores[st.id] || {};
                    const val = (stScores[q.num] !== undefined && stScores[q.num] !== null) ? stScores[q.num] : "";

                    if (stDropped) {
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap dropped-student" title="Student is dropped - Cannot record scores">
                                    <input 
                                        type="text" 
                                        class="score-num-input" 
                                        disabled 
                                        value="${val !== '' ? val : '-'}" 
                                        placeholder="Drop" 
                                        title="Student is dropped - Cannot record scores"
                                    >
                                    <span class="score-max-label">/ ${q.maxScore}</span>
                                </div>
                            </td>
                        `;
                    } else if (isQLocked) {
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap locked" title="Score is already saved and locked">
                                    <input 
                                        type="number" 
                                        class="score-num-input" 
                                        disabled 
                                        value="${val}" 
                                        placeholder="0"
                                        title="Score is saved and locked"
                                    >
                                    <span class="score-max-label">/ ${q.maxScore}</span>
                                </div>
                            </td>
                        `;
                    } else {
                        const isInvalid = val !== "" && (Number(val) > q.maxScore || Number(val) < 0);
                        const invalidClass = isInvalid ? " invalid" : "";
                        const invalidTitle = isInvalid ? `title="Score cannot exceed maximum of ${q.maxScore}"` : "";
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap${invalidClass}">
                                    <input 
                                        type="number" 
                                        class="score-num-input" 
                                        data-student-id="${escapeHtml(st.id)}" 
                                        data-quiz-num="${q.num}" 
                                        min="0" 
                                        max="${q.maxScore}" 
                                        value="${val}" 
                                        placeholder="0"
                                        ${invalidTitle}
                                    >
                                    <span class="score-max-label">/ ${q.maxScore}</span>
                                </div>
                            </td>
                        `;
                    }
                });

                tr.innerHTML = rowHtml;
                quizTableBody.appendChild(tr);
            });

            // Update Save Button state
            if (saveQuizScoresBtn) {
                const allLocked = currentQuizzes.length > 0 && currentQuizzes.every(q => lockedQs.includes(parseInt(q.num, 10)));
                if (allLocked) {
                    saveQuizScoresBtn.disabled = true;
                    saveQuizScoresBtn.classList.add("btn-locked");
                    saveQuizScoresBtn.innerHTML = `<i class="fa-solid fa-lock"></i> All Scores Locked`;
                    saveQuizScoresBtn.title = "All quiz scores are already saved and locked";
                } else {
                    saveQuizScoresBtn.disabled = false;
                    saveQuizScoresBtn.classList.remove("btn-locked");
                    saveQuizScoresBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Scores`;
                    saveQuizScoresBtn.title = "";
                }
            }
        }

        // Real-time score validation on input for quizzes
        if (quizTableBody) {
            quizTableBody.addEventListener("input", (e) => {
                const inp = e.target.closest(".score-num-input");
                if (!inp) return;
                const maxVal = parseFloat(inp.getAttribute("max"));
                const rawVal = inp.value.trim();
                const wrap = inp.closest(".score-input-wrap");
                if (!wrap) return;

                if (rawVal === "") {
                    wrap.classList.remove("invalid");
                    inp.removeAttribute("title");
                    return;
                }

                const num = parseFloat(rawVal);
                if (num > maxVal) {
                    wrap.classList.add("invalid");
                    inp.title = `Score cannot exceed the maximum score of ${maxVal}`;
                } else if (num < 0) {
                    wrap.classList.add("invalid");
                    inp.title = "Score cannot be negative";
                } else {
                    wrap.classList.remove("invalid");
                    inp.removeAttribute("title");
                }
            });
        }

        renderQuizTable();

        // Reactive cloud sync listener
        window.addEventListener("tracked_sync_completed", () => {
            renderQuizTable();
        });

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
                const inputs = quizTableBody.querySelectorAll(".score-num-input:not([disabled])");
                if (inputs.length === 0) {
                    showTrackedAlert("No new scores to save or all quiz scores are already locked.", "Quiz Scores", "info");
                    return;
                }

                let hasError = false;
                let firstInvalidInp = null;
                let errorMsg = "";

                // 1. Strict validation against maximum scores
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const qNum = inp.getAttribute("data-quiz-num");
                    const maxVal = parseFloat(inp.getAttribute("max"));
                    const rawVal = inp.value.trim();
                    const wrap = inp.closest(".score-input-wrap");

                    if (rawVal !== "") {
                        const num = parseFloat(rawVal);
                        if (isNaN(num)) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                errorMsg = "Please enter valid numeric scores.";
                            }
                        } else if (num > maxVal) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                const qObj = currentQuizzes.find(q => q.num == qNum);
                                const qName = qObj ? qObj.name : `Quiz ${qNum}`;
                                errorMsg = `Cannot save: Score (${num}) for ${qName} exceeds the maximum score of ${maxVal}!`;
                            }
                        } else if (num < 0) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                errorMsg = "Cannot save: Scores cannot be negative!";
                            }
                        } else {
                            if (wrap) wrap.classList.remove("invalid");
                        }
                    } else {
                        if (wrap) wrap.classList.remove("invalid");
                    }
                });

                if (hasError) {
                    if (firstInvalidInp) {
                        firstInvalidInp.focus();
                        firstInvalidInp.select();
                    }
                    if (quizAlertSuccess && quizAlertSuccessMsg) {
                        quizAlertSuccess.className = "modal-alert error";
                        const icon = quizAlertSuccess.querySelector("i");
                        if (icon) icon.className = "fa-solid fa-circle-exclamation";
                        quizAlertSuccessMsg.textContent = errorMsg;
                        quizAlertSuccess.style.display = "flex";
                        quizAlertSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                    return; // STRICTLY PREVENT SAVING
                }

                // 2. All scores are valid - proceed with save
                const newlySavedQuizzes = new Set();
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const qNum = parseInt(inp.getAttribute("data-quiz-num"), 10);
                    const val = inp.value.trim();
                    if (!currentQuizScores[sId]) currentQuizScores[sId] = {};
                    currentQuizScores[sId][qNum] = val === "" ? "" : Number(val);
                    if (!isNaN(qNum)) newlySavedQuizzes.add(qNum);
                });
                saveQuizScoresData();

                // Lock newly saved quizzes
                const lockedList = getLockedQuizzes();
                newlySavedQuizzes.forEach(num => {
                    if (!lockedList.includes(num)) lockedList.push(num);
                });
                saveLockedQuizzes(lockedList);

                // Sync quiz scores to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveQuizScores === "function") {
                    window.TrackED_DB.saveQuizScores(currentActiveCourse, currentQuizScores);
                }

                const studentStorageKey = `tracked_quizzes_${currentActiveCourse.trim().toLowerCase()}`;
                const activeEnrolled = getEnrolledStudentsForCourse(currentActiveCourse);
                const syncRecords = currentQuizzes.map(q => {
                    const repStudent = activeEnrolled[0] || { id: "2024-00123" };
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

                // Re-render table so all saved inputs are immediately locked
                renderQuizTable();

                if (quizAlertSuccess && quizAlertSuccessMsg) {
                    quizAlertSuccess.className = "modal-alert success";
                    const icon = quizAlertSuccess.querySelector("i");
                    if (icon) icon.className = "fa-solid fa-circle-check";
                    quizAlertSuccessMsg.textContent = "All student quiz scores have been saved successfully! Scores are now locked and cannot be edited.";
                    quizAlertSuccess.style.display = "flex";
                }

                setTimeout(() => {
                    if (quizAlertSuccess) quizAlertSuccess.style.display = "none";
                }, 4000);
            });
        }

        // =========================================
        // Quiz Print Handlers (PDF Generation)
        // =========================================
        const printQuizBtn            = document.getElementById("printQuizBtn");
        const printQuizFooterBtn      = document.getElementById("printQuizFooterBtn");
        const printQuizModalOverlay   = document.getElementById("printQuizModalOverlay");
        const closePrintQuizModalBtn  = document.getElementById("closePrintQuizModalBtn");
        const cancelPrintQuizModalBtn = document.getElementById("cancelPrintQuizModalBtn");
        const printQuizForm           = document.getElementById("printQuizForm");
        const printQuizSelect         = document.getElementById("printQuizSelect");

        function printSingleQuiz(quizNum) {
            currentQuizzes = getQuizzes();
            currentQuizScores = getQuizScores();
            const quiz = currentQuizzes.find(q => parseInt(q.num, 10) === parseInt(quizNum, 10));
            if (!quiz) return;
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const sorted = [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b)));

            let totalRecorded = 0;
            let totalScoreSum = 0;
            let droppedCount = 0;

            const rows = sorted.map((st) => {
                const stDropped = isStudentDropped(st);
                let scoreDisplay = "";
                if (stDropped) {
                    scoreDisplay = `<span style="color: #94a3b8;">Dropped</span>`;
                } else {
                    const stScores = currentQuizScores[st.id] || {};
                    const val = stScores[quiz.num];
                    if (val !== undefined && val !== null && val !== "") {
                        scoreDisplay = `<span class="badge-score">${val} / ${quiz.maxScore}</span>`;
                    } else {
                        scoreDisplay = `0 / ${quiz.maxScore}`;
                    }
                }
                return [
                    escapeHtml(st.id),
                    escapeHtml(formatStudentName(st)),
                    scoreDisplay
                ];
            });

            printAcademicReport({
                reportTitle: "Student Quiz Score Record",
                assessmentName: `${quiz.name} (Max Score: ${quiz.maxScore} pts)`,
                dateStr: getTodayLocalDate(),
                courseCode: currentActiveCourseCode || "",
                courseName: currentActiveCourse,
                instructorName: currentTeacherName,
                headers: ["Student ID", "Student Name", "Score"],
                rows: rows
            });
        }

        function openPrintQuizModal() {
            currentQuizzes = getQuizzes();
            currentQuizScores = getQuizScores();
            if (currentQuizzes.length === 0) {
                showTrackedAlert("No quizzes found for this course. Please create a quiz first.", "No Quizzes", "info");
                return;
            }
            const lockedQs = getLockedQuizzes();
            const savedList = currentQuizzes.filter(q => lockedQs.includes(parseInt(q.num, 10)));
            if (savedList.length === 0) {
                showTrackedAlert("No saved quizzes found for this course. Please enter scores and click 'Save Scores' first before printing.", "Save Required", "warning");
                return;
            }
            if (printQuizSelect) {
                printQuizSelect.innerHTML = savedList.map(q => 
                    `<option value="${q.num}">${escapeHtml(q.name)} (Max: ${q.maxScore} pts)</option>`
                ).join("");
            }
            if (printQuizModalOverlay) {
                printQuizModalOverlay.classList.add("show");
            }
        }

        function closePrintQuizModal() {
            if (printQuizModalOverlay) {
                printQuizModalOverlay.classList.remove("show");
            }
        }

        if (printQuizBtn) printQuizBtn.addEventListener("click", openPrintQuizModal);
        if (closePrintQuizModalBtn) closePrintQuizModalBtn.addEventListener("click", closePrintQuizModal);
        if (cancelPrintQuizModalBtn) cancelPrintQuizModalBtn.addEventListener("click", closePrintQuizModal);
        if (printQuizModalOverlay) {
            printQuizModalOverlay.addEventListener("click", (e) => {
                if (e.target === printQuizModalOverlay) closePrintQuizModal();
            });
        }
        if (printQuizForm) {
            printQuizForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const chosen = printQuizSelect ? printQuizSelect.value : null;
                if (chosen) {
                    printSingleQuiz(chosen);
                    closePrintQuizModal();
                }
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
        const examsKey        = `tracked_course_exams_${currentTidKey}_${currentActiveCourse}`;
        const scoresKey       = `tracked_exam_scores_${currentTidKey}_${currentActiveCourse}`;
        const lockedExamsKey  = `tracked_course_exams_locked_${currentTidKey}_${currentActiveCourse}`;

        function getExams() {
            let raw = localStorage.getItem(examsKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_exams_${currentActiveCourse}`);
            }
            if (raw !== null) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {}
            }
            return [];
        }

        function getExamScores() {
            let raw = localStorage.getItem(scoresKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_exam_scores_${currentActiveCourse}`);
            }
            if (raw !== null) {
                try {
                    return JSON.parse(raw) || {};
                } catch (e) {}
            }
            return {};
        }

        let currentExams       = getExams();
        let currentExamScores  = getExamScores();

        function getLockedExams() {
            let raw = localStorage.getItem(lockedExamsKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_exams_locked_${currentActiveCourse}`);
            }
            let list = [];
            if (raw !== null) {
                try {
                    list = JSON.parse(raw);
                    if (!Array.isArray(list)) list = [];
                } catch(e) {
                    list = [];
                }
            }
            // Auto-lock any exam where non-empty scores were previously saved
            currentExams.forEach(ex => {
                const exNumInt = parseInt(ex.num, 10);
                if (!list.includes(exNumInt) && !list.includes(String(ex.num))) {
                    const hasSaved = Object.keys(currentExamScores).some(sId => {
                        const sc = currentExamScores[sId];
                        return sc && sc[ex.num] !== undefined && sc[ex.num] !== null && sc[ex.num] !== "";
                    });
                    if (hasSaved) list.push(exNumInt);
                }
            });
            return list.map(n => parseInt(n, 10));
        }

        function saveLockedExams(list) {
            localStorage.setItem(lockedExamsKey, JSON.stringify(list));
            localStorage.setItem(`tracked_course_exams_locked_${currentActiveCourse}`, JSON.stringify(list));
        }

        function saveExamsData() {
            localStorage.setItem(examsKey, JSON.stringify(currentExams));
            localStorage.setItem(`tracked_course_exams_${currentActiveCourse}`, JSON.stringify(currentExams));
        }

        function saveExamScoresData() {
            localStorage.setItem(scoresKey, JSON.stringify(currentExamScores));
            localStorage.setItem(`tracked_exam_scores_${currentActiveCourse}`, JSON.stringify(currentExamScores));
        }

        function getNextExamNum() {
            if (!currentExams || currentExams.length === 0) return 1;
            const maxNum = currentExams.reduce((max, a) => Math.max(max, parseInt(a.num, 10) || 0), 0);
            return maxNum + 1;
        }

        function renderExamTable() {
            currentExams = getExams();
            currentExamScores = getExamScores();
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const lockedExs = getLockedExams();

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
                        const exNumInt = parseInt(ex.num, 10);
                        const isLocked = lockedExs.includes(exNumInt);
                        thHtml += `
                            <th class="th-activity-header" data-exam-num="${ex.num}">
                                <div class="th-header-inner">
                                    <div class="th-title-row">
                                        <span class="th-activity-title">${escapeHtml(ex.name)}</span>
                                        ${isLocked
                                            ? `<span class="th-locked-badge" title="Scores are saved and locked"><i class="fa-solid fa-lock"></i></span>`
                                            : `<button type="button" class="th-delete-btn" data-exam-num="${ex.num}" title="Delete ${escapeHtml(ex.name)}">
                                                   <i class="fa-solid fa-trash-can"></i>
                                               </button>`
                                        }
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
                const stDropped = isStudentDropped(st);

                let rowHtml = `
                    <td><strong>${escapeHtml(st.id)}</strong></td>
                    <td>${escapeHtml(formatStudentName(st))}</td>
                `;

                currentExams.forEach(ex => {
                    const exNumInt = parseInt(ex.num, 10);
                    const isExLocked = lockedExs.includes(exNumInt);
                    const stScores = currentExamScores[st.id] || {};
                    const val = (stScores[ex.num] !== undefined && stScores[ex.num] !== null) ? stScores[ex.num] : "";

                    if (stDropped) {
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap dropped-student" title="Student is dropped - Cannot record scores">
                                    <input 
                                        type="text" 
                                        class="score-num-input" 
                                        disabled 
                                        value="${val !== '' ? val : '-'}" 
                                        placeholder="Drop" 
                                        title="Student is dropped - Cannot record scores"
                                    >
                                    <span class="score-max-label">/ ${ex.maxScore}</span>
                                </div>
                            </td>
                        `;
                    } else if (isExLocked) {
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap locked" title="Score is already saved and locked">
                                    <input 
                                        type="number" 
                                        class="score-num-input" 
                                        disabled 
                                        value="${val}" 
                                        placeholder="0"
                                        title="Score is saved and locked"
                                    >
                                    <span class="score-max-label">/ ${ex.maxScore}</span>
                                </div>
                            </td>
                        `;
                    } else {
                        const isInvalid = val !== "" && (Number(val) > ex.maxScore || Number(val) < 0);
                        const invalidClass = isInvalid ? " invalid" : "";
                        const invalidTitle = isInvalid ? `title="Score cannot exceed maximum of ${ex.maxScore}"` : "";
                        rowHtml += `
                            <td class="score-cell">
                                <div class="score-input-wrap${invalidClass}">
                                    <input 
                                        type="number" 
                                        class="score-num-input" 
                                        data-student-id="${escapeHtml(st.id)}" 
                                        data-exam-num="${ex.num}" 
                                        min="0" 
                                        max="${ex.maxScore}" 
                                        value="${val}" 
                                        placeholder="0"
                                        ${invalidTitle}
                                    >
                                    <span class="score-max-label">/ ${ex.maxScore}</span>
                                </div>
                            </td>
                        `;
                    }
                });

                tr.innerHTML = rowHtml;
                examTableBody.appendChild(tr);
            });

            // Update Save Button state
            if (saveExamScoresBtn) {
                const allLocked = currentExams.length > 0 && currentExams.every(ex => lockedExs.includes(parseInt(ex.num, 10)));
                if (allLocked) {
                    saveExamScoresBtn.disabled = true;
                    saveExamScoresBtn.classList.add("btn-locked");
                    saveExamScoresBtn.innerHTML = `<i class="fa-solid fa-lock"></i> All Scores Locked`;
                    saveExamScoresBtn.title = "All exam scores are already saved and locked";
                } else {
                    saveExamScoresBtn.disabled = false;
                    saveExamScoresBtn.classList.remove("btn-locked");
                    saveExamScoresBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Scores`;
                    saveExamScoresBtn.title = "";
                }
            }
        }

        // Real-time score validation on input for exams
        if (examTableBody) {
            examTableBody.addEventListener("input", (e) => {
                const inp = e.target.closest(".score-num-input");
                if (!inp) return;
                const maxVal = parseFloat(inp.getAttribute("max"));
                const rawVal = inp.value.trim();
                const wrap = inp.closest(".score-input-wrap");
                if (!wrap) return;

                if (rawVal === "") {
                    wrap.classList.remove("invalid");
                    inp.removeAttribute("title");
                    return;
                }

                const num = parseFloat(rawVal);
                if (num > maxVal) {
                    wrap.classList.add("invalid");
                    inp.title = `Score cannot exceed the maximum score of ${maxVal}`;
                } else if (num < 0) {
                    wrap.classList.add("invalid");
                    inp.title = "Score cannot be negative";
                } else {
                    wrap.classList.remove("invalid");
                    inp.removeAttribute("title");
                }
            });
        }

        renderExamTable();

        // Reactive cloud sync listener
        window.addEventListener("tracked_sync_completed", () => {
            renderExamTable();
        });

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
                const inputs = examTableBody.querySelectorAll(".score-num-input:not([disabled])");
                if (inputs.length === 0) {
                    showTrackedAlert("No new scores to save or all exam scores are already locked.", "Exam Scores", "info");
                    return;
                }

                let hasError = false;
                let firstInvalidInp = null;
                let errorMsg = "";

                // 1. Strict validation against maximum scores
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const exNum = inp.getAttribute("data-exam-num");
                    const maxVal = parseFloat(inp.getAttribute("max"));
                    const rawVal = inp.value.trim();
                    const wrap = inp.closest(".score-input-wrap");

                    if (rawVal !== "") {
                        const num = parseFloat(rawVal);
                        if (isNaN(num)) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                errorMsg = "Please enter valid numeric scores.";
                            }
                        } else if (num > maxVal) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                const exObj = currentExams.find(ex => ex.num == exNum);
                                const exName = exObj ? exObj.name : `Exam ${exNum}`;
                                errorMsg = `Cannot save: Score (${num}) for ${exName} exceeds the maximum score of ${maxVal}!`;
                            }
                        } else if (num < 0) {
                            hasError = true;
                            if (wrap) wrap.classList.add("invalid");
                            if (!firstInvalidInp) {
                                firstInvalidInp = inp;
                                errorMsg = "Cannot save: Scores cannot be negative!";
                            }
                        } else {
                            if (wrap) wrap.classList.remove("invalid");
                        }
                    } else {
                        if (wrap) wrap.classList.remove("invalid");
                    }
                });

                if (hasError) {
                    if (firstInvalidInp) {
                        firstInvalidInp.focus();
                        firstInvalidInp.select();
                    }
                    if (examAlertSuccess && examAlertSuccessMsg) {
                        examAlertSuccess.className = "modal-alert error";
                        const icon = examAlertSuccess.querySelector("i");
                        if (icon) icon.className = "fa-solid fa-circle-exclamation";
                        examAlertSuccessMsg.textContent = errorMsg;
                        examAlertSuccess.style.display = "flex";
                        examAlertSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                    return; // STRICTLY PREVENT SAVING
                }

                // 2. All scores are valid - proceed with save
                const newlySavedExams = new Set();
                inputs.forEach(inp => {
                    const sId = inp.getAttribute("data-student-id");
                    const exNum = parseInt(inp.getAttribute("data-exam-num"), 10);
                    const val = inp.value.trim();
                    if (!currentExamScores[sId]) currentExamScores[sId] = {};
                    currentExamScores[sId][exNum] = val === "" ? "" : Number(val);
                    if (!isNaN(exNum)) newlySavedExams.add(exNum);
                });
                saveExamScoresData();

                // Lock newly saved exams
                const lockedList = getLockedExams();
                newlySavedExams.forEach(num => {
                    if (!lockedList.includes(num)) lockedList.push(num);
                });
                saveLockedExams(lockedList);

                // Sync exam scores to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveExamScores === "function") {
                    window.TrackED_DB.saveExamScores(currentActiveCourse, currentExamScores);
                }

                const studentStorageKey = `tracked_exams_${currentActiveCourse.trim().toLowerCase()}`;
                const activeEnrolled = getEnrolledStudentsForCourse(currentActiveCourse);
                const syncRecords = currentExams.map(ex => {
                    const repStudent = activeEnrolled[0] || { id: "2024-00123" };
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

                // Re-render table so all saved inputs are immediately locked
                renderExamTable();

                if (examAlertSuccess && examAlertSuccessMsg) {
                    examAlertSuccess.className = "modal-alert success";
                    const icon = examAlertSuccess.querySelector("i");
                    if (icon) icon.className = "fa-solid fa-circle-check";
                    examAlertSuccessMsg.textContent = "All student exam scores have been saved successfully! Scores are now locked and cannot be edited.";
                    examAlertSuccess.style.display = "flex";
                }

                setTimeout(() => {
                    if (examAlertSuccess) examAlertSuccess.style.display = "none";
                }, 4000);
            });
        }

        // =========================================
        // Exam Print Handlers (PDF Generation)
        // =========================================
        const printExamBtn            = document.getElementById("printExamBtn");
        const printExamFooterBtn      = document.getElementById("printExamFooterBtn");
        const printExamModalOverlay   = document.getElementById("printExamModalOverlay");
        const closePrintExamModalBtn  = document.getElementById("closePrintExamModalBtn");
        const cancelPrintExamModalBtn = document.getElementById("cancelPrintExamModalBtn");
        const printExamForm           = document.getElementById("printExamForm");
        const printExamSelect         = document.getElementById("printExamSelect");

        function printSingleExam(examNum) {
            currentExams = getExams();
            currentExamScores = getExamScores();
            const exam = currentExams.find(ex => parseInt(ex.num, 10) === parseInt(examNum, 10));
            if (!exam) return;
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const sorted = [...enrolledStudents].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b)));

            let totalRecorded = 0;
            let totalScoreSum = 0;
            let droppedCount = 0;

            const rows = sorted.map((st) => {
                const stDropped = isStudentDropped(st);
                let scoreDisplay = "";
                if (stDropped) {
                    scoreDisplay = `<span style="color: #94a3b8;">Dropped</span>`;
                } else {
                    const stScores = currentExamScores[st.id] || {};
                    const val = stScores[exam.num];
                    if (val !== undefined && val !== null && val !== "") {
                        scoreDisplay = `<span class="badge-score">${val} / ${exam.maxScore}</span>`;
                    } else {
                        scoreDisplay = `0 / ${exam.maxScore}`;
                    }
                }
                return [
                    escapeHtml(st.id),
                    escapeHtml(formatStudentName(st)),
                    scoreDisplay
                ];
            });

            printAcademicReport({
                reportTitle: "Student Exam Score Record",
                assessmentName: `${exam.name} (Max Score: ${exam.maxScore} pts)`,
                dateStr: getTodayLocalDate(),
                courseCode: currentActiveCourseCode || "",
                courseName: currentActiveCourse,
                instructorName: currentTeacherName,
                headers: ["Student ID", "Student Name", "Score"],
                rows: rows
            });
        }

        function openPrintExamModal() {
            currentExams = getExams();
            currentExamScores = getExamScores();
            if (currentExams.length === 0) {
                showTrackedAlert("No exams found for this course. Please create an exam first.", "No Exams", "info");
                return;
            }
            const lockedExs = getLockedExams();
            const savedList = currentExams.filter(ex => lockedExs.includes(parseInt(ex.num, 10)));
            if (savedList.length === 0) {
                showTrackedAlert("No saved exams found for this course. Please enter scores and click 'Save Scores' first before printing.", "Save Required", "warning");
                return;
            }
            if (printExamSelect) {
                printExamSelect.innerHTML = savedList.map(ex => 
                    `<option value="${ex.num}">${escapeHtml(ex.name)} (Max: ${ex.maxScore} pts)</option>`
                ).join("");
            }
            if (printExamModalOverlay) {
                printExamModalOverlay.classList.add("show");
            }
        }

        function closePrintExamModal() {
            if (printExamModalOverlay) {
                printExamModalOverlay.classList.remove("show");
            }
        }

        if (printExamBtn) printExamBtn.addEventListener("click", openPrintExamModal);
        if (closePrintExamModalBtn) closePrintExamModalBtn.addEventListener("click", closePrintExamModal);
        if (cancelPrintExamModalBtn) cancelPrintExamModalBtn.addEventListener("click", closePrintExamModal);
        if (printExamModalOverlay) {
            printExamModalOverlay.addEventListener("click", (e) => {
                if (e.target === printExamModalOverlay) closePrintExamModal();
            });
        }
        if (printExamForm) {
            printExamForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const chosen = printExamSelect ? printExamSelect.value : null;
                if (chosen) {
                    printSingleExam(chosen);
                    closePrintExamModal();
                }
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
        const attendanceStorageKey = `tracked_course_attendance_${currentTidKey}_${currentActiveCourse}`;
        const studentHistoryKey    = `tracked_attendance_${currentActiveCourse.trim().toLowerCase()}`;

        function getAllAttendanceRecords() {
            let raw = localStorage.getItem(attendanceStorageKey);
            if (raw === null) {
                raw = localStorage.getItem(`tracked_course_attendance_${currentActiveCourse}`);
            }
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
            localStorage.setItem(`tracked_course_attendance_${currentActiveCourse}`, JSON.stringify(attendanceMap));
        }

        function formatDisplayDate(dateStr) {
            if (!dateStr) return "";
            try {
                const parts = String(dateStr).trim().split("-");
                if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const d = parseInt(parts[2], 10);
                    const dateObj = new Date(y, m, d);
                    return dateObj.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
                }
            } catch (e) {}
            return dateStr;
        }

        function getTodayLocalDate() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
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

        let activeAttendanceDraft = {};

        // Render attendance table for a given date
        function loadAttendanceForDate(dateStr) {
            const courseMinDate = getCourseCreationDate(currentActiveCourse);
            const todayStr = getTodayLocalDate();

            // Clamp past date prior to course creation
            if (dateStr && dateStr < courseMinDate) {
                showTrackedAlert(`Cannot record attendance prior to the course creation date (${formatDisplayDate(courseMinDate)}). Setting date to ${formatDisplayDate(courseMinDate)}.`, "Date Restriction", "warning");
                dateStr = courseMinDate;
                attendanceDateInput.value = courseMinDate;
            }
            // Clamp future date
            if (dateStr && dateStr > todayStr) {
                showTrackedAlert("Cannot record attendance for future dates. Setting date to today.", "Date Restriction", "warning");
                dateStr = todayStr;
                attendanceDateInput.value = todayStr;
            }
            // Prevent recording on Saturday/Sunday (no Saturday classes)
            if (isSaturday(dateStr)) {
                const validDate = getLatestValidClassDate(dateStr);
                if (validDate >= courseMinDate) {
                    showTrackedAlert("Cannot record attendance on Saturday as there are no Saturday classes. Selecting most recent class date (Friday).", "Class Schedule Notice", "warning");
                    dateStr = validDate;
                    attendanceDateInput.value = validDate;
                } else {
                    showTrackedAlert("Cannot record attendance on Saturday as there are no Saturday classes.", "Class Schedule Notice", "warning");
                    dateStr = courseMinDate;
                    attendanceDateInput.value = courseMinDate;
                }
            } else if (isSunday(dateStr)) {
                const validDate = getLatestValidClassDate(dateStr);
                if (validDate >= courseMinDate) {
                    showTrackedAlert("Cannot record attendance on Sunday as there are no Sunday classes. Selecting most recent class date (Friday).", "Class Schedule Notice", "warning");
                    dateStr = validDate;
                    attendanceDateInput.value = validDate;
                } else {
                    showTrackedAlert("Cannot record attendance on Sunday as there are no Sunday classes.", "Class Schedule Notice", "warning");
                    dateStr = courseMinDate;
                    attendanceDateInput.value = courseMinDate;
                }
            }

            attendanceMap = getAllAttendanceRecords();
            const enrolledStudents = getEnrolledStudentsForCourse(currentActiveCourse);
            const hasRecord = Boolean(attendanceMap[dateStr]);
            const dayRecord = attendanceMap[dateStr] || {};

            // Update date badge
            if (attendanceDateBadge) {
                if (hasRecord) {
                    attendanceDateBadge.className = "attendance-date-badge recorded";
                    attendanceDateBadge.innerHTML = `<i class="fa-solid fa-lock"></i> Saved & Locked`;
                } else {
                    attendanceDateBadge.className = "attendance-date-badge new";
                    attendanceDateBadge.innerHTML = `<i class="fa-solid fa-pen"></i> New Date`;
                }
            }

            // Show info banner if loading a previously recorded date
            if (attendanceAlertBanner && attendanceAlertMsg) {
                if (hasRecord) {
                    attendanceAlertBanner.className = "modal-alert info";
                    attendanceAlertBanner.display = "flex";
                    attendanceAlertMsg.textContent = `Attendance for ${formatDisplayDate(dateStr)} has been recorded and locked. It cannot be edited.`;
                } else {
                    attendanceAlertBanner.style.display = "none";
                }
            }

            // Update save button state
            if (saveAttendanceBtn) {
                if (hasRecord) {
                    saveAttendanceBtn.disabled = true;
                    saveAttendanceBtn.classList.add("btn-locked");
                    saveAttendanceBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Attendance Saved & Locked`;
                    saveAttendanceBtn.title = "Attendance for this date is already saved and locked";
                } else {
                    saveAttendanceBtn.disabled = false;
                    saveAttendanceBtn.classList.remove("btn-locked");
                    saveAttendanceBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Attendance`;
                    saveAttendanceBtn.title = "";
                }
            }

            // Update print button state
            const printAttendanceBtn = document.getElementById("printAttendanceBtn");
            if (printAttendanceBtn) {
                printAttendanceBtn.disabled = false;
                printAttendanceBtn.title = hasRecord ? "Download saved attendance report (PDF)" : "Download current attendance sheet (PDF)";
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
                const stDropped = isStudentDropped(st);

                if (stDropped) {
                    tr.classList.add("student-dropped-row");
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(st.id)}</strong></td>
                        <td>${escapeHtml(formatStudentName(st))}</td>
                        <td>
                            <span class="attendance-dropped-badge" title="Student is dropped - Attendance cannot be recorded">
                                <i class="fa-solid fa-user-slash"></i> Dropped
                            </span>
                        </td>
                    `;
                } else {
                    // If hasRecord, use saved status; otherwise use active draft selection or default to absent
                    const currentStatus = hasRecord 
                        ? (dayRecord[st.id] || "absent") 
                        : (activeAttendanceDraft[st.id] || "absent");
                    const disabledAttr = hasRecord ? "disabled" : "";

                    tr.innerHTML = `
                        <td><strong>${escapeHtml(st.id)}</strong></td>
                        <td>${escapeHtml(formatStudentName(st))}</td>
                        <td>
                            <select class="attendance-select" data-student-id="${escapeHtml(st.id)}" ${disabledAttr}>
                                <option value="absent" ${currentStatus === "absent" ? "selected" : ""}>Absent</option>
                                <option value="present" ${currentStatus === "present" ? "selected" : ""}>Present</option>
                                <option value="late" ${currentStatus === "late" ? "selected" : ""}>Late</option>
                            </select>
                        </td>
                    `;
                }
                attendanceTableBody.appendChild(tr);

                const selectEl = tr.querySelector(".attendance-select");
                if (selectEl) {
                    updateSelectStatusClass(selectEl);
                    selectEl.addEventListener("change", () => {
                        updateSelectStatusClass(selectEl);
                        activeAttendanceDraft[st.id] = selectEl.value;
                    });
                }
            });
        }

        // Set min and max date constraints (course creation date to today)
        const courseMinDate = getCourseCreationDate(currentActiveCourse);
        const todayLocalStr = getTodayLocalDate();
        attendanceDateInput.setAttribute("min", courseMinDate);
        attendanceDateInput.setAttribute("max", todayLocalStr);

        // Default date selection: default to today (or Friday if today is Saturday/Sunday)
        const initialValidDate = getLatestValidClassDate(todayLocalStr);
        if (!attendanceDateInput.value || attendanceDateInput.value > todayLocalStr) {
            attendanceDateInput.value = initialValidDate >= courseMinDate ? initialValidDate : courseMinDate;
        } else if (attendanceDateInput.value < courseMinDate) {
            attendanceDateInput.value = courseMinDate;
        } else if (isSaturday(attendanceDateInput.value) || isSunday(attendanceDateInput.value)) {
            const v = getLatestValidClassDate(attendanceDateInput.value);
            attendanceDateInput.value = v >= courseMinDate ? v : courseMinDate;
        }

        // Load initial date
        loadAttendanceForDate(attendanceDateInput.value);

        // When teacher picks or navigates any date using the date selector:
        attendanceDateInput.addEventListener("change", () => {
            activeAttendanceDraft = {};
            let chosenDate = attendanceDateInput.value;
            if (!chosenDate) return;
            const minD = getCourseCreationDate(currentActiveCourse);
            const maxD = getTodayLocalDate();
            if (chosenDate < minD) {
                showTrackedAlert(`Cannot record attendance prior to the course creation date (${formatDisplayDate(minD)}). Setting date to ${formatDisplayDate(minD)}.`, "Date Restriction", "warning");
                attendanceDateInput.value = minD;
                chosenDate = minD;
            } else if (chosenDate > maxD) {
                showTrackedAlert("Cannot record attendance for future dates. Setting date to today.", "Date Restriction", "warning");
                attendanceDateInput.value = maxD;
                chosenDate = maxD;
            }
            if (isSaturday(chosenDate)) {
                const validDate = getLatestValidClassDate(chosenDate);
                if (validDate >= minD) {
                    showTrackedAlert("Cannot record attendance on Saturday as there are no Saturday classes. Selecting most recent class date (Friday).", "Class Schedule Notice", "warning");
                    chosenDate = validDate;
                    attendanceDateInput.value = validDate;
                } else {
                    showTrackedAlert("Cannot record attendance on Saturday as there are no Saturday classes.", "Class Schedule Notice", "warning");
                    chosenDate = minD;
                    attendanceDateInput.value = minD;
                }
            } else if (isSunday(chosenDate)) {
                const validDate = getLatestValidClassDate(chosenDate);
                if (validDate >= minD) {
                    showTrackedAlert("Cannot record attendance on Sunday as there are no Sunday classes. Selecting most recent class date (Friday).", "Class Schedule Notice", "warning");
                    chosenDate = validDate;
                    attendanceDateInput.value = validDate;
                } else {
                    showTrackedAlert("Cannot record attendance on Sunday as there are no Sunday classes.", "Class Schedule Notice", "warning");
                    chosenDate = minD;
                    attendanceDateInput.value = minD;
                }
            }
            loadAttendanceForDate(chosenDate);
        });

        // "Today" quick button
        const todayDateBtn = document.getElementById("todayDateBtn");
        if (todayDateBtn) {
            todayDateBtn.addEventListener("click", () => {
                activeAttendanceDraft = {};
                const todayStr = getTodayLocalDate();
                const courseMin = getCourseCreationDate(currentActiveCourse);
                if (isSaturday(todayStr)) {
                    const validDate = getLatestValidClassDate(todayStr);
                    const targetDate = validDate >= courseMin ? validDate : courseMin;
                    showTrackedAlert("Today is Saturday. There are no Saturday classes, so displaying most recent class date (Friday).", "Class Schedule Notice", "warning");
                    attendanceDateInput.value = targetDate;
                    loadAttendanceForDate(targetDate);
                    return;
                }
                if (isSunday(todayStr)) {
                    const validDate = getLatestValidClassDate(todayStr);
                    const targetDate = validDate >= courseMin ? validDate : courseMin;
                    showTrackedAlert("Today is Sunday. There are no Sunday classes, so displaying most recent class date (Friday).", "Class Schedule Notice", "warning");
                    attendanceDateInput.value = targetDate;
                    loadAttendanceForDate(targetDate);
                    return;
                }
                attendanceDateInput.value = todayStr;
                loadAttendanceForDate(todayStr);
            });
        }

        // Reactive cloud sync listener (preserves unsaved active draft)
        window.addEventListener("tracked_sync_completed", () => {
            attendanceMap = getAllAttendanceRecords();
            if (attendanceDateInput && attendanceDateInput.value) {
                const dateKey = attendanceDateInput.value;
                if (attendanceMap[dateKey]) {
                    loadAttendanceForDate(dateKey);
                }
            }
        });

        // Print Attendance Action Handler
        function doPrintAttendance() {
            const dateKey = (attendanceDateInput && attendanceDateInput.value) ? attendanceDateInput.value : getTodayLocalDate();
            if (!dateKey) {
                showTrackedAlert("Please select a date first.", "Date Required", "info");
                return;
            }
            const isSaved = Boolean(attendanceMap[dateKey]);
            const dayRecord = attendanceMap[dateKey] || {};
            const activeEnrolled = getEnrolledStudentsForCourse(currentActiveCourse);
            const sorted = [...activeEnrolled].sort((a, b) => studentSortKey(a).localeCompare(studentSortKey(b)));

            const rows = sorted.map((st) => {
                const stDropped = isStudentDropped(st);
                let statusBadge = "";
                if (stDropped) {
                    statusBadge = `<span class="badge badge-dropped">Dropped</span>`;
                } else {
                    let stStatus = "absent";
                    if (isSaved) {
                        stStatus = dayRecord[st.id] || "absent";
                    } else {
                        const selectEl = document.querySelector(`.attendance-select[data-student-id="${st.id}"]`);
                        stStatus = selectEl ? selectEl.value : (activeAttendanceDraft[st.id] || dayRecord[st.id] || "absent");
                    }

                    if (stStatus === "present") {
                        statusBadge = `<span class="badge badge-present">Present</span>`;
                    } else if (stStatus === "late") {
                        statusBadge = `<span class="badge badge-late">Late</span>`;
                    } else {
                        statusBadge = `<span class="badge badge-absent">Absent</span>`;
                    }
                }
                return [
                    escapeHtml(st.id),
                    escapeHtml(formatStudentName(st)),
                    statusBadge
                ];
            });

            printAcademicReport({
                reportTitle: "Student Attendance Record",
                assessmentName: null,
                dateStr: dateKey,
                courseCode: currentActiveCourseCode || "",
                courseName: currentActiveCourse,
                instructorName: currentTeacherName,
                headers: ["Student ID", "Student Name", "Attendance Status"],
                rows: rows
            });
        }

        const printAttendanceBtn = document.getElementById("printAttendanceBtn");
        if (printAttendanceBtn) printAttendanceBtn.addEventListener("click", doPrintAttendance);

        // Save Attendance button handler
        if (saveAttendanceBtn) {
            saveAttendanceBtn.addEventListener("click", () => {
                const dateKey = attendanceDateInput.value;
                if (!dateKey) {
                    showTrackedAlert("Please select a date first.", "Date Required", "info");
                    return;
                }

                const courseMinDate = getCourseCreationDate(currentActiveCourse);
                const todayStr = getTodayLocalDate();
                if (dateKey < courseMinDate) {
                    showTrackedAlert(`Cannot record attendance prior to the course creation date (${formatDisplayDate(courseMinDate)}).`, "Date Restriction", "warning");
                    return;
                }
                if (dateKey > todayStr) {
                    showTrackedAlert("Cannot record attendance for future dates.", "Date Restriction", "warning");
                    return;
                }
                if (isSaturday(dateKey)) {
                    showTrackedAlert("Cannot record attendance on Saturday as there are no Saturday classes.", "Class Schedule Notice", "warning");
                    return;
                }
                if (isSunday(dateKey)) {
                    showTrackedAlert("Cannot record attendance on Sunday as there are no Sunday classes.", "Class Schedule Notice", "warning");
                    return;
                }

                if (attendanceMap[dateKey]) {
                    showTrackedAlert("Attendance for this date has already been saved and is locked.", "Record Locked", "info");
                    return;
                }

                const selects = attendanceTableBody.querySelectorAll(".attendance-select:not([disabled])");
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

                // Enrolled students who are dropped
                const activeEnrolled = getEnrolledStudentsForCourse(currentActiveCourse);
                activeEnrolled.forEach(st => {
                    if (isStudentDropped(st)) {
                        dayStatusMap[st.id] = "dropped";
                    }
                });

                // Save for this exact date key
                attendanceMap[dateKey] = dayStatusMap;
                saveAllAttendanceRecords();

                // Sync to Supabase Cloud if connected
                if (window.TrackED_DB && typeof window.TrackED_DB.saveAttendanceToCloud === "function") {
                    window.TrackED_DB.saveAttendanceToCloud(currentActiveCourse, dateKey, dayStatusMap);
                }

                // Sync Late and Absent records into student portal attendance history for ALL active enrolled students
                const sortedDates = Object.keys(attendanceMap).sort().reverse();
                activeEnrolled.forEach(st => {
                    if (isStudentDropped(st)) return;
                    const stHistoryKey = `tracked_attendance_${currentActiveCourse.trim().toLowerCase()}_${st.id.trim().toLowerCase()}`;
                    const stHistoryRecords = [];
                    sortedDates.forEach(d => {
                        const stMap = attendanceMap[d];
                        const status = stMap ? (stMap[st.id] || stMap[st.id.toLowerCase()]) : null;
                        if (status === "late" || status === "absent") {
                            stHistoryRecords.push({
                                date: formatDisplayDate(d),
                                status: status === "late" ? "Late" : "Absent"
                            });
                        }
                    });
                    localStorage.setItem(stHistoryKey, JSON.stringify(stHistoryRecords));
                });

                // Also populate studentHistoryKey for general fallback
                const studentHistoryRecords = [];
                sortedDates.forEach(d => {
                    const stMap = attendanceMap[d];
                    if (!stMap) return;
                    activeEnrolled.forEach(st => {
                        if (isStudentDropped(st)) return;
                        const status = stMap[st.id] || stMap[st.id.toLowerCase()];
                        if (status === "late" || status === "absent") {
                            studentHistoryRecords.push({
                                studentId: st.id,
                                date: formatDisplayDate(d),
                                status: status === "late" ? "Late" : "Absent"
                            });
                        }
                    });
                });
                localStorage.setItem(studentHistoryKey, JSON.stringify(studentHistoryRecords));

                // Clear working draft and immediately re-load for this date so all fields and buttons lock
                activeAttendanceDraft = {};
                loadAttendanceForDate(dateKey);

                if (attendanceAlertBanner && attendanceAlertMsg) {
                    attendanceAlertBanner.className = "modal-alert success";
                    attendanceAlertBanner.style.display = "flex";
                    const summaryMsg = (lateCount === 0 && absentCount === 0)
                        ? "All students marked Present!"
                        : `Recorded: ${absentCount > 0 ? absentCount + " Absent" : ""}${absentCount > 0 && lateCount > 0 ? ", " : ""}${lateCount > 0 ? lateCount + " Late" : ""}`;
                    attendanceAlertMsg.textContent = `Attendance for ${formatDisplayDate(dateKey)} saved successfully! This record is now locked and cannot be edited. (${summaryMsg})`;
                }
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

    // Immediate cloud sync trigger on every teacher page load
    if (window.TrackED_DB && typeof window.TrackED_DB.syncAllFromCloud === "function") {
        window.TrackED_DB.syncAllFromCloud();
    }
});


/**
 * ====================================================================
 * TrackED Administrator Portal - Admin Dashboard Controller
 * ====================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Session & Role Verification Guard
    const userRole = localStorage.getItem("tracked_user_role");
    if (userRole !== "admin") {
        console.warn("[TrackED Admin] Unauthorized access. Redirecting to login...");
        window.location.href = "../index.html";
        return;
    }

    // 2. DOM Elements Selection
    const accountBtn = document.getElementById("accountBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const adminLogoutLink = document.getElementById("adminLogoutLink");

    // Stats
    const statTotalTeachers = document.getElementById("statTotalTeachers");
    const statTotalStudents = document.getElementById("statTotalStudents");
    const statCloudStatus   = document.getElementById("statCloudStatus");
    const facultyCountBadge = document.getElementById("facultyCountBadge");

    // Directory & Search
    const facultyTableBody  = document.getElementById("facultyTableBody");
    const facultySearchInput = document.getElementById("facultySearchInput");
    const emptyFacultyState = document.getElementById("emptyFacultyState");
    const emptyStateTitle   = document.getElementById("emptyStateTitle");
    const emptyStateMsg     = document.getElementById("emptyStateMsg");

    // Add Faculty Modal
    const openAddFacultyBtn   = document.getElementById("openAddFacultyBtn");
    const headerAddFacultyBtn = document.getElementById("headerAddFacultyBtn");
    const addFacultyModalOverlay = document.getElementById("addFacultyModalOverlay");
    const closeAddFacultyModal   = document.getElementById("closeAddFacultyModal");
    const cancelAddFacultyBtn    = document.getElementById("cancelAddFacultyBtn");
    const addFacultyForm         = document.getElementById("addFacultyForm");
    const saveFacultyBtn         = document.getElementById("saveFacultyBtn");
    const facultyErrorAlert      = document.getElementById("facultyErrorAlert");
    const facultyErrorMsg        = document.getElementById("facultyErrorMsg");
    const facultySuccessAlert    = document.getElementById("facultySuccessAlert");
    const facultySuccessMsg      = document.getElementById("facultySuccessMsg");

    // Form Inputs
    const facultyIdInput   = document.getElementById("facultyIdInput");
    const firstNameInput   = document.getElementById("firstNameInput");
    const middleNameInput  = document.getElementById("middleNameInput");
    const lastNameInput    = document.getElementById("lastNameInput");
    const departmentInput  = document.getElementById("departmentInput");
    const previewFormattedName = document.getElementById("previewFormattedName");

    // Delete Modal
    const deleteFacultyModalOverlay = document.getElementById("deleteFacultyModalOverlay");
    const closeDeleteFacultyModal   = document.getElementById("closeDeleteFacultyModal");
    const cancelDeleteFacultyBtn    = document.getElementById("cancelDeleteFacultyBtn");
    const confirmDeleteFacultyBtn   = document.getElementById("confirmDeleteFacultyBtn");
    const deleteTargetName          = document.getElementById("deleteTargetName");
    const deleteTargetId            = document.getElementById("deleteTargetId");
    const deleteTargetDept          = document.getElementById("deleteTargetDept");

    // State Variables
    let allTeachers = [];
    let pendingDeleteTeacher = null;

    // =========================================
    // 3. TOAST NOTIFICATION UTILITY
    // =========================================
    function showToast(message, type = "success") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        const icon = type === "success" ? "fa-circle-check" : "fa-circle-exclamation";
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // =========================================
    // 4. DROPDOWN & LOGOUT HANDLER
    // =========================================
    if (accountBtn && dropdownMenu) {
        accountBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle("show");
        });

        document.addEventListener("click", () => {
            dropdownMenu.classList.remove("show");
        });
    }

    if (adminLogoutLink) {
        adminLogoutLink.addEventListener("click", (e) => {
            if (window.TrackED_DB && typeof window.TrackED_DB.logout === "function") {
                window.TrackED_DB.logout();
            }
        });
    }

    // =========================================
    // 5. LOAD & RENDER DATA
    // =========================================
    async function loadDashboardData() {
        // 1. Fetch Stats
        if (window.TrackED_DB && typeof window.TrackED_DB.getAdminStats === "function") {
            try {
                const stats = await window.TrackED_DB.getAdminStats();
                if (statTotalTeachers) statTotalTeachers.textContent = stats.teacherCount || 0;
                if (statTotalStudents) statTotalStudents.textContent = stats.studentCount || 0;

                if (statCloudStatus) {
                    if (stats.isCloudConnected) {
                        statCloudStatus.innerHTML = `<span class="pulse-dot"></span> Connected`;
                        statCloudStatus.className = "stat-value cloud-badge";
                    } else {
                        statCloudStatus.innerHTML = `<i class="fa-solid fa-hard-drive"></i> Local Cache`;
                        statCloudStatus.className = "stat-value";
                        statCloudStatus.style.color = "#ea580c";
                    }
                }
            } catch (e) {
                console.warn("[TrackED Admin] Stats error:", e);
            }
        }

        // 2. Fetch Teachers
        if (window.TrackED_DB && typeof window.TrackED_DB.getAllTeachers === "function") {
            try {
                const res = await window.TrackED_DB.getAllTeachers();
                if (res.success && Array.isArray(res.data)) {
                    allTeachers = res.data;
                    renderFacultyTable(allTeachers);
                }
            } catch (e) {
                console.error("[TrackED Admin] Error loading teachers:", e);
                if (facultyTableBody) {
                    facultyTableBody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error loading faculty records.</td></tr>`;
                }
            }
        }
    }

    function renderFacultyTable(teachers) {
        if (!facultyTableBody) return;

        if (facultyCountBadge) {
            facultyCountBadge.textContent = `${teachers.length} Instructor${teachers.length === 1 ? "" : "s"}`;
        }

        if (teachers.length === 0) {
            facultyTableBody.innerHTML = "";
            if (emptyFacultyState) {
                emptyFacultyState.style.display = "block";
                if (facultySearchInput && facultySearchInput.value.trim()) {
                    emptyStateTitle.textContent = "No Matching Instructors";
                    emptyStateMsg.textContent = `No faculty found matching "${facultySearchInput.value.trim()}". Try a different search.`;
                } else {
                    emptyStateTitle.textContent = "No Faculty Registered";
                    emptyStateMsg.textContent = "Click 'Add Faculty' to register your first instructor.";
                }
            }
            return;
        }

        if (emptyFacultyState) {
            emptyFacultyState.style.display = "none";
        }

        facultyTableBody.innerHTML = teachers.map(t => {
            const tid = t.teacher_id || t.id || "N/A";
            const name = t.name || `${t.last_name || ""}, ${t.first_name || ""}`.trim() || "Instructor";
            const dept = t.department || "General Faculty";
            const hasChangedPwd = t.password_changed === true;

            // Initials avatar
            const initials = name.split(" ")
                .map(n => n.charAt(0))
                .filter(c => /[A-Za-z]/.test(c))
                .slice(0, 2)
                .join("")
                .toUpperCase() || "T";

            const statusBadge = hasChangedPwd
                ? `<span class="status-badge status-custom"><i class="fa-solid fa-lock"></i> Custom Password</span>`
                : `<span class="status-badge status-default" title="Default password: teacher123"><i class="fa-solid fa-key"></i> Default: teacher123</span>`;

            return `
                <tr data-id="${escapeHTML(tid)}">
                    <td><span class="faculty-id-cell">${escapeHTML(tid)}</span></td>
                    <td>
                        <div class="faculty-name-cell">
                            <div class="faculty-avatar-circle">${escapeHTML(initials)}</div>
                            <div class="faculty-info-text">
                                <strong>${escapeHTML(name)}</strong>
                                <small>${escapeHTML(t.role || "Faculty Instructor")}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="dept-badge">${escapeHTML(dept)}</span></td>
                    <td>${statusBadge}</td>
                    <td class="text-center">
                        <button class="btn-table-delete delete-teacher-btn" data-id="${escapeHTML(tid)}" title="Delete Faculty Member">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        // Attach delete events
        document.querySelectorAll(".delete-teacher-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetId = btn.getAttribute("data-id");
                const teacher = allTeachers.find(t => (t.teacher_id || t.id) === targetId);
                if (teacher) {
                    openDeleteModal(teacher);
                }
            });
        });
    }

    function escapeHTML(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // =========================================
    // 6. SEARCH & FILTERING
    // =========================================
    if (facultySearchInput) {
        facultySearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderFacultyTable(allTeachers);
                return;
            }
            const filtered = allTeachers.filter(t => {
                const tid = (t.teacher_id || t.id || "").toLowerCase();
                const name = (t.name || "").toLowerCase();
                const dept = (t.department || "").toLowerCase();
                return tid.includes(query) || name.includes(query) || dept.includes(query);
            });
            renderFacultyTable(filtered);
        });
    }

    // =========================================
    // 7. ADD FACULTY MODAL & LIVE PREVIEW
    // =========================================
    function openAddModal() {
        hideFacultyAlerts();
        if (addFacultyForm) addFacultyForm.reset();
        updateNamePreview();
        if (addFacultyModalOverlay) addFacultyModalOverlay.classList.add("active");
        if (facultyIdInput) setTimeout(() => facultyIdInput.focus(), 100);
    }

    function closeAddModal() {
        if (addFacultyModalOverlay) addFacultyModalOverlay.classList.remove("active");
        hideFacultyAlerts();
    }

    if (openAddFacultyBtn)   openAddFacultyBtn.addEventListener("click", openAddModal);
    if (headerAddFacultyBtn) headerAddFacultyBtn.addEventListener("click", openAddModal);
    if (closeAddFacultyModal) closeAddFacultyModal.addEventListener("click", closeAddModal);
    if (cancelAddFacultyBtn)  cancelAddFacultyBtn.addEventListener("click", closeAddModal);

    if (addFacultyModalOverlay) {
        addFacultyModalOverlay.addEventListener("click", (e) => {
            if (e.target === addFacultyModalOverlay) closeAddModal();
        });
    }

    function updateNamePreview() {
        const first = firstNameInput ? firstNameInput.value.trim() : "";
        const middle = middleNameInput ? middleNameInput.value.trim() : "";
        const last = lastNameInput ? lastNameInput.value.trim() : "";

        if (!first && !last) {
            if (previewFormattedName) previewFormattedName.textContent = "LastName, FirstName";
            return;
        }

        const mi = middle ? middle.charAt(0).toUpperCase() + "." : "";
        const formatted = mi ? `${last || "LastName"}, ${first || "FirstName"} ${mi}` : `${last || "LastName"}, ${first || "FirstName"}`;
        if (previewFormattedName) previewFormattedName.textContent = formatted;
    }

    [firstNameInput, middleNameInput, lastNameInput].forEach(inp => {
        if (inp) inp.addEventListener("input", updateNamePreview);
    });

    function showFacultyAlert(message, type = "danger") {
        if (type === "danger") {
            if (facultyErrorMsg) facultyErrorMsg.textContent = message;
            if (facultyErrorAlert) facultyErrorAlert.style.display = "flex";
            if (facultySuccessAlert) facultySuccessAlert.style.display = "none";
        } else {
            if (facultySuccessMsg) facultySuccessMsg.textContent = message;
            if (facultySuccessAlert) facultySuccessAlert.style.display = "flex";
            if (facultyErrorAlert) facultyErrorAlert.style.display = "none";
        }
    }

    function hideFacultyAlerts() {
        if (facultyErrorAlert) facultyErrorAlert.style.display = "none";
        if (facultySuccessAlert) facultySuccessAlert.style.display = "none";
    }

    // FORM SUBMISSION
    if (addFacultyForm) {
        addFacultyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideFacultyAlerts();

            const tid = facultyIdInput ? facultyIdInput.value.trim() : "";
            const first = firstNameInput ? firstNameInput.value.trim() : "";
            const middle = middleNameInput ? middleNameInput.value.trim() : "";
            const last = lastNameInput ? lastNameInput.value.trim() : "";
            const dept = departmentInput ? departmentInput.value.trim() : "";

            if (!tid || !first || !last || !dept) {
                showFacultyAlert("Please fill in all required fields (ID, First Name, Last Name, and Department).", "danger");
                return;
            }

            if (saveFacultyBtn) {
                saveFacultyBtn.disabled = true;
                saveFacultyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Adding Faculty...`;
            }

            try {
                const res = await window.TrackED_DB.addFacultyTeacher({
                    teacher_id: tid,
                    first_name: first,
                    middle_name: middle,
                    last_name: last,
                    department: dept
                });

                if (res.success) {
                    showFacultyAlert(`Faculty "${res.teacher.name}" added successfully!`, "success");
                    showToast(`Instructor ${res.teacher.name} registered with default password!`, "success");

                    setTimeout(() => {
                        closeAddModal();
                        if (saveFacultyBtn) {
                            saveFacultyBtn.disabled = false;
                            saveFacultyBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Faculty`;
                        }
                        loadDashboardData();
                    }, 800);
                } else {
                    showFacultyAlert(res.message || "Failed to add faculty member.", "danger");
                    if (saveFacultyBtn) {
                        saveFacultyBtn.disabled = false;
                        saveFacultyBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Faculty`;
                    }
                }
            } catch (err) {
                console.error("[TrackED Admin] Add error:", err);
                showFacultyAlert("An unexpected error occurred while saving to database.", "danger");
                if (saveFacultyBtn) {
                    saveFacultyBtn.disabled = false;
                    saveFacultyBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Faculty`;
                }
            }
        });
    }

    // =========================================
    // 8. DELETE FACULTY MODAL & HANDLERS
    // =========================================
    function openDeleteModal(teacher) {
        pendingDeleteTeacher = teacher;
        const tid = teacher.teacher_id || teacher.id;
        const name = teacher.name || `${teacher.last_name}, ${teacher.first_name}`;
        const dept = teacher.department || "General Faculty";

        if (deleteTargetName) deleteTargetName.textContent = name;
        if (deleteTargetId)   deleteTargetId.textContent = tid;
        if (deleteTargetDept) deleteTargetDept.textContent = dept;

        if (deleteFacultyModalOverlay) deleteFacultyModalOverlay.classList.add("active");
    }

    function closeDeleteModal() {
        pendingDeleteTeacher = null;
        if (deleteFacultyModalOverlay) deleteFacultyModalOverlay.classList.remove("active");
    }

    if (closeDeleteFacultyModal) closeDeleteFacultyModal.addEventListener("click", closeDeleteModal);
    if (cancelDeleteFacultyBtn)  cancelDeleteFacultyBtn.addEventListener("click", closeDeleteModal);

    if (deleteFacultyModalOverlay) {
        deleteFacultyModalOverlay.addEventListener("click", (e) => {
            if (e.target === deleteFacultyModalOverlay) closeDeleteModal();
        });
    }

    if (confirmDeleteFacultyBtn) {
        confirmDeleteFacultyBtn.addEventListener("click", async () => {
            if (!pendingDeleteTeacher) return;
            const tid = pendingDeleteTeacher.teacher_id || pendingDeleteTeacher.id;
            const name = pendingDeleteTeacher.name || tid;

            confirmDeleteFacultyBtn.disabled = true;
            confirmDeleteFacultyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;

            try {
                const res = await window.TrackED_DB.deleteFacultyTeacher(tid);
                if (res.success) {
                    showToast(`Instructor ${name} (${tid}) deleted successfully.`, "success");
                    closeDeleteModal();
                    loadDashboardData();
                } else {
                    showToast(res.message || "Failed to delete instructor.", "error");
                }
            } catch (err) {
                console.error("[TrackED Admin] Delete error:", err);
                showToast("Failed to delete instructor.", "error");
            } finally {
                confirmDeleteFacultyBtn.disabled = false;
                confirmDeleteFacultyBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete Instructor`;
            }
        });
    }

    // Initial Load
    await loadDashboardData();
});

document.addEventListener("DOMContentLoaded", () => {
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
    // LOAD SAVED TEACHER PROFILE DATA
    // =========================================
    const teacherName = localStorage.getItem("tracked_teacher_name") || "Billie Eilish";
    const facultyId   = localStorage.getItem("tracked_teacher_id") || "FAC-2026-001";
    const department  = localStorage.getItem("tracked_teacher_dept") || "College of Computer Studies";
    const savedRecoveryEmail = localStorage.getItem("tracked_teacher_recovery_email") || 
                               localStorage.getItem("tracked_recovery_email") || 
                               "";
    const savedPhone  = localStorage.getItem("tracked_teacher_phone") || 
                        localStorage.getItem("tracked_phone") || 
                        "";

    const headerUserName      = document.getElementById("headerUserName");
    const avatarDisplayName   = document.getElementById("avatarDisplayName");
    const profileFullName     = document.getElementById("profileFullName");
    const profileIdNumber     = document.getElementById("profileIdNumber");
    const profileDepartment   = document.getElementById("profileDepartment");
    const profileEmail        = document.getElementById("profileEmail");
    const profilePhone        = document.getElementById("profilePhone");

    if (headerUserName)    headerUserName.textContent = teacherName;
    if (avatarDisplayName) avatarDisplayName.textContent = teacherName;
    if (profileFullName)   profileFullName.value = teacherName;
    if (profileIdNumber)   profileIdNumber.value = facultyId;
    if (profileDepartment) profileDepartment.value = department;
    if (profileEmail)      profileEmail.value = savedRecoveryEmail;
    if (profilePhone)      profilePhone.value = savedPhone;

    // =========================================
    // TAB SWITCHING LOGIC
    // =========================================
    const navTabBtns = document.querySelectorAll(".nav-tab-btn");
    const tabPanels  = document.querySelectorAll(".tab-panel");

    function switchTab(tabKey) {
        navTabBtns.forEach(btn => {
            if (btn.getAttribute("data-tab") === tabKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        tabPanels.forEach(panel => {
            if (panel.id === `panel-${tabKey}`) {
                panel.classList.add("active");
            } else {
                panel.classList.remove("active");
            }
        });
    }

    navTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            switchTab(targetTab);
        });
    });

    // Support URL parameters for direct tab navigation (e.g. ?tab=profile or #profile)
    const urlParams = new URLSearchParams(window.location.search);
    const queryTab  = urlParams.get("tab");
    const hashTab   = window.location.hash.replace("#", "");

    if (queryTab && ["security", "profile", "preferences"].includes(queryTab)) {
        switchTab(queryTab);
    } else if (hashTab && ["security", "profile", "preferences"].includes(hashTab)) {
        switchTab(hashTab);
    }

    // =========================================
    // PASSWORD SHOW / HIDE TOGGLE
    // =========================================
    const togglePwdBtns = document.querySelectorAll(".toggle-pwd-btn");

    togglePwdBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const input = btn.previousElementSibling;
            const icon = btn.querySelector("i");
            if (!input) return;

            if (input.type === "password") {
                input.type = "text";
                if (icon) {
                    icon.classList.remove("fa-eye");
                    icon.classList.add("fa-eye-slash");
                }
            } else {
                input.type = "password";
                if (icon) {
                    icon.classList.remove("fa-eye-slash");
                    icon.classList.add("fa-eye");
                }
            }
        });
    });

    // =========================================
    // CHANGE PASSWORD FORM HANDLER
    // =========================================
    const changePasswordForm = document.getElementById("changePasswordForm");
    const currentPassword    = document.getElementById("currentPassword");
    const newPassword        = document.getElementById("newPassword");
    const confirmPassword    = document.getElementById("confirmPassword");
    const pwdSuccessAlert    = document.getElementById("pwdSuccessAlert");
    const pwdSuccessMsg      = document.getElementById("pwdSuccessMsg");
    const pwdErrorAlert      = document.getElementById("pwdErrorAlert");
    const pwdErrorMsg        = document.getElementById("pwdErrorMsg");

    function showPwdError(msg) {
        if (pwdErrorAlert && pwdErrorMsg) {
            pwdErrorMsg.textContent = msg;
            pwdErrorAlert.style.display = "flex";
        }
        if (pwdSuccessAlert) pwdSuccessAlert.style.display = "none";
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", (e) => {
            e.preventDefault();

            if (pwdSuccessAlert) pwdSuccessAlert.style.display = "none";
            if (pwdErrorAlert)   pwdErrorAlert.style.display   = "none";

            const currentVal = currentPassword ? currentPassword.value.trim() : "";
            const newVal     = newPassword ? newPassword.value.trim() : "";
            const confirmVal = confirmPassword ? confirmPassword.value.trim() : "";

            if (!currentVal || !newVal || !confirmVal) {
                showPwdError("Please fill out all password fields.");
                return;
            }

            if (newVal.length < 8) {
                showPwdError("New password must be at least 8 characters long.");
                return;
            }

            if (newVal !== confirmVal) {
                showPwdError("New password and confirm password do not match.");
                return;
            }

            if (currentVal === newVal) {
                showPwdError("New password must be different from current password.");
                return;
            }

            // Save new password
            localStorage.setItem("tracked_teacher_password", newVal);
            localStorage.setItem("tracked_teacher_password_changed", "true");

            if (window.TrackED_DB && typeof window.TrackED_DB.updatePassword === "function") {
                window.TrackED_DB.updatePassword("teacher", facultyId, newVal);
            }

            // Show success
            if (pwdSuccessAlert && pwdSuccessMsg) {
                pwdSuccessMsg.textContent = "Your teacher password has been updated successfully!";
                pwdSuccessAlert.style.display = "flex";
            }

            // Reset inputs
            if (currentPassword) currentPassword.value = "";
            if (newPassword)     newPassword.value = "";
            if (confirmPassword) confirmPassword.value = "";

            setTimeout(() => {
                if (pwdSuccessAlert) pwdSuccessAlert.style.display = "none";
            }, 4000);
        });
    }

    // =========================================
    // PROFILE DETAILS FORM HANDLER
    // =========================================
    const profileForm         = document.getElementById("profileForm");
    const profileSuccessAlert = document.getElementById("profileSuccessAlert");

    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const updatedEmail = profileEmail ? profileEmail.value.trim() : "";
            const updatedPhone = profilePhone ? profilePhone.value.trim() : "";

            // Save teacher recovery email and phone locally
            if (updatedEmail) {
                localStorage.setItem("tracked_teacher_recovery_email", updatedEmail);
                localStorage.setItem("tracked_recovery_email", updatedEmail); // Also general fallback for forgotPassword
            } else {
                localStorage.removeItem("tracked_teacher_recovery_email");
                localStorage.removeItem("tracked_recovery_email");
            }

            if (updatedPhone) {
                localStorage.setItem("tracked_teacher_phone", updatedPhone);
            } else {
                localStorage.removeItem("tracked_teacher_phone");
            }

            // Sync to Supabase Cloud
            if (window.TrackED_DB && typeof window.TrackED_DB.updateProfile === "function") {
                const teacherId = localStorage.getItem("tracked_teacher_id") || "T-2024-0042";
                await window.TrackED_DB.updateProfile("teacher", teacherId, {
                    email: updatedEmail,
                    phone: updatedPhone
                });
            }

            if (profileSuccessAlert) {
                profileSuccessAlert.style.display = "flex";
                setTimeout(() => {
                    profileSuccessAlert.style.display = "none";
                }, 3500);
            }
        });
    }

    // =========================================
    // AVATAR PHOTO PREVIEW & RESET
    // =========================================
    const avatarFileInput        = document.getElementById("avatarFileInput");
    const settingsAvatarPreview  = document.getElementById("settingsAvatarPreview");
    const headerProfileImg       = document.getElementById("headerProfileImg");
    const resetAvatarBtn         = document.getElementById("resetAvatarBtn");

    const savedAvatar = localStorage.getItem("tracked_teacher_avatar_data") || localStorage.getItem("tracked_avatar_data");
    if (savedAvatar) {
        if (settingsAvatarPreview) settingsAvatarPreview.src = savedAvatar;
        if (headerProfileImg)      headerProfileImg.src      = savedAvatar;
    }

    if (avatarFileInput) {
        avatarFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    if (settingsAvatarPreview) settingsAvatarPreview.src = dataUrl;
                    if (headerProfileImg)      headerProfileImg.src      = dataUrl;
                    localStorage.setItem("tracked_teacher_avatar_data", dataUrl);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (resetAvatarBtn) {
        resetAvatarBtn.addEventListener("click", () => {
            const defaultAvatar = "../images/profile.jpg";
            if (settingsAvatarPreview) settingsAvatarPreview.src = defaultAvatar;
            if (headerProfileImg)      headerProfileImg.src      = defaultAvatar;
            localStorage.removeItem("tracked_teacher_avatar_data");
        });
    }

    // =========================================
    // SYSTEM PREFERENCES (WITH TABLE ROW SPACING)
    // =========================================
    const prefLanguage       = document.getElementById("prefLanguage");
    const prefDateFormat     = document.getElementById("prefDateFormat");
    const prefTableView      = document.getElementById("prefTableView");
    const saveSystemPrefBtn  = document.getElementById("saveSystemPrefBtn");
    const systemSuccessAlert = document.getElementById("systemSuccessAlert");

    const savedLanguage = localStorage.getItem("tracked_teacher_language") || "en";
    const savedDateFmt  = localStorage.getItem("tracked_teacher_date_format") || "mm/dd/yyyy";
    const savedDensity  = localStorage.getItem("tracked_teacher_table_density") || "standard";

    if (prefLanguage)   prefLanguage.value = savedLanguage;
    if (prefDateFormat) prefDateFormat.value = savedDateFmt;
    if (prefTableView)  prefTableView.value = savedDensity;

    if (saveSystemPrefBtn) {
        saveSystemPrefBtn.addEventListener("click", () => {
            if (prefLanguage)   localStorage.setItem("tracked_teacher_language", prefLanguage.value);
            if (prefDateFormat) localStorage.setItem("tracked_teacher_date_format", prefDateFormat.value);
            if (prefTableView)  localStorage.setItem("tracked_teacher_table_density", prefTableView.value);

            if (systemSuccessAlert) {
                systemSuccessAlert.style.display = "flex";
                const originalHtml = saveSystemPrefBtn.innerHTML;
                saveSystemPrefBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Saved!`;
                saveSystemPrefBtn.style.backgroundColor = "#059669";
                setTimeout(() => {
                    systemSuccessAlert.style.display = "none";
                    saveSystemPrefBtn.innerHTML = originalHtml;
                    saveSystemPrefBtn.style.backgroundColor = "";
                }, 2200);
            }
        });
    }
});

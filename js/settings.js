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
    // LOAD SAVED STUDENT PROFILE DATA
    // =========================================
    const studentName = localStorage.getItem("tracked_student_name") || "Billie Eilish";
    const studentId   = localStorage.getItem("tracked_student_id") || "2024-00123";
    const program     = localStorage.getItem("tracked_student_program") || "BS Computer Science • 2nd Year";
    const savedRecoveryEmail = localStorage.getItem("tracked_student_recovery_email") || 
                               localStorage.getItem("tracked_recovery_email") || 
                               "";
    const savedPhone  = localStorage.getItem("tracked_student_phone") || 
                        localStorage.getItem("tracked_phone") || 
                        "";

    const headerUserName      = document.getElementById("headerUserName");
    const avatarDisplayName   = document.getElementById("avatarDisplayName");
    const profileFullName     = document.getElementById("profileFullName");
    const profileIdNumber     = document.getElementById("profileIdNumber");
    const profileProgramDept  = document.getElementById("profileProgramDept");
    const profileEmail        = document.getElementById("profileEmail");
    const profilePhone        = document.getElementById("profilePhone");

    if (headerUserName)     headerUserName.textContent = studentName;
    if (avatarDisplayName)  avatarDisplayName.textContent = studentName;
    if (profileFullName)    profileFullName.value = studentName;
    if (profileIdNumber)    profileIdNumber.value = studentId;
    if (profileProgramDept) profileProgramDept.value = program;
    if (profileEmail)       profileEmail.value = savedRecoveryEmail;
    if (profilePhone)       profilePhone.value = savedPhone;

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

            // Save new student password
            localStorage.setItem("tracked_student_password", newVal);
            localStorage.setItem("tracked_user_password", newVal);
            localStorage.setItem("tracked_student_password_changed", "true");

            if (window.TrackED_DB && typeof window.TrackED_DB.updatePassword === "function") {
                window.TrackED_DB.updatePassword("student", studentId, newVal);
            }

            // Show success
            if (pwdSuccessAlert && pwdSuccessMsg) {
                pwdSuccessMsg.textContent = "Your password has been updated successfully!";
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

            // Save student recovery email and phone locally
            if (updatedEmail) {
                localStorage.setItem("tracked_student_recovery_email", updatedEmail);
                localStorage.setItem("tracked_recovery_email", updatedEmail);
            } else {
                localStorage.removeItem("tracked_student_recovery_email");
                localStorage.removeItem("tracked_recovery_email");
            }

            if (updatedPhone) {
                localStorage.setItem("tracked_student_phone", updatedPhone);
            } else {
                localStorage.removeItem("tracked_student_phone");
            }

            // Sync to Supabase Cloud
            if (window.TrackED_DB && typeof window.TrackED_DB.updateProfile === "function") {
                await window.TrackED_DB.updateProfile("student", studentId, {
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
    // AVATAR PHOTO PREVIEW & RESET (PER-STUDENT & CLOUD SYNC)
    // =========================================
    const avatarFileInput        = document.getElementById("avatarFileInput");
    const settingsAvatarPreview  = document.getElementById("settingsAvatarPreview");
    const headerProfileImg       = document.getElementById("headerProfileImg");
    const resetAvatarBtn         = document.getElementById("resetAvatarBtn");

    const sidKey = studentId.trim().toLowerCase();
    const defaultStudentAvatar = (studentId === "2024-00123") ? "images/profile.jpg" : "images/default-avatar.svg";
    
    // Check per-student avatar first, then general key, then fallback to default
    const savedAvatar = localStorage.getItem(`tracked_student_avatar_${sidKey}`) ||
                        localStorage.getItem("tracked_student_avatar_data") ||
                        defaultStudentAvatar;

    if (settingsAvatarPreview) settingsAvatarPreview.src = savedAvatar;
    if (headerProfileImg)      headerProfileImg.src      = savedAvatar;

    // Helper: Resize & Compress image via Canvas to ~256x256 JPEG (~25-40KB)
    function processAvatarImage(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 256;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
                callback(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    if (avatarFileInput) {
        avatarFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                processAvatarImage(file, (dataUrl) => {
                    if (settingsAvatarPreview) settingsAvatarPreview.src = dataUrl;
                    if (headerProfileImg)      headerProfileImg.src      = dataUrl;

                    // 1. Save locally per-student
                    localStorage.setItem(`tracked_student_avatar_${sidKey}`, dataUrl);
                    localStorage.setItem("tracked_student_avatar_data", dataUrl);

                    // 2. Sync to Supabase Cloud Database
                    if (window.TrackED_DB && typeof window.TrackED_DB.updateAvatar === "function") {
                        window.TrackED_DB.updateAvatar("student", studentId, dataUrl);
                    }
                });
            }
        });
    }

    if (resetAvatarBtn) {
        resetAvatarBtn.addEventListener("click", () => {
            if (settingsAvatarPreview) settingsAvatarPreview.src = defaultStudentAvatar;
            if (headerProfileImg)      headerProfileImg.src      = defaultStudentAvatar;

            localStorage.removeItem(`tracked_student_avatar_${sidKey}`);
            localStorage.removeItem("tracked_student_avatar_data");

            if (window.TrackED_DB && typeof window.TrackED_DB.updateAvatar === "function") {
                window.TrackED_DB.updateAvatar("student", studentId, null);
            }
        });
    }

    // =========================================
    // SYSTEM PREFERENCES HANDLER (LANGUAGE & DATE FORMAT ONLY)
    // =========================================
    const prefLanguage       = document.getElementById("prefLanguage");
    const prefDateFormat     = document.getElementById("prefDateFormat");
    const saveSystemPrefBtn  = document.getElementById("saveSystemPrefBtn");
    const systemSuccessAlert = document.getElementById("systemSuccessAlert");

    const savedLanguage = localStorage.getItem("tracked_student_language") || "en";
    const savedDateFmt  = localStorage.getItem("tracked_student_date_format") || "mm/dd/yyyy";

    if (prefLanguage)   prefLanguage.value = savedLanguage;
    if (prefDateFormat) prefDateFormat.value = savedDateFmt;

    if (saveSystemPrefBtn) {
        saveSystemPrefBtn.addEventListener("click", () => {
            if (prefLanguage)   localStorage.setItem("tracked_student_language", prefLanguage.value);
            if (prefDateFormat) localStorage.setItem("tracked_student_date_format", prefDateFormat.value);

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

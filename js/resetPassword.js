/**
 * ====================================================================
 * TrackED Portal - Link-Based Password Reset Controller
 * ====================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Elements
    const changePasswordForm = document.getElementById("changePasswordForm");
    const newPasswordInput   = document.getElementById("newPassword");
    const confirmPwdInput    = document.getElementById("confirmPassword");
    const toggleNewPwd       = document.getElementById("toggleNewPwd");
    const toggleConfirmPwd   = document.getElementById("toggleConfirmPwd");
    const savePasswordBtn    = document.getElementById("savePasswordBtn");
    const saveBtnText        = document.getElementById("saveBtnText");
    const statusMessage      = document.getElementById("statusMessage");

    const userPreviewCard    = document.getElementById("userPreviewCard");
    const previewUserName    = document.getElementById("previewUserName");
    const previewUserSub     = document.getElementById("previewUserSub");
    const previewRoleBadge   = document.getElementById("previewRoleBadge");
    const invalidLinkCard    = document.getElementById("invalidLinkCard");
    const resetFormTitle     = document.getElementById("resetFormTitle");
    const resetFormSubtitle  = document.getElementById("resetFormSubtitle");

    // 2. Helper Alerts
    function showMessage(text, type = "error") {
        if (!statusMessage) return;
        statusMessage.className = `status-message show ${type}`;
        const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
        statusMessage.innerHTML = `<i class="fa-solid ${icon}"></i> <div>${text}</div>`;
    }

    function hideMessage() {
        if (!statusMessage) return;
        statusMessage.className = "status-message";
        statusMessage.innerHTML = "";
    }

    // 3. Extract & Validate URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = (urlParams.get("token") || "").trim();
    const uid   = (urlParams.get("uid") || "").trim();
    const role  = (urlParams.get("role") || "").trim();
    const exp   = parseInt(urlParams.get("exp") || "0", 10);

    function showInvalidLink(reasonText) {
        if (changePasswordForm) changePasswordForm.style.display = "none";
        if (userPreviewCard) userPreviewCard.style.display = "none";
        if (invalidLinkCard) invalidLinkCard.style.display = "block";
        if (resetFormTitle) resetFormTitle.textContent = "Link Inactive";
        if (resetFormSubtitle) resetFormSubtitle.textContent = reasonText || "This password reset link is invalid or expired.";
    }

    // Check basic parameters
    if (!token || !uid || !role) {
        showInvalidLink("Missing verification token or user identifier.");
        return;
    }

    // Check expiry timestamp
    if (exp && Date.now() > exp) {
        showInvalidLink("This password reset link expired after 15 minutes.");
        return;
    }

    // Check token revocation (single-use validation)
    const tokenKey = `tracked_reset_token_${token}`;
    const tokenRecord = localStorage.getItem(tokenKey);
    // If local record exists, verify it wasn't marked consumed
    if (tokenRecord) {
        try {
            const parsed = JSON.parse(tokenRecord);
            if (parsed.consumed) {
                showInvalidLink("This password reset link has already been used.");
                return;
            }
        } catch(e) {}
    }

    // 4. Verify Account in Database & Populate Card
    let targetUser = null;
    try {
        if (window.TrackED_DB && typeof window.TrackED_DB.findAccountById === "function") {
            const res = await window.TrackED_DB.findAccountById(uid, "id");
            if (res.success && res.user) {
                targetUser = res.user;
                if (userPreviewCard) userPreviewCard.style.display = "flex";
                if (previewUserName) previewUserName.textContent = targetUser.name || uid;
                if (previewUserSub) previewUserSub.textContent = targetUser.program || (role === "teacher" ? "Faculty Member" : "Student");
                if (previewRoleBadge) {
                    previewRoleBadge.textContent = role === "teacher" ? "Faculty" : "Student";
                    previewRoleBadge.className = `account-badge ${role === "teacher" ? "teacher" : ""}`;
                }
            }
        }
    } catch(err) {
        console.warn("[Reset Password] Account lookup fallback:", err);
    }

    // 5. Setup Password Visibility Toggles
    function setupPasswordToggle(toggleEl, inputEl) {
        if (!toggleEl || !inputEl) return;
        toggleEl.addEventListener("click", () => {
            if (inputEl.type === "password") {
                inputEl.type = "text";
                toggleEl.classList.remove("fa-eye");
                toggleEl.classList.add("fa-eye-slash");
            } else {
                inputEl.type = "password";
                toggleEl.classList.remove("fa-eye-slash");
                toggleEl.classList.add("fa-eye");
            }
        });
    }

    setupPasswordToggle(toggleNewPwd, newPasswordInput);
    setupPasswordToggle(toggleConfirmPwd, confirmPwdInput);

    // 6. Handle New Password Submission
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage();

            const newPwd = newPasswordInput ? newPasswordInput.value.trim() : "";
            const confirmPwd = confirmPwdInput ? confirmPwdInput.value.trim() : "";

            if (!newPwd || !confirmPwd) {
                showMessage("Please fill out both password fields.", "error");
                return;
            }

            if (newPwd.length < 4) {
                showMessage("Password must be at least 4 characters long.", "error");
                return;
            }

            if (newPwd !== confirmPwd) {
                showMessage("Passwords do not match. Please verify your typing.", "error");
                return;
            }

            // Button loading state
            if (savePasswordBtn) savePasswordBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating Cloud Password...';

            try {
                if (!window.TrackED_DB || typeof window.TrackED_DB.updatePassword !== "function") {
                    throw new Error("Database adapter unavailable.");
                }

                // Update password in Supabase Cloud and local storage
                const res = await window.TrackED_DB.updatePassword(role, uid, newPwd);

                if (res.success) {
                    // Mark token as consumed so it cannot be reused
                    localStorage.setItem(tokenKey, JSON.stringify({ consumed: true, usedAt: Date.now() }));

                    showMessage("Password successfully reset! Redirecting to login...", "success");

                    if (savePasswordBtn) {
                        savePasswordBtn.style.background = "#10b981";
                        savePasswordBtn.disabled = true;
                    }
                    if (saveBtnText) saveBtnText.innerHTML = '<i class="fa-solid fa-check"></i> Password Changed!';

                    // Smooth transition to login
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 2000);
                } else {
                    showMessage(res.message || "Failed to update password. Please try again.", "error");
                    if (savePasswordBtn) savePasswordBtn.disabled = false;
                    if (saveBtnText) saveBtnText.textContent = "Reset & Save Password";
                }
            } catch(err) {
                console.error("[Reset Password] Error saving password:", err);
                showMessage("An error occurred while saving your password. Please try again.", "error");
                if (savePasswordBtn) savePasswordBtn.disabled = false;
                if (saveBtnText) saveBtnText.textContent = "Reset & Save Password";
            }
        });
    }
});

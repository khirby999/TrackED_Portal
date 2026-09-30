document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements - Tabs & Verification
    const recoveryTabs     = document.getElementById("recoveryTabs");
    const tabId            = document.getElementById("tabId");
    const tabEmail         = document.getElementById("tabEmail");
    const verifyForm       = document.getElementById("verifyForm");
    const identifierInput  = document.getElementById("identifierInput");
    const identifierIcon   = document.getElementById("identifierIcon");
    const verifyBtn        = document.getElementById("verifyBtn");
    const verifyBtnText    = document.getElementById("verifyBtnText");

    // DOM Elements - Password Reset Form
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const accountRoleBadge  = document.getElementById("accountRoleBadge");
    const accountName       = document.getElementById("accountName");
    const accountSub        = document.getElementById("accountSub");
    const changeAccountBtn  = document.getElementById("changeAccountBtn");
    const newPasswordInput  = document.getElementById("newPassword");
    const confirmPwdInput   = document.getElementById("confirmPassword");
    const toggleNewPwd      = document.getElementById("toggleNewPwd");
    const toggleConfirmPwd  = document.getElementById("toggleConfirmPwd");
    const savePasswordBtn   = document.getElementById("savePasswordBtn");
    const saveBtnText       = document.getElementById("saveBtnText");
    const formSubtitle      = document.getElementById("formSubtitle");
    const statusMessage     = document.getElementById("statusMessage");
    const containerIcon     = document.getElementById("containerIcon");

    // State Variables
    let currentMode = "id"; // "id" or "email"
    let verifiedUser = null;
    let verifiedRole = null;

    // Helper: Show Alert Message
    function showMessage(text, type = "error") {
        if (!statusMessage) return;
        statusMessage.className = `status-message show ${type}`;
        const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
        statusMessage.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <div>${text}</div>
        `;
    }

    function hideMessage() {
        if (!statusMessage) return;
        statusMessage.className = "status-message";
        statusMessage.innerHTML = "";
    }

    // Helper: Escape HTML
    function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // 1. TAB SWITCHING: ID vs EMAIL
    function setRecoveryMode(mode) {
        currentMode = mode;
        hideMessage();

        if (mode === "id") {
            if (tabId) tabId.classList.add("active");
            if (tabEmail) tabEmail.classList.remove("active");
            if (identifierIcon) identifierIcon.className = "fa-solid fa-id-card icon";
            if (identifierInput) {
                identifierInput.type = "text";
                identifierInput.placeholder = "Enter Student or Faculty ID (e.g. 2024-00123)";
                identifierInput.value = "";
                identifierInput.focus();
            }
        } else {
            if (tabEmail) tabEmail.classList.add("active");
            if (tabId) tabId.classList.remove("active");
            if (identifierIcon) identifierIcon.className = "fa-solid fa-envelope icon";
            if (identifierInput) {
                identifierInput.type = "email";
                identifierInput.placeholder = "Enter your registered email address";
                identifierInput.value = "";
                identifierInput.focus();
            }
        }
    }

    if (tabId) tabId.addEventListener("click", () => setRecoveryMode("id"));
    if (tabEmail) tabEmail.addEventListener("click", () => setRecoveryMode("email"));

    // 2. STEP 1: VERIFY ACCOUNT
    if (verifyForm) {
        verifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage();

            const queryVal = identifierInput ? identifierInput.value.trim() : "";
            if (!queryVal) {
                showMessage(currentMode === "id" ? "Please enter your Student or Faculty ID." : "Please enter your registered email address.");
                return;
            }

            // Set button loading state
            if (verifyBtn) verifyBtn.disabled = true;
            if (verifyBtnText) verifyBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

            try {
                if (!window.TrackED_DB || typeof window.TrackED_DB.findUserForRecovery !== "function") {
                    throw new Error("Database service is not ready. Please refresh the page.");
                }

                const res = await window.TrackED_DB.findUserForRecovery(currentMode, queryVal);

                if (res.success && res.user) {
                    verifiedUser = res.user;
                    verifiedRole = res.role;

                    // Populate Verified Account Card
                    if (accountName) accountName.textContent = verifiedUser.name || "User";
                    if (accountSub) accountSub.textContent = verifiedUser.program || (verifiedRole === "teacher" ? "Faculty Instructor" : "Student");
                    if (accountRoleBadge) {
                        accountRoleBadge.textContent = verifiedRole === "teacher" ? "Faculty" : "Student";
                        accountRoleBadge.className = `account-badge ${verifiedRole === "teacher" ? "teacher" : ""}`;
                    }

                    // Transition to Step 2: Show Reset Password Form
                    verifyForm.style.display = "none";
                    if (recoveryTabs) recoveryTabs.style.display = "none";
                    if (resetPasswordForm) resetPasswordForm.style.display = "block";

                    if (formSubtitle) formSubtitle.textContent = "Identity verified! Set your new password below.";
                    if (newPasswordInput) {
                        newPasswordInput.value = "";
                        setTimeout(() => newPasswordInput.focus(), 150);
                    }
                    if (confirmPwdInput) confirmPwdInput.value = "";
                } else {
                    showMessage(res.message || "No account found matching the provided information.");
                }
            } catch (err) {
                console.error("Account verification error:", err);
                showMessage("An unexpected error occurred while verifying the account. Please try again.");
            } finally {
                if (verifyBtn) verifyBtn.disabled = false;
                if (verifyBtnText) verifyBtnText.textContent = "Verify Account";
            }
        });
    }

    // 3. CHANGE ACCOUNT BUTTON (Go back to Step 1)
    if (changeAccountBtn) {
        changeAccountBtn.addEventListener("click", () => {
            verifiedUser = null;
            verifiedRole = null;
            hideMessage();

            if (resetPasswordForm) resetPasswordForm.style.display = "none";
            if (recoveryTabs) recoveryTabs.style.display = "flex";
            if (verifyForm) verifyForm.style.display = "block";
            if (formSubtitle) formSubtitle.textContent = "Select how you would like to verify your account.";

            if (identifierInput) {
                identifierInput.value = "";
                setTimeout(() => identifierInput.focus(), 100);
            }
        });
    }

    // 4. SHOW/HIDE PASSWORD TOGGLES
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

    // 5. STEP 2: SAVE NEW PASSWORD
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage();

            if (!verifiedUser || !verifiedRole) {
                showMessage("Please verify your account first.");
                return;
            }

            const newPwd = newPasswordInput ? newPasswordInput.value : "";
            const confirmPwd = confirmPwdInput ? confirmPwdInput.value : "";

            if (!newPwd) {
                showMessage("Please enter a new password.");
                if (newPasswordInput) newPasswordInput.focus();
                return;
            }

            if (newPwd.length < 4) {
                showMessage("Password must be at least 4 characters long.");
                if (newPasswordInput) newPasswordInput.focus();
                return;
            }

            if (newPwd !== confirmPwd) {
                showMessage("Passwords do not match. Please ensure both passwords are identical.");
                if (confirmPwdInput) confirmPwdInput.focus();
                return;
            }

            // Set button saving state
            if (savePasswordBtn) savePasswordBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Password...';

            try {
                const targetId = verifiedUser.id;
                const res = await window.TrackED_DB.updatePassword(verifiedRole, targetId, newPwd);

                if (res && res.success) {
                    // Update visual state to success
                    if (containerIcon) {
                        containerIcon.classList.add("success");
                        containerIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
                    }

                    // Hide reset inputs and show clear success message
                    if (newPasswordInput) newPasswordInput.disabled = true;
                    if (confirmPwdInput) confirmPwdInput.disabled = true;
                    if (savePasswordBtn) savePasswordBtn.style.display = "none";
                    if (changeAccountBtn) changeAccountBtn.style.display = "none";

                    showMessage(`
                        <strong>Password Successfully Reset!</strong>
                        <br>Your new password has been saved for <strong>${escapeHtml(verifiedUser.name)}</strong>.
                        <br><span style="font-size: 12px; color: #166534; margin-top: 4px; display: inline-block;">
                            <i class="fa-solid fa-arrow-right"></i> Redirecting you to the login page in 2 seconds...
                        </span>
                    `, "success");

                    // Redirect to login after 2 seconds
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 2200);
                } else {
                    showMessage("Could not update password. Please check your connection and try again.");
                    if (savePasswordBtn) savePasswordBtn.disabled = false;
                    if (saveBtnText) saveBtnText.textContent = "Save New Password";
                }
            } catch (err) {
                console.error("Password update error:", err);
                showMessage("An error occurred while saving your new password. Please try again.");
                if (savePasswordBtn) savePasswordBtn.disabled = false;
                if (saveBtnText) saveBtnText.textContent = "Save New Password";
            }
        });
    }
});

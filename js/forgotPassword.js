document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements - Forms & Inputs
    const verifyForm         = document.getElementById("verifyForm");
    const identifierInput    = document.getElementById("identifierInput");
    const verifyBtn          = document.getElementById("verifyBtn");
    const verifyBtnText      = document.getElementById("verifyBtnText");

    const otpForm            = document.getElementById("otpForm");
    const otpCodeInput       = document.getElementById("otpCodeInput");
    const verifyOtpBtn       = document.getElementById("verifyOtpBtn");
    const verifyOtpBtnText   = document.getElementById("verifyOtpBtnText");
    const resendCodeBtn      = document.getElementById("resendCodeBtn");
    const changeEmailBtn     = document.getElementById("changeEmailBtn");
    const accountCardPreview = document.getElementById("accountCardPreview");
    const accountRoleBadge   = document.getElementById("accountRoleBadge");
    const accountName        = document.getElementById("accountName");
    const accountSub         = document.getElementById("accountSub");
    const otpInstruction     = document.getElementById("otpInstruction");

    const resetPasswordForm  = document.getElementById("resetPasswordForm");
    const newPasswordInput   = document.getElementById("newPassword");
    const confirmPwdInput    = document.getElementById("confirmPassword");
    const toggleNewPwd       = document.getElementById("toggleNewPwd");
    const toggleConfirmPwd   = document.getElementById("toggleConfirmPwd");
    const savePasswordBtn    = document.getElementById("savePasswordBtn");
    const saveBtnText        = document.getElementById("saveBtnText");

    const formTitle          = document.getElementById("formTitle");
    const formSubtitle       = document.getElementById("formSubtitle");
    const statusMessage      = document.getElementById("statusMessage");

    // State Variables
    let verifiedUser = null;
    let verifiedRole = null;
    let activeOtp = null;
    let otpExpiresAt = 0;
    let currentTargetEmail = "";

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

    // Helper: Mask email (e.g. j***n@gmail.com)
    function maskEmail(email) {
        if (!email || !email.includes("@")) return "your email";
        const parts = email.split("@");
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) {
            return `${name.charAt(0)}*@${domain}`;
        }
        return `${name.charAt(0)}${"*".repeat(Math.min(5, name.length - 2))}${name.slice(-1)}@${domain}`;
    }

    // Helper: Generate Secure 6-digit OTP
    function generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // ===================================================
    // STEP 1: REQUEST VERIFICATION CODE VIA EMAIL
    // ===================================================
    if (verifyForm) {
        verifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage();

            const emailVal = identifierInput ? identifierInput.value.trim().toLowerCase() : "";
            if (!emailVal || !emailVal.includes("@")) {
                showMessage("Please enter a valid email address.", "error");
                return;
            }

            // Set button loading state
            if (verifyBtn) verifyBtn.disabled = true;
            if (verifyBtnText) verifyBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking Database...';

            try {
                if (!window.TrackED_DB || typeof window.TrackED_DB.findUserForRecovery !== "function") {
                    throw new Error("Database service is not ready. Please refresh the page.");
                }

                const res = await window.TrackED_DB.findUserForRecovery("email", emailVal);

                if (res.success && res.user) {
                    verifiedUser = res.user;
                    verifiedRole = res.role;
                    currentTargetEmail = emailVal;

                    // Generate OTP and set 10-minute validity
                    activeOtp = generateOTP();
                    otpExpiresAt = Date.now() + 10 * 60 * 1000;

                    if (verifyBtnText) verifyBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Email...';

                    // Dispatch via EmailJS
                    if (window.TrackED_EmailService && typeof window.TrackED_EmailService.sendPasswordResetOTP === "function") {
                        await window.TrackED_EmailService.sendPasswordResetOTP({
                            userName: verifiedUser.name || "User",
                            targetEmail: emailVal,
                            otpCode: activeOtp
                        });
                    }

                    // Transition to Step 2: Show OTP Form
                    verifyForm.style.display = "none";
                    if (otpForm) otpForm.style.display = "block";

                    if (formTitle) formTitle.textContent = "Enter Verification Code";
                    if (formSubtitle) formSubtitle.textContent = `A 6-digit code was sent to ${maskEmail(emailVal)}.`;
                    if (otpInstruction) otpInstruction.textContent = `Check your inbox (${maskEmail(emailVal)}) and enter the 6-digit code below.`;

                    // Populate Verified Account Preview
                    if (accountName) accountName.textContent = verifiedUser.name || "User";
                    if (accountSub) accountSub.textContent = verifiedUser.program || (verifiedRole === "teacher" ? "Faculty Member" : "Student");
                    if (accountRoleBadge) {
                        accountRoleBadge.textContent = verifiedRole === "teacher" ? "Faculty" : "Student";
                        accountRoleBadge.className = `account-badge ${verifiedRole === "teacher" ? "teacher" : ""}`;
                    }

                    showMessage(`Verification code dispatched to ${maskEmail(emailVal)}. Valid for 10 minutes.`, "success");

                    if (otpCodeInput) {
                        otpCodeInput.value = "";
                        setTimeout(() => otpCodeInput.focus(), 150);
                    }
                } else {
                    showMessage(res.message || `No registered account found with email "${emailVal}". Please verify your email.`, "error");
                }
            } catch (err) {
                console.error("Account verification error:", err);
                showMessage("An error occurred while verifying the email. Please try again.", "error");
            } finally {
                if (verifyBtn) verifyBtn.disabled = false;
                if (verifyBtnText) verifyBtnText.textContent = "Send Verification Code";
            }
        });
    }

    // ===================================================
    // STEP 2: VERIFY 6-DIGIT OTP
    // ===================================================
    if (otpForm) {
        otpForm.addEventListener("submit", (e) => {
            e.preventDefault();
            hideMessage();

            const enteredCode = otpCodeInput ? otpCodeInput.value.trim() : "";

            if (!enteredCode || enteredCode.length !== 6) {
                showMessage("Please enter the complete 6-digit verification code.", "error");
                return;
            }

            if (Date.now() > otpExpiresAt) {
                showMessage("Your verification code has expired. Please click 'Resend Verification Code'.", "error");
                return;
            }

            if (enteredCode !== activeOtp) {
                showMessage("Invalid verification code. Please check your inbox or click Resend.", "error");
                return;
            }

            // OTP is valid! Transition to Step 3: Set New Password
            otpForm.style.display = "none";
            if (resetPasswordForm) resetPasswordForm.style.display = "block";

            if (formTitle) formTitle.textContent = "Create New Password";
            if (formSubtitle) formSubtitle.textContent = `Identity verified for ${verifiedUser ? verifiedUser.name : "your account"}. Set your new password below.`;

            showMessage("Code verified successfully! Create your new password.", "success");

            if (newPasswordInput) {
                newPasswordInput.value = "";
                setTimeout(() => newPasswordInput.focus(), 150);
            }
            if (confirmPwdInput) confirmPwdInput.value = "";
        });
    }

    // Resend Code Button
    if (resendCodeBtn) {
        resendCodeBtn.addEventListener("click", async () => {
            if (!currentTargetEmail || !verifiedUser) {
                showMessage("Please start over and re-enter your email.", "error");
                return;
            }

            activeOtp = generateOTP();
            otpExpiresAt = Date.now() + 10 * 60 * 1000;
            resendCodeBtn.disabled = true;
            resendCodeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending...';

            if (window.TrackED_EmailService && typeof window.TrackED_EmailService.sendPasswordResetOTP === "function") {
                await window.TrackED_EmailService.sendPasswordResetOTP({
                    userName: verifiedUser.name || "User",
                    targetEmail: currentTargetEmail,
                    otpCode: activeOtp
                });
            }

            showMessage(`A new 6-digit code has been sent to ${maskEmail(currentTargetEmail)}!`, "success");
            resendCodeBtn.disabled = false;
            resendCodeBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Resend Verification Code';
        });
    }

    // Change Email Button (Back to Step 1)
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener("click", () => {
            hideMessage();
            verifiedUser = null;
            verifiedRole = null;
            activeOtp = null;

            if (otpForm) otpForm.style.display = "none";
            if (resetPasswordForm) resetPasswordForm.style.display = "none";
            if (verifyForm) verifyForm.style.display = "block";

            if (formTitle) formTitle.textContent = "Reset Password";
            if (formSubtitle) formSubtitle.textContent = "Enter your registered email address to receive a secure verification code.";

            if (identifierInput) {
                identifierInput.value = "";
                setTimeout(() => identifierInput.focus(), 100);
            }
        });
    }

    // ===================================================
    // STEP 3: SUBMIT NEW PASSWORD
    // ===================================================
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage();

            if (!verifiedUser || !verifiedRole) {
                showMessage("Session expired. Please restart the recovery process.", "error");
                return;
            }

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

            // Set button loading state
            if (savePasswordBtn) savePasswordBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating Password...';

            try {
                if (!window.TrackED_DB || typeof window.TrackED_DB.updatePassword !== "function") {
                    throw new Error("Database adapter is unavailable. Please refresh.");
                }

                const res = await window.TrackED_DB.updatePassword(verifiedRole, verifiedUser.id, newPwd);

                if (res.success) {
                    showMessage("Password updated successfully! Redirecting to login page...", "success");

                    if (savePasswordBtn) {
                        savePasswordBtn.style.background = "#10b981";
                        savePasswordBtn.disabled = true;
                    }
                    if (saveBtnText) saveBtnText.innerHTML = '<i class="fa-solid fa-check"></i> Password Changed!';

                    // Smooth redirect to login
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 2500);
                } else {
                    showMessage(res.message || "Failed to update password. Please try again.", "error");
                    if (savePasswordBtn) savePasswordBtn.disabled = false;
                    if (saveBtnText) saveBtnText.textContent = "Save New Password";
                }
            } catch (err) {
                console.error("Password update error:", err);
                showMessage("An unexpected error occurred while saving the password.", "error");
                if (savePasswordBtn) savePasswordBtn.disabled = false;
                if (saveBtnText) saveBtnText.textContent = "Save New Password";
            }
        });
    }

    // Helper: Show/Hide Password Toggle
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
});

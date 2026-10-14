/**
 * ====================================================================
 * TrackED Portal - Forgot Password Controller (Email Link Reset)
 * ====================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. DOM Elements
    const verifyForm          = document.getElementById("verifyForm");
    const identifierInput     = document.getElementById("identifierInput");
    const verifyBtn           = document.getElementById("verifyBtn");
    const verifyBtnText       = document.getElementById("verifyBtnText");

    const linkSentCard        = document.getElementById("linkSentCard");
    const accountCardPreview  = document.getElementById("accountCardPreview");
    const accountRoleBadge    = document.getElementById("accountRoleBadge");
    const accountName         = document.getElementById("accountName");
    const accountSub          = document.getElementById("accountSub");
    const linkSentInstruction = document.getElementById("linkSentInstruction");
    const resendLinkBtn       = document.getElementById("resendLinkBtn");

    const formTitle           = document.getElementById("formTitle");
    const formSubtitle        = document.getElementById("formSubtitle");
    const statusMessage       = document.getElementById("statusMessage");

    // State Variables
    let verifiedUser = null;
    let verifiedRole = null;
    let currentTargetEmail = "";
    let activeResetLink = "";

    // Helper: Show Feedback Message
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

    // Helper: Mask email (e.g. j***n@gmail.com)
    function maskEmail(email) {
        if (!email || !email.includes("@")) return "your email";
        const parts = email.split("@");
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
        return `${name.charAt(0)}${"*".repeat(Math.min(5, name.length - 2))}${name.slice(-1)}@${domain}`;
    }

    // Helper: Build Full Reset Link URL
    function generateResetUrl(token, uid, role, exp) {
        let currentUrl = window.location.href.split("?")[0];
        let resetUrl = currentUrl.replace(/forgotPassword\.html$/i, "resetPassword.html");
        if (!resetUrl.endsWith("resetPassword.html")) {
            resetUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/resetPassword.html");
        }
        return `${resetUrl}?token=${token}&uid=${encodeURIComponent(uid)}&role=${role}&exp=${exp}`;
    }

    // ===================================================
    // STEP 1: VERIFY EMAIL & DISPATCH RESET LINK
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

            // Set loading state
            if (verifyBtn) verifyBtn.disabled = true;
            if (verifyBtnText) verifyBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking Database...';

            try {
                if (!window.TrackED_DB || typeof window.TrackED_DB.findUserForRecovery !== "function") {
                    throw new Error("Database service is not ready. Please refresh the page.");
                }

                // 1. Verify that email exists in Supabase Cloud
                const res = await window.TrackED_DB.findUserForRecovery("email", emailVal);

                if (res.success && res.user) {
                    verifiedUser = res.user;
                    verifiedRole = res.role;
                    currentTargetEmail = emailVal;

                    // 2. Generate secure single-use token (valid for 15 minutes)
                    const token = "tok_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
                    const exp = Date.now() + 15 * 60 * 1000;

                    // 3. Store token locally
                    localStorage.setItem(`tracked_reset_token_${token}`, JSON.stringify({
                        uid: verifiedUser.id,
                        role: verifiedRole,
                        exp: exp,
                        email: emailVal,
                        consumed: false
                    }));

                    // 4. Construct the reset link URL
                    activeResetLink = generateResetUrl(token, verifiedUser.id, verifiedRole, exp);

                    if (verifyBtnText) verifyBtnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching Email...';

                    // 5. Send Email via EmailJS
                    if (window.TrackED_EmailService && typeof window.TrackED_EmailService.sendPasswordResetLink === "function") {
                        await window.TrackED_EmailService.sendPasswordResetLink({
                            userName: verifiedUser.name || "User",
                            targetEmail: emailVal,
                            resetLink: activeResetLink
                        });
                    }

                    // 6. Transition to "Email Dispatched" view
                    verifyForm.style.display = "none";
                    if (linkSentCard) linkSentCard.style.display = "block";

                    if (formTitle) formTitle.textContent = "Check Your Email";
                    if (formSubtitle) formSubtitle.textContent = `A reset link was sent to ${maskEmail(emailVal)}.`;

                    if (linkSentInstruction) {
                        linkSentInstruction.innerHTML = `We sent a secure password reset link to <strong>${escapeHTML(emailVal)}</strong>.<br>Please check your inbox (or spam folder) and click the link to set your new password.<br><small style="color: #64748b; font-size: 11px;">Link expires in 15 minutes.</small>`;
                    }

                    // Account preview
                    if (accountName) accountName.textContent = verifiedUser.name || "User";
                    if (accountSub) accountSub.textContent = verifiedUser.program || (verifiedRole === "teacher" ? "Faculty Member" : "Student");
                    if (accountRoleBadge) {
                        accountRoleBadge.textContent = verifiedRole === "teacher" ? "Faculty" : "Student";
                        accountRoleBadge.className = `account-badge ${verifiedRole === "teacher" ? "teacher" : ""}`;
                    }

                    showMessage(`Password reset link dispatched to ${maskEmail(emailVal)}!`, "success");
                } else {
                    showMessage(res.message || `No registered account found with email "${emailVal}". Please check your email address.`, "error");
                }
            } catch(err) {
                console.error("[Forgot Password] Verification error:", err);
                showMessage("An error occurred while dispatching the reset link. Please try again.", "error");
            } finally {
                if (verifyBtn) verifyBtn.disabled = false;
                if (verifyBtnText) verifyBtnText.textContent = "Send Reset Link";
            }
        });
    }

    // ===================================================
    // RESEND EMAIL HANDLER
    // ===================================================
    if (resendLinkBtn) {
        resendLinkBtn.addEventListener("click", async () => {
            if (!currentTargetEmail || !verifiedUser) {
                showMessage("Please enter your email again.", "error");
                return;
            }

            resendLinkBtn.disabled = true;
            resendLinkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending...';

            const token = "tok_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            const exp = Date.now() + 15 * 60 * 1000;

            localStorage.setItem(`tracked_reset_token_${token}`, JSON.stringify({
                uid: verifiedUser.id,
                role: verifiedRole,
                exp: exp,
                email: currentTargetEmail,
                consumed: false
            }));

            activeResetLink = generateResetUrl(token, verifiedUser.id, verifiedRole, exp);

            if (window.TrackED_EmailService && typeof window.TrackED_EmailService.sendPasswordResetLink === "function") {
                await window.TrackED_EmailService.sendPasswordResetLink({
                    userName: verifiedUser.name || "User",
                    targetEmail: currentTargetEmail,
                    resetLink: activeResetLink
                });
            }

            showMessage(`A new password reset link has been dispatched to ${maskEmail(currentTargetEmail)}!`, "success");
            resendLinkBtn.disabled = false;
            resendLinkBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Resend Email';
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
});

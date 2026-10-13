document.addEventListener("DOMContentLoaded", () => {
    // 1. Password Visibility Toggle
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput  = document.getElementById("password");
    const usernameInput  = document.getElementById("username");
    const loginForm      = document.getElementById("loginForm");
    const loginAlert     = document.getElementById("loginAlert");
    const submitBtn      = document.getElementById("loginSubmitBtn");
    const btnText        = document.getElementById("loginBtnText");

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", function () {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePassword.classList.remove("fa-eye");
                togglePassword.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                togglePassword.classList.remove("fa-eye-slash");
                togglePassword.classList.add("fa-eye");
            }
        });
    }

    // Helper: Show Alert
    function showAlert(message, type = "error") {
        if (!loginAlert) return;
        loginAlert.className = `login-alert ${type}`;
        let icon = "fa-circle-exclamation";
        if (type === "loading") icon = "fa-spinner fa-spin";
        else if (type === "warning") icon = "fa-triangle-exclamation";
        else if (type === "security") icon = "fa-shield-halved";

        loginAlert.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        loginAlert.style.display = "flex";
    }

    function hideAlert() {
        if (loginAlert) loginAlert.style.display = "none";
    }

    // =========================================
    // SECURITY: BRUTE-FORCE TRACKER & EMAIL ALERT
    // =========================================
    const FAILED_ATTEMPTS_KEY = "tracked_failed_login_attempts";

    function getFailedAttempts() {
        try {
            return JSON.parse(sessionStorage.getItem(FAILED_ATTEMPTS_KEY) || "{}");
        } catch (e) {
            return {};
        }
    }

    function recordFailedAttempt(uid) {
        const attempts = getFailedAttempts();
        const key = (uid || "").trim().toLowerCase();
        attempts[key] = (attempts[key] || 0) + 1;
        sessionStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
        return attempts[key];
    }

    function resetFailedAttempts(uid) {
        const attempts = getFailedAttempts();
        const key = (uid || "").trim().toLowerCase();
        delete attempts[key];
        sessionStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
    }

    function maskEmail(email) {
        if (!email || !email.includes("@")) return "registered email";
        const parts = email.split("@");
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) {
            return `${name.charAt(0)}*@${domain}`;
        }
        return `${name.charAt(0)}${"*".repeat(Math.min(5, name.length - 2))}${name.slice(-1)}@${domain}`;
    }

    // 2. Form Submission Authentication
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideAlert();

            const username = usernameInput ? usernameInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value.trim() : "";

            if (!username || !password) {
                showAlert("Please enter both ID/Email and password.");
                return;
            }

            // Set button loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = "0.8";
                submitBtn.style.cursor = "not-allowed";
            }
            if (btnText) {
                btnText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
            }

            try {
                // Call unified DB authentication
                const res = await window.TrackED_DB.login(username, password);

                if (res.success) {
                    // Reset attempt counter upon successful login
                    resetFailedAttempts(username);

                    if (btnText) {
                        btnText.innerHTML = `<i class="fa-solid fa-check"></i> Welcome!`;
                    }

                    // Smooth transition to destination dashboard
                    setTimeout(() => {
                        if (res.role === "teacher") {
                            window.location.href = "Teacher_Pages/teacherDashboard.html";
                        } else {
                            window.location.href = "dashboard.html";
                        }
                    }, 400);
                } else {
                    // Failed attempt - increment security counter
                    const count = recordFailedAttempt(username);

                    // Look up if this ID exists in database to retrieve their registered Gmail
                    let foundAccount = null;
                    if (window.TrackED_DB && typeof window.TrackED_DB.findAccountById === "function") {
                        try {
                            foundAccount = await window.TrackED_DB.findAccountById(username, "id");
                        } catch(e) {}
                    }

                    if (count === 1) {
                        showAlert("Invalid password. (2 attempts remaining before security alert)", "warning");
                    } else if (count === 2) {
                        showAlert("Invalid password. Warning: 1 attempt remaining before security alert!", "warning");
                    } else if (count >= 3) {
                        // 3 or more failed attempts: Trigger security alert!
                        let targetEmail = "";
                        let targetName = username;

                        if (foundAccount && foundAccount.user) {
                            targetEmail = foundAccount.user.email || "";
                            targetName = foundAccount.user.name || username;
                        }

                        // Fallback to locally stored recovery email for this specific account
                        if (!targetEmail) {
                            const cleanUname = (username || "").trim().toLowerCase();
                            targetEmail = localStorage.getItem(`tracked_student_recovery_email_${cleanUname}`) ||
                                          localStorage.getItem(`tracked_teacher_recovery_email_${cleanUname}`) || "";
                        }

                        if (targetEmail) {
                            // Dispatch automated email alert to student's Gmail
                            if (window.TrackED_EmailService && typeof window.TrackED_EmailService.sendSecurityAlert === "function") {
                                window.TrackED_EmailService.sendSecurityAlert({
                                    studentName: targetName,
                                    studentId: username,
                                    targetEmail: targetEmail,
                                    attemptCount: count,
                                    timestamp: new Date().toLocaleString()
                                });
                            }
                            showAlert(`🚨 Security Alert: 3 failed attempts detected! A warning email was sent to ${maskEmail(targetEmail)}.`, "security");
                        } else {
                            showAlert("🚨 Security Alert: 3 failed attempts detected! Please check your credentials or reset your password.", "security");
                        }
                    } else {
                        showAlert(res.message || "Invalid Student/Faculty ID or password.");
                    }

                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = "1";
                        submitBtn.style.cursor = "pointer";
                    }
                    if (btnText) {
                        btnText.innerHTML = "Sign In";
                    }
                }
            } catch (err) {
                console.error("Login exception:", err);
                showAlert("An unexpected error occurred during login. Please try again.");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = "1";
                    submitBtn.style.cursor = "pointer";
                }
                if (btnText) {
                    btnText.innerHTML = "Sign In";
                }
            }
        });
    }
});
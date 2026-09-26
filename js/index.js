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
        const icon = type === "error" ? "fa-circle-exclamation" : "fa-spinner fa-spin";
        loginAlert.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        loginAlert.style.display = "flex";
    }

    function hideAlert() {
        if (loginAlert) loginAlert.style.display = "none";
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
                    showAlert(res.message || "Invalid Student/Faculty ID or password.");
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
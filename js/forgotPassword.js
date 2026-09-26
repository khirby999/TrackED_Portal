document.addEventListener("DOMContentLoaded", () => {
    const forgotForm = document.getElementById("forgotForm");
    const emailInput = document.getElementById("email");
    const submitBtn = document.getElementById("submitBtn");
    const statusMessage = document.getElementById("statusMessage");

    if (!forgotForm) return;

    // Prefill with recovery email from Settings if available
    const savedRecoveryEmail = localStorage.getItem("tracked_recovery_email");
    if (savedRecoveryEmail && emailInput && !emailInput.value) {
        emailInput.value = savedRecoveryEmail;
    }

    forgotForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        if (!email) return;

        // Button sending state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        // Simulate sending email reset link
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Resend Reset Link';

            // Show friendly success confirmation
            statusMessage.className = "status-message show success";
            statusMessage.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                <div>
                    <strong>Password Reset Link Sent!</strong>
                    <br>We have sent password reset instructions to <strong>${escapeHtml(email)}</strong>.
                    <br><span style="font-size: 12px; color: #475569; margin-top: 4px; display: inline-block;">Please open the email and follow the instructions to create a new password and regain access to your account.</span>
                </div>
            `;
        }, 900);
    });

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
});

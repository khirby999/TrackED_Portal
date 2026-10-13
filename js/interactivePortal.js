/**
 * TrackED Portal - Interactive UI & Micro-interactions
 * Provides offline-safe, high-performance mouse tracking, 3D card tilt,
 * floating parallax shapes, and button ripples.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. DYNAMIC MOUSE SPOTLIGHT ON SPLIT SECTIONS
    const splitSections = document.querySelectorAll(".welcome-section, .login-section");

    splitSections.forEach((section) => {
        let isMoving = false;

        section.addEventListener("mousemove", (e) => {
            if (isMoving) return;
            isMoving = true;

            requestAnimationFrame(() => {
                const rect = section.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                section.style.setProperty("--mouse-x", `${x}px`);
                section.style.setProperty("--mouse-y", `${y}px`);

                // Move floating shapes with subtle parallax
                const shapes = section.querySelectorAll(".floating-shape");
                shapes.forEach((shape) => {
                    const speed = parseFloat(shape.getAttribute("data-speed") || "0.03");
                    const moveX = (x - rect.width / 2) * speed;
                    const moveY = (y - rect.height / 2) * speed;
                    shape.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
                });

                isMoving = false;
            });
        });

        section.addEventListener("mouseleave", () => {
            const shapes = section.querySelectorAll(".floating-shape");
            shapes.forEach((shape) => {
                shape.style.transform = "translate3d(0, 0, 0)";
            });
        });
    });

    // 2. INTERACTIVE 3D CARD TILT EFFECT
    const tiltCards = document.querySelectorAll(".login-container, .forgot-container");

    tiltCards.forEach((card) => {
        let cardTicking = false;

        card.addEventListener("mousemove", (e) => {
            if (cardTicking) return;
            cardTicking = true;

            requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const mouseX = e.clientX - centerX;
                const mouseY = e.clientY - centerY;

                // Subtle tilt (max 8 degrees)
                const rotateX = (-mouseY / (rect.height / 2)) * 7;
                const rotateY = (mouseX / (rect.width / 2)) * 7;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`;
                card.style.boxShadow = `${-rotateY * 2}px ${20 + rotateX * 2}px 50px rgba(0, 0, 0, 0.35)`;

                cardTicking = false;
            });
        });

        card.addEventListener("mouseleave", () => {
            card.style.transition = "transform 0.4s ease, box-shadow 0.4s ease";
            card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)";
            card.style.boxShadow = "0 20px 45px rgba(0, 0, 0, 0.25)";

            setTimeout(() => {
                card.style.transition = "";
            }, 400);
        });

        card.addEventListener("mouseenter", () => {
            card.style.transition = "transform 0.1s ease-out, box-shadow 0.1s ease-out";
        });
    });

    // 3. INTERACTIVE BUTTON CLICK RIPPLE
    const rippleButtons = document.querySelectorAll(".signin-btn, button[type='submit']");

    rippleButtons.forEach((btn) => {
        btn.addEventListener("click", function (e) {
            const rect = this.getBoundingClientRect();
            const circle = document.createElement("span");
            const diameter = Math.max(rect.width, rect.height);
            const radius = diameter / 2;

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.classList.add("ripple-effect");

            const existingRipple = this.querySelector(".ripple-effect");
            if (existingRipple) {
                existingRipple.remove();
            }

            this.appendChild(circle);

            setTimeout(() => {
                circle.remove();
            }, 600);
        });
    });
});

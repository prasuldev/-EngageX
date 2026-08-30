document.addEventListener("DOMContentLoaded", () => {

    // Dark Mode
    const darkModeToggle =
        document.getElementById("darkModeToggle");

    const savedTheme =
        localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");

        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener("change", () => {

            if (darkModeToggle.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem("theme", "dark");
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem("theme", "light");
            }

        });
    }


    // Ask AI
    const askAiBtn =
        document.getElementById("askAiBtn");

    if (askAiBtn) {
        askAiBtn.addEventListener("click", () => {
            window.location.href = "test-ai.html";
        });
    }


    // Help Center
   const helpBtn =
       document.getElementById("helpBtn");

   const helpCenterModal =
       document.getElementById("helpCenterModal");

   const closeHelpModal =
       document.getElementById("closeHelpModal");

   const helpContactBtn =
       document.getElementById("helpContactBtn");


   if (helpBtn && helpCenterModal) {
       helpBtn.addEventListener("click", () => {
           helpCenterModal.classList.remove("hidden");
       });
   }


   if (closeHelpModal && helpCenterModal) {
       closeHelpModal.addEventListener("click", () => {
           helpCenterModal.classList.add("hidden");
       });
   }


   window.addEventListener("click", (e) => {

       if (e.target === helpCenterModal) {
           helpCenterModal.classList.add("hidden");
       }

   });


   if (helpContactBtn) {
       helpContactBtn.addEventListener("click", () => {

           window.location.href =
               "mailto:engagexcosmetics@gmail.com?subject=EngageX%20Customer%20Support";

       });
   }


   // Contact Support
   const contactBtn =
       document.getElementById("contactBtn");

   const contactSupportModal =
       document.getElementById("contactSupportModal");

   const closeContactModal =
       document.getElementById("closeContactModal");

   const contactSupportForm =
       document.getElementById("contactSupportForm");


   if (contactBtn && contactSupportModal) {
       contactBtn.addEventListener("click", () => {

           const user = typeof getLoggedInUser === "function"
               ? getLoggedInUser()
               : null;

           const supportName =
               document.getElementById("supportName");

           const supportEmail =
               document.getElementById("supportEmail");

           if (user) {
               if (supportName) {
                   supportName.value = user.full_name || "";
               }

               if (supportEmail) {
                   supportEmail.value = user.email || "";
               }
           }

           contactSupportModal.classList.remove("hidden");
       });
   }


   if (closeContactModal && contactSupportModal) {
       closeContactModal.addEventListener("click", () => {
           contactSupportModal.classList.add("hidden");
       });
   }


   window.addEventListener("click", (e) => {

       if (e.target === contactSupportModal) {
           contactSupportModal.classList.add("hidden");
       }

   });


   if (contactSupportForm) {
       contactSupportForm.addEventListener("submit", (e) => {

           e.preventDefault();

           const name =
               document.getElementById("supportName").value.trim();

           const email =
               document.getElementById("supportEmail").value.trim();

           const subject =
               document.getElementById("supportSubject").value.trim();

           const message =
               document.getElementById("supportMessage").value.trim();


           const emailSubject =
               encodeURIComponent(subject || "Customer Support Request");

           const emailBody =
               encodeURIComponent(
                   "Hello Maquillage Support,\n\n" +
                   message +
                   "\n\n--------------------\n" +
                   "Customer Name: " + name +
                   "\nCustomer Email: " + email
               );


           window.location.href =
               "mailto:engagexcosmetics@gmail.com" +
               "?subject=" + emailSubject +
               "&body=" + emailBody;

       });
   }


   // Logout
    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {

            if (typeof logoutUser === "function") {
                logoutUser();
            }

            window.location.href = "login.html";

        });
    }


    // Reset Password
    const resetPasswordBtn =
        document.getElementById("resetPasswordBtn");

    const passwordModal =
        document.getElementById("passwordModal");

    const closeModal =
        document.getElementById("closeModal");

    const resetPasswordForm =
        document.getElementById("resetPasswordForm");


    if (resetPasswordBtn && passwordModal) {
        resetPasswordBtn.addEventListener("click", () => {
            passwordModal.classList.remove("hidden");
        });
    }


    if (closeModal && passwordModal) {
        closeModal.addEventListener("click", () => {
            passwordModal.classList.add("hidden");
        });
    }


    window.addEventListener("click", (e) => {

        if (e.target === passwordModal) {
            passwordModal.classList.add("hidden");
        }

    });


    if (resetPasswordForm) {

        resetPasswordForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const currentPassword =
                document.getElementById("currentPassword").value;

            const newPassword =
                document.getElementById("newPassword").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;


            if (newPassword !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }


            const response = await authFetch(
                `${API_BASE}/auth/change-password`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                }
            );


            if (!response) return;


            const data = await response.json();


            if (!response.ok) {
                alert(data.detail || "Unable to reset password.");
                return;
            }


            alert("Password reset successfully.");

            passwordModal.classList.add("hidden");

            resetPasswordForm.reset();

        });

    }

});

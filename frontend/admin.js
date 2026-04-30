document.addEventListener('DOMContentLoaded', () => {
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const verificationCard = document.getElementById('verification-card');
    const container = document.querySelector('.container');

    // Build the Admin UI dynamically when triggered
    adminLoginBtn.addEventListener('click', () => {
        verificationCard.classList.add('hidden'); // Hide landing page
        
        const adminUI = document.createElement('div');
        adminUI.className = 'card p-4 golden-ticket text-center';
        
        adminUI.innerHTML = `
            <div class="text-start mb-4">
                <button id="back-to-home-btn" class="btn btn-action btn-sm py-1 px-3" style="font-size: 0.85rem;">
                    <i class="bi bi-arrow-left"></i> Back
                </button>
            </div>

            <h3 class="mb-4 header-gold"><i class="bi bi-shield-lock"></i> Admin Portal</h3>
            
            <div id="auth-section">
                <div class="input-group mb-3">
                    <input type="password" id="admin-password" class="form-control aurum-input" placeholder="Enter Password">
                    <button class="btn btn-action" type="button" id="toggle-password-btn" style="border-radius: 0 0.375rem 0.375rem 0;">
                        <i class="bi bi-eye" id="toggle-icon"></i>
                    </button>
                </div>
                <button id="auth-btn" class="btn btn-action w-100">Login</button>
                <div id="auth-error" class="text-danger mt-2 fw-bold"></div>
            </div>

            <div id="dashboard-section" class="hidden text-start mt-4 position-relative">
                <hr class="gold-divider">
                <h5 class="text-center mb-3 header-gold">Notification Settings</h5>
                
                <div class="aurum-glass-panel p-3 rounded mb-3 text-center">
                    <p class="mb-0 text-light">Current Email: <br><strong id="current-email" class="text-warning fs-5">Loading...</strong></p>
                </div>

                <div class="input-group mb-4">
                    <input type="email" id="new-email" class="form-control aurum-input" placeholder="New Admin Email">
                    <button class="btn btn-action" id="update-email-btn" style="border-radius: 0 0.375rem 0.375rem 0;">Update</button>
                </div>
                
                <hr class="gold-divider">
                <h5 class="text-center mb-3 header-gold">Database Export</h5>
                <button id="download-csv-btn" class="btn btn-action w-100">
                    <i class="bi bi-download"></i> Download Ticket CSV
                </button>
            </div>
        `;
        container.appendChild(adminUI);

        // NEW: Bind Back Button Logic
        document.getElementById('back-to-home-btn').addEventListener('click', () => {
            adminUI.remove(); // Remove the admin panel from the DOM
            verificationCard.classList.remove('hidden'); // Unhide the original ticket verification screen
        });

        // Bind Password Visibility Toggle
        document.getElementById('toggle-password-btn').addEventListener('click', () => {
            const pwdInput = document.getElementById('admin-password');
            const icon = document.getElementById('toggle-icon');
            
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                pwdInput.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });

        // Bind Admin Logic
        document.getElementById('auth-btn').addEventListener('click', async () => {
            const password = document.getElementById('admin-password').value;
            try {
                const res = await fetch('http://golden-ticket.azurewebsites.net/api/system-ops', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'authenticate', password: password })
                });
                
                if (res.ok) {
                    document.getElementById('auth-section').classList.add('hidden');
                    document.getElementById('dashboard-section').classList.remove('hidden');
                    
                    // Fetch semi-obscured email
                    const emailRes = await fetch('http://golden-ticket.azurewebsites.net/api/system-ops', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getEmail' })
                    });
                    const emailData = await emailRes.json();
                    document.getElementById('current-email').textContent = emailData.email;
                } else {
                    document.getElementById('auth-error').textContent = 'Unauthorized';
                }
            } catch (e) {
                document.getElementById('auth-error').textContent = 'Connection Error';
            }
        });

        // Bind Update Email Logic
        document.getElementById('update-email-btn').addEventListener('click', async () => {
            const newEmail = document.getElementById('new-email').value;
            if (!newEmail) return;

            const updateBtn = document.getElementById('update-email-btn');
            const originalText = updateBtn.textContent;
            updateBtn.textContent = 'Saving...';
            updateBtn.disabled = true;

            try {
                const res = await fetch('http://golden-ticket.azurewebsites.net/api/system-ops', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'setEmail', newEmail: newEmail })
                });
                
                if (res.ok) {
                    // Refresh email display
                    const emailRes = await fetch('http://golden-ticket.azurewebsites.net/api/system-ops', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getEmail' })
                    });
                    const emailData = await emailRes.json();
                    document.getElementById('current-email').textContent = emailData.email;
                    document.getElementById('new-email').value = '';
                }
            } catch (e) {
                console.error('Failed to update email');
            } finally {
                updateBtn.textContent = originalText;
                updateBtn.disabled = false;
            }
        });

        document.getElementById('download-csv-btn').addEventListener('click', () => {
            window.location.href = 'http://golden-ticket.azurewebsites.net/api/system-ops?action=downloadCSV';
        });
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const verificationCard = document.getElementById('verification-card');
    const container = document.querySelector('.container');

    // Build the Admin UI dynamically when triggered
    adminLoginBtn.addEventListener('click', () => {
        verificationCard.classList.add('hidden'); // Hide landing page
        
        const adminUI = document.createElement('div');
        adminUI.className = 'card shadow-sm text-center p-4';
        adminUI.innerHTML = `
            <h3 class="mb-3 text-secondary"><i class="bi bi-shield-lock"></i> Admin Portal</h3>
            
            <div id="auth-section">
                <input type="password" id="admin-password" class="form-control mb-3" placeholder="Enter Password">
                <button id="auth-btn" class="btn btn-dark w-100">Login</button>
                <div id="auth-error" class="text-danger mt-2 fw-bold"></div>
            </div>

            <div id="dashboard-section" class="hidden text-start">
                <hr>
                <h5 class="text-muted">Notification Settings</h5>
                <p>Current Email: <strong id="current-email">Loading...</strong></p>
                <div class="input-group mb-4">
                    <input type="email" id="new-email" class="form-control" placeholder="New Admin Email">
                    <button class="btn btn-outline-primary" id="update-email-btn">Update</button>
                </div>
                
                <hr>
                <h5 class="text-muted mb-3">Database Export</h5>
                <button id="download-csv-btn" class="btn btn-success w-100">
                    <i class="bi bi-download"></i> Download Ticket CSV
                </button>
            </div>
        `;
        container.appendChild(adminUI);

        // Bind Admin Logic
        document.getElementById('auth-btn').addEventListener('click', async () => {
            const password = document.getElementById('admin-password').value;
            try {
                // const res = await fetch('/api/system-ops', { TODO: CHANGE BEFORE DEPLOYMENT
                const res = await fetch('http://localhost:7071/api/system-ops', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'authenticate', password: password })
                });
                
                if (res.ok) {
                    document.getElementById('auth-section').classList.add('hidden');
                    document.getElementById('dashboard-section').classList.remove('hidden');
                    
                    // Fetch semi-obscured email
                    // const emailRes = await fetch('/api/system-ops', {
                    const emailRes = await fetch('http://localhost:7071/api/system-ops', {
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

        document.getElementById('download-csv-btn').addEventListener('click', () => {
            // Trigger direct CSV download
            // window.location.href = '/api/AdminOperations?action=downloadCSV';
            window.location.href = 'http://localhost:7071/api/system-ops?action=downloadCSV';
        });
    });
});
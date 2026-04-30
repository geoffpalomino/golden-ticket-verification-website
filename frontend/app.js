document.addEventListener('DOMContentLoaded', () => {
    const ticketInput = document.getElementById('ticket-input');
    const verifyBtn = document.getElementById('verify-btn');
    const verifyMsg = document.getElementById('verify-msg');
    const studentFormSection = document.getElementById('student-form-section');
    const studentForm = document.getElementById('student-info-form');
    const submitBtn = document.getElementById('submit-info-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const successMsg = document.getElementById('success-msg');
    const savedDataView = document.getElementById('saved-data-view');

    // Input Formatting: Add hyphens dynamically
    ticketInput.addEventListener('input', (e) => {
        e.target.value = formatTicketCode(e.target.value);
    });

    function formatTicketCode(str) {
        let clean = str.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
        let formatted = '';
        for (let i = 0; i < clean.length; i++) {
            if (i > 0 && i % 3 === 0) formatted += '-';
            formatted += clean[i];
        }
        return formatted.substring(0, 11);
    }

    function getLocalTimestamp() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}:${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    }

    // Verify Logic
    verifyBtn.addEventListener('click', async () => {
        const code = ticketInput.value.replace(/-/g, '');
        verifyMsg.textContent = '';
        studentFormSection.classList.add('hidden');

        try {
            // Make the fetch request
            const response = await fetch(`http://goldent-ticket.azurewebsites.net/api/VerifyTicket?code=${code}`);

            // 1. Handle critical server crashes (500) where JSON might not be returned
            if (response.status === 500) {
                verifyMsg.textContent = "System error connecting to the vault. Please try again later.";
                return;
            }

            // 2. Parse the JSON body (Backend returns JSON for 200, 400, and 404)
            const data = await response.json();
            
            // 3. Handle a Valid Ticket (200 OK)
            if (response.ok && data.status === 'valid') {
                // NEW: Show the Back button
                document.getElementById('home-back-container').classList.remove('hidden');

                studentFormSection.classList.remove('hidden');
                verifyBtn.disabled = true;
                ticketInput.disabled = true;

                // Display saved data if it exists
                if (data.studentInfo && data.studentInfo.FirstName) {
                    savedDataView.innerHTML = `
                        <div style="font-family: var(--font-body); text-transform: none; letter-spacing: normal;">
                            <div class="text-warning mb-1" style="font-size: 0.85rem;">
                                <i class="bi bi-clock-history"></i> ${data.studentInfo.LocalTimestamp}
                            </div>
                            <strong class="fs-5 text-white">${data.studentInfo.FirstName} ${data.studentInfo.LastName}</strong><br>
                            <span class="text-light">Grade: ${data.studentInfo.Grade} &nbsp;|&nbsp; School: ${data.studentInfo.School}</span>
                        </div>
                    `;
                    savedDataView.classList.remove('hidden');
                }
            } 
            // 4. Handle known invalid inputs (404 Not Found or 400 Bad Request)
            else if (data.status === 'invalid') {
                // This pulls the "Ticket not found." or "Invalid code format." message directly from VerifyTicket.js
                verifyMsg.textContent = data.message; 
            } 
            // 5. Catch-all for other unexpected structured responses
            else {
                verifyMsg.textContent = "An unexpected error occurred.";
            }

        } catch (error) {
            // 6. This catch block now only runs if the fetch completely fails 
            // (e.g., Azure Functions is offline, wrong port, or a CORS block)
            verifyMsg.textContent = "Hmm, the connection is a bit slow or the server is offline... Please try again.";
        }
    });

    // Submit Logic
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable UI and show loading
        const inputs = studentForm.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);
        submitBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');

        const payload = {
            TicketCode: ticketInput.value.replace(/-/g, ''),
            FirstName: document.getElementById('firstName').value,
            LastName: document.getElementById('lastName').value,
            Grade: document.getElementById('grade').value,
            School: document.getElementById('school').value,
            LocalTimestamp: getLocalTimestamp()
        };

        try {
            // const response = await fetch('/api/SaveStudentInfo', { TODO: CHANGE BEFORE DEPLOYMENT
            const response = await fetch('http://goldent-ticket.azurewebsites.net/api/SaveStudentInfo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                loadingIndicator.classList.add('hidden');
                successMsg.classList.remove('hidden');
                
                // Display the newly saved info
                savedDataView.innerHTML = `
                    <div style="font-family: var(--font-body); text-transform: none; letter-spacing: normal;">
                        <div class="text-warning mb-1" style="font-size: 0.85rem;">
                            <i class="bi bi-clock-history"></i> ${payload.LocalTimestamp}
                        </div>
                        <strong class="fs-5 text-white">${payload.FirstName} ${payload.LastName}</strong><br>
                        <span class="text-light">Grade: ${payload.Grade} &nbsp;|&nbsp; School: ${payload.School}</span>
                    </div>
                `;
                savedDataView.classList.remove('hidden');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            loadingIndicator.classList.add('hidden');
            verifyMsg.textContent = "Oops! Our Golden Ticket system is taking a quick break...";
            inputs.forEach(input => input.disabled = false);
            submitBtn.disabled = false;
        }
    });

    // NEW: Back Button Logic to return to the homepage
    document.getElementById('back-to-verify-btn').addEventListener('click', () => {
        // 1. Hide the Back button and the Student Form section
        document.getElementById('home-back-container').classList.add('hidden');
        studentFormSection.classList.add('hidden');

        // 2. Re-enable the initial verify inputs and clear them
        verifyBtn.disabled = false;
        ticketInput.disabled = false;
        ticketInput.value = ''; // Clear the ticket code
        verifyMsg.textContent = ''; // Clear any error messages

        // 3. Reset the student information form and hide old success messages
        studentForm.reset();
        successMsg.classList.add('hidden');
        savedDataView.classList.add('hidden');
        
        // 4. Re-enable form inputs in case they were disabled by a previous submission
        const inputs = studentForm.querySelectorAll('input');
        inputs.forEach(input => input.disabled = false);
        submitBtn.disabled = false;
    });

    // Initialization: Auto-populate from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketFromUrl = urlParams.get('ticket');
    if (ticketFromUrl) {
        ticketInput.value = formatTicketCode(ticketFromUrl);

        // NEW: Automatically trigger the verification process
        verifyBtn.click();
    }
});
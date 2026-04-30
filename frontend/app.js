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

    // Original timestamp format for the database
    function getLocalTimestamp() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}:${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    }

    // NEW: Function to format the raw database string for UI display
    function formatDisplayTimestamp(rawTimestamp) {
        if (!rawTimestamp) return '';
        
        // Expected format: YYYY-MM-DD:HH-MM-SS
        const parts = rawTimestamp.split(':');
        if (parts.length !== 2) return rawTimestamp; // Fallback if format is unexpected
        
        const datePart = parts[0];
        const timeParts = parts[1].split('-');
        
        if (timeParts.length < 2) return rawTimestamp;
        
        let hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // convert '0' to '12'
        
        const formattedHours = hours.toString().padStart(2, '0');
        
        return `${datePart} ${formattedHours}:${minutes} ${ampm}`;
    }

    // Verify Logic
    verifyBtn.addEventListener('click', async () => {
        const code = ticketInput.value.replace(/-/g, '');
        verifyMsg.textContent = '';
        studentFormSection.classList.add('hidden');

        // Show loading indicator and disable inputs
        const verifyLoading = document.getElementById('verify-loading-indicator');
        verifyLoading.classList.remove('hidden');
        verifyBtn.disabled = true;
        ticketInput.disabled = true;

        try {
            // Make the fetch request
            const response = await fetch(`https://golden-ticket-api.azurewebsites.net/api/VerifyTicket?code=${code}`);
            const data = await response.json();
            
            if (response.ok && data.status === 'valid') {
                // 1. Show the student form section and the back button
                studentFormSection.classList.remove('hidden');
                document.getElementById('home-back-container').classList.remove('hidden');
                document.getElementById('verify-section').classList.add('hidden');
                
                // 2. Check if student info already exists in the database
                if(data.studentInfo && data.studentInfo.FirstName) {
                    
                    // DO NOT hide the input form, ensure it remains visible for updates
                    studentForm.classList.remove('hidden');
                    
                    // Pre-fill the form with the existing data so the user can edit it
                    document.getElementById('firstName').value = data.studentInfo.FirstName;
                    document.getElementById('lastName').value = data.studentInfo.LastName;
                    document.getElementById('grade').value = data.studentInfo.Grade;
                    document.getElementById('school').value = data.studentInfo.School;
                    submitBtn.textContent = "Update Info"; // Change button text to reflect update action
                    
                    // NEW: Use the formatter for the displayed time
                    const displayTime = formatDisplayTimestamp(data.studentInfo.LocalTimestamp);

                    // Populate the saved data view with the retrieved information
                    savedDataView.innerHTML = `
                        <div style="font-family: var(--font-body); text-transform: none; letter-spacing: normal;">
                            <div class="text-warning mb-1" style="font-size: 0.85rem;">
                                <i class="bi bi-clock-history"></i> ${displayTime}
                            </div>
                            <strong class="fs-5 text-white">${data.studentInfo.FirstName} ${data.studentInfo.LastName}</strong><br>
                            <span class="text-light">Grade: ${data.studentInfo.Grade} &nbsp;|&nbsp; School: ${data.studentInfo.School}</span>
                        </div>
                    `;
                    // Unhide the populated panel
                    savedDataView.classList.remove('hidden');
                    
                } else {
                    // If it's a new ticket, ensure the input form is visible and empty
                    studentForm.classList.remove('hidden');
                    savedDataView.classList.add('hidden');
                    studentForm.reset();
                    submitBtn.textContent = "Submit";
                }

            } else if (data.status === 'invalid') {
                verifyMsg.textContent = data.message; 
                verifyBtn.disabled = false;
                ticketInput.disabled = false;
            } else {
                verifyMsg.textContent = "An unexpected error occurred.";
                verifyBtn.disabled = false;
                ticketInput.disabled = false;
            }

        } catch (error) {
            console.error("The actual error was:", error);
            verifyMsg.textContent = "Hmm, the connection is a bit slow or the server is offline... Please try again.";
            verifyBtn.disabled = false;
            ticketInput.disabled = false;
        } finally {
            // Always hide the loading overlay when the request completes
            verifyLoading.classList.add('hidden');
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
            LocalTimestamp: getLocalTimestamp() // Keeps original format for the backend
        };

        try {
            const response = await fetch('https://golden-ticket-api.azurewebsites.net/api/SaveStudentInfo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                loadingIndicator.classList.add('hidden');
                successMsg.classList.remove('hidden');
                
                // NEW: Use the formatter for the displayed time after saving
                const displayTime = formatDisplayTimestamp(payload.LocalTimestamp);

                // Display the newly saved info
                savedDataView.innerHTML = `
                    <div style="font-family: var(--font-body); text-transform: none; letter-spacing: normal;">
                        <div class="text-warning mb-1" style="font-size: 0.85rem;">
                            <i class="bi bi-clock-history"></i> ${displayTime}
                        </div>
                        <strong class="fs-5 text-white">${payload.FirstName} ${payload.LastName}</strong><br>
                        <span class="text-light">Grade: ${payload.Grade} &nbsp;|&nbsp; School: ${payload.School}</span>
                    </div>
                `;
                savedDataView.classList.remove('hidden');
                
                // Re-enable the inputs and button so the user can continue editing if needed
                inputs.forEach(input => input.disabled = false);
                submitBtn.disabled = false;
                submitBtn.textContent = "Update Info";
                
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

    // Back Button Logic to return to the homepage
    document.getElementById('back-to-verify-btn').addEventListener('click', () => {
        // 1. Hide the Back button and the Student Form section
        document.getElementById('home-back-container').classList.add('hidden');
        studentFormSection.classList.add('hidden');

        // 2. Re-enable the initial verify inputs, clear them, AND REVEAL THE SECTION
        document.getElementById('verify-section').classList.remove('hidden'); 
        verifyBtn.disabled = false;
        ticketInput.disabled = false;
        ticketInput.value = ''; // Clear the ticket code
        verifyMsg.textContent = ''; // Clear any error messages

        // 3. Reset the student information form and hide old success messages
        studentForm.reset();
        successMsg.classList.add('hidden');
        savedDataView.classList.add('hidden');
        studentForm.classList.remove('hidden'); // Ensure form is unhidden for the next ticket
        submitBtn.textContent = "Submit"; // Reset the submit button text
        
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

        // Automatically trigger the verification process
        verifyBtn.click();
    }
});
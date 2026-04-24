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

    // Initialization: Auto-populate from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketFromUrl = urlParams.get('ticket');
    if (ticketFromUrl) {
        ticketInput.value = formatTicketCode(ticketFromUrl);
    }

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
            // Replace with your actual Azure Function URL
            // const response = await fetch(`/api/VerifyTicket?code=${code}`); TODO: CHANGE BEFORE DEPLOYMENT
            const response = await fetch(`http://localhost:7071/api/VerifyTicket?code=${code}`);

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            
            if (data.status === 'valid') {
                studentFormSection.classList.remove('hidden');
                verifyBtn.disabled = true;
                ticketInput.disabled = true;

                // Display saved data if it exists
                if (data.studentInfo && data.studentInfo.FirstName) {
                    savedDataView.innerHTML = `
                        <strong>${data.studentInfo.LocalTimestamp}</strong><br>
                        ${data.studentInfo.FirstName} ${data.studentInfo.LastName}<br>
                        Grade: ${data.studentInfo.Grade} | School: ${data.studentInfo.School}
                    `;
                    savedDataView.classList.remove('hidden');
                }
            } else {
                verifyMsg.textContent = 'Invalid Code.';
            }
        } catch (error) {
            verifyMsg.textContent = "Hmm, the connection is a bit slow... Please try again.";
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
            const response = await fetch('http://localhost:7071/api/SaveStudentInfo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                loadingIndicator.classList.add('hidden');
                successMsg.classList.remove('hidden');
                
                // Display the newly saved info
                savedDataView.innerHTML = `
                    <strong>${payload.LocalTimestamp}</strong><br>
                    ${payload.FirstName} ${payload.LastName}<br>
                    Grade: ${payload.Grade} | School: ${payload.School}
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
});
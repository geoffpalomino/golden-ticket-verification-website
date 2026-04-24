const { app } = require('@azure/functions');
const { TableClient } = require("@azure/data-tables");

app.http('AdminOperations', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'system-ops', // <--- ADD THIS LINE
    handler: async (request, context) => {
        let action = request.query.get('action');
        let requestBody = {};
        
        // Safely parse JSON body if it's a POST request
        if (request.method === 'POST') {
            try {
                requestBody = await request.json();
                if (!action) action = requestBody.action;
            } catch (e) {
                // Body might be empty
            }
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const configClient = TableClient.fromConnectionString(connectionString, "SystemConfig");
        const ticketsClient = TableClient.fromConnectionString(connectionString, "Tickets");

        try {
            const configEntity = await configClient.getEntity("Settings", "AdminConfig");

            // Action 1: Authenticate
            if (action === 'authenticate') {
                if (requestBody.password === configEntity.AdminPasswordHash) {
                    return { status: 200, jsonBody: { status: "success" } };
                } else {
                    return { status: 401, jsonBody: { status: "unauthorized" } };
                }
            }

            // Action 2: Get semi-obscured email
            if (action === 'getEmail') {
                const email = configEntity.AdminEmail;
                const obscured = email.charAt(0) + "***@" + email.split('@')[1];
                return { status: 200, jsonBody: { email: obscured } };
            }

            // Action 3: Set new email
            if (action === 'setEmail') {
                await configClient.upsertEntity({
                    partitionKey: "Settings",
                    rowKey: "AdminConfig",
                    AdminEmail: requestBody.newEmail,
                    AdminPasswordHash: configEntity.AdminPasswordHash 
                }, "Replace");
                
                return { status: 200, jsonBody: { status: "success" } };
            }

            // Action 4: Direct CSV Download
            if (action === 'downloadCSV') {
                let csvContent = "TicketCode,FirstName,LastName,Grade,School,LocalTimestamp\n";
                const entities = ticketsClient.listEntities();
                for await (const entity of entities) {
                    csvContent += `${entity.rowKey},${entity.FirstName || ''},${entity.LastName || ''},${entity.Grade || ''},${entity.School || ''},${entity.LocalTimestamp || ''}\n`;
                }
                
                // V4 returning a file instead of JSON
                return {
                    status: 200,
                    headers: {
                        "Content-Type": "text/csv",
                        "Content-Disposition": "attachment; filename=TicketsDatabase.csv"
                    },
                    body: csvContent
                };
            }

            return { status: 400, body: "Invalid action parameter." };

        } catch (error) {
            context.error("Admin error:", error);
            return { status: 500, body: "System error." };
        }
    }
});
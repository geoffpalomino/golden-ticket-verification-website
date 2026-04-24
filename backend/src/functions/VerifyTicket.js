const { app } = require('@azure/functions');
const { TableClient } = require("@azure/data-tables");

app.http('VerifyTicket', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // V4 requires extracting query params via the .get() method
        let code = request.query.get('code');
        
        if (!code && request.method === 'POST') {
            try {
                const body = await request.json();
                code = body.code;
            } catch (e) {
                // Ignore if body is empty or not JSON
            }
        }
        
        // Validate 9-character hex format
        const hexRegex = /^[0-9A-Fa-f]{9}$/;
        if (!code || !hexRegex.test(code)) {
            return { 
                status: 400, 
                jsonBody: { status: "invalid", message: "Invalid code format." } 
            };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = TableClient.fromConnectionString(connectionString, "Tickets");

        try {
            const entity = await tableClient.getEntity("GoldenTicket", code);
            
            return {
                status: 200,
                jsonBody: { 
                    status: "valid", 
                    studentInfo: {
                        FirstName: entity.FirstName || null,
                        LastName: entity.LastName || null,
                        Grade: entity.Grade || null,
                        School: entity.School || null,
                        LocalTimestamp: entity.LocalTimestamp || null
                    }
                }
            };
        } catch (error) {
            if (error.statusCode === 404) {
                return { status: 404, jsonBody: { status: "invalid", message: "Ticket not found." } };
            } else {
                context.error("System error: ", error);
                return { status: 500, body: "System error." };
            }
        }
    }
});
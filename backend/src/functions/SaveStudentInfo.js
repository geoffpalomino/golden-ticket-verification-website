const { app } = require('@azure/functions');
const { TableClient } = require("@azure/data-tables");

app.http('SaveStudentInfo', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let payload;
        try {
            // V4 requires parsing the body asynchronously
            payload = await request.json();
        } catch (error) {
            return { status: 400, body: "Invalid JSON payload." };
        }

        if (!payload || !payload.TicketCode || !payload.FirstName || !payload.LastName || !payload.Grade || !payload.School || !payload.LocalTimestamp) {
            return { status: 400, body: "Missing required fields." };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = TableClient.fromConnectionString(connectionString, "Tickets");

        try {
            const ticketEntity = {
                partitionKey: "GoldenTicket",
                rowKey: payload.TicketCode,
                FirstName: payload.FirstName,
                LastName: payload.LastName,
                Grade: payload.Grade,
                School: payload.School,
                LocalTimestamp: payload.LocalTimestamp
            };

            await tableClient.upsertEntity(ticketEntity, "Replace");

            return {
                status: 200,
                jsonBody: { message: "Student info saved successfully." }
            };
        } catch (error) {
            context.error("Error saving to database: ", error);
            return { status: 500, body: "Error saving to database." };
        }
    }
});
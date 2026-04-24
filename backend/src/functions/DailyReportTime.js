const { app } = require('@azure/functions');
const { TableClient } = require("@azure/data-tables");
const { EmailClient } = require("@azure/communication-email");

app.timer('DailyReportTimer', {
    schedule: '0 0 20 * * *',
    handler: async (myTimer, context) => {
        const connectionString = process.env.AzureWebJobsStorage;
        const emailConnectionString = process.env.CommunicationServicesConnectionString; 
        
        const ticketsClient = TableClient.fromConnectionString(connectionString, "Tickets");
        const configClient = TableClient.fromConnectionString(connectionString, "SystemConfig");

        try {
            // Get today's date formatted as YYYY-MM-DD in PT
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
            
            let hasUpdatesToday = false;
            let csvContent = "TicketCode,FirstName,LastName,Grade,School,LocalTimestamp\n";
            
            const entities = ticketsClient.listEntities();
            for await (const entity of entities) {
                csvContent += `${entity.rowKey},${entity.FirstName || ''},${entity.LastName || ''},${entity.Grade || ''},${entity.School || ''},${entity.LocalTimestamp || ''}\n`;
                
                if (entity.LocalTimestamp && entity.LocalTimestamp.startsWith(today)) {
                    hasUpdatesToday = true;
                }
            }

            if (!hasUpdatesToday) {
                context.log("No updates today. Exiting cleanly.");
                return;
            }

            const configEntity = await configClient.getEntity("Settings", "AdminConfig");
            const emailClient = new EmailClient(emailConnectionString);
            
            const emailMessage = {
                senderAddress: "DoNotReply@your-communication-domain.azurecomm.net",
                content: {
                    subject: `Golden Ticket Daily Digest - ${today}`,
                    plainText: "Attached is the complete Golden Ticket database history. Updates were made today."
                },
                recipients: { to: [{ address: configEntity.AdminEmail }] },
                attachments: [{
                    name: `TicketsHistory_${today}.csv`,
                    contentType: "text/csv",
                    contentInBase64: Buffer.from(csvContent).toString('base64')
                }]
            };

            const poller = await emailClient.beginSend(emailMessage);
            await poller.pollUntilDone();
            
            context.log("Daily report dispatched successfully.");

        } catch (error) {
            context.error("Failed to execute daily report:", error);
        }
    }
});
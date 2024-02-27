const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });
const clients = new Map(); // Use a Map to associate clients with locations
const messagesByCity = new Map(); // Store messages by city

function storeMessage(city, username, locality, content) {
    if (!messagesByCity.has(city)) {
        messagesByCity.set(city, []);
    }
    let messages = messagesByCity.get(city);
    // Store both username and content in each message
    messages.push({ username, content, locality });
    // Keep only the last 10 messages for the city
    if (messages.length > 10) {
        messages = messages.slice(-10);
    }
    messagesByCity.set(city, messages);
}

function broadcastMessage(username, content, locality, senderWs, senderLocation) {
    const senderCity = senderLocation.city;
    clients.forEach((location, client) => {
        if (client.readyState === WebSocket.OPEN && client !== senderWs) {
            const clientCity = location.city;
            if (clientCity === senderCity) {
                // Send both username and content as a JSON string
                client.send(JSON.stringify({ username, content, locality }));
            }
        }
    });
}

function sendLastMessages(client, city, locality) {
    const messages = messagesByCity.get(city) || [];
    messages.forEach(({ username, content, locality }) => {
        // Send both username and content as a JSON string
        client.send(JSON.stringify({ username, content, locality }));
    });
}

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        const message = JSON.parse(data); // Assuming message format is JSON
        if (message.type === 'location') {
            const city = message.city;
            clients.set(ws, { city: message.city });
            sendLastMessages(ws, city, message.locality); // Send last 10 messages for this city
        } else if (message.type === 'chat') {
            console.log('received: %s', message.content);
            const senderLocation = clients.get(ws);
            if (senderLocation) {
                const senderCity = senderLocation.city;
                // Assuming 'username' is part of the chat message structure
                storeMessage(senderCity, message.username, message.locality, message.content); // Store the message with username under the sender's city
                broadcastMessage(message.username, message.content, message.locality, ws, senderLocation); // Pass the WebSocket instance directly
            }
        }
    });

    ws.on('close', function close() {
        clients.delete(ws);
    });
});

console.log('Chat server running');

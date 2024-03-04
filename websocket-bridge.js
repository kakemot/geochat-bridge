const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

const port = process.env.PORT || 10000;
const host = '0.0.0.0'; // Listen on all network interfaces
const wss = new WebSocket.Server({ port: port, host: host, path: '/chat' });
const clients = new Map();
const messagesByCity = new Map();

async function storeMessage(city, username, locality, content, timestamp, gifUrl) {
    const dirPath = path.join(__dirname, 'messages');
    const filePath = path.join(dirPath, `${city}-messages.txt`);
    const messageString = JSON.stringify({ username, content, locality, timestamp, gifUrl }) + "\n";

    try {
        await fs.mkdir(dirPath, { recursive: true });
        await fs.appendFile(filePath, messageString);
    } catch (error) {
        console.error('Failed to store message:', error);
    }
}

async function readLastMessages(city, count) {
    const filePath = path.join(__dirname, `messages/${city}-messages.txt`);

    try {
        const data = await fs.readFile(filePath, 'utf8');
        const messages = data.trim().split('\n').map(line => JSON.parse(line));
        return messages.slice(-count); // Return the last 'count' messages
    } catch (error) {
        console.error('Failed to read messages:', error);
        return [];
    }
}

function broadcastMessage(username, content, locality, senderWs, senderLocation, timestamp, gifUrl) {
    const senderCity = senderLocation.city;
    clients.forEach((location, client) => {
        if (client.readyState === WebSocket.OPEN && client !== senderWs) {
            const clientCity = location.city;
            if (clientCity === senderCity) {
                client.send(JSON.stringify({ username, content, locality, timestamp, gifUrl }));
            }
        }
    });
}

async function sendLastMessages(client, city, locality) {
    const messages = await readLastMessages(city, 10)
    messages.forEach(({ username, content, locality, timestamp, gifUrl }) => {
        // Send both username and content as a JSON string
        client.send(JSON.stringify({ username, content, locality, timestamp, gifUrl }));
    });
}

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        const message = JSON.parse(data); // Assuming message format is JSON
        if (message.type === 'location') {
            const city = message.city;
            clients.set(ws, { city: message.city });
            console.log("send last messages in " + city)
            sendLastMessages(ws, city, message.locality); // Send last 10 messages for this city
        } else if (message.type === 'chat') {
            console.log('received: %s', message.content);
            const senderLocation = clients.get(ws);
            if (senderLocation) {
                const senderCity = senderLocation.city;
                // Assuming 'username' is part of the chat message structure
                storeMessage(senderCity, message.username, message.locality, message.content, message.timestamp, message.gifUrl); // Store the message with username under the sender's city
                broadcastMessage(message.username, message.content, message.locality, ws, senderLocation, message.timestamp, message.gifUrl); // Pass the WebSocket instance directly
            }
        }
    });

    ws.on('close', function close() {
        clients.delete(ws);
    });
});

console.log('Chat server running');


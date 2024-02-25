const WebSocket = require('ws');

const port = process.env.PORT || 8080; // Default to 8080 if PORT isn't set
const wss = new WebSocket.Server({ port: port, path: '/chat' });

const clients = new Map(); // Use a Map to associate clients with locations

function broadcastMessage(message, senderWs, senderLocation) {
    clients.forEach((location, client) => {
        if (client.readyState === WebSocket.OPEN && client !== senderWs) { // Directly compare WebSocket instances
            if (location.latitude === senderLocation.latitude && location.longitude === senderLocation.longitude) {
                client.send(message);
            }
        }
    });
}

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        const message = JSON.parse(data); // Assuming message format is JSON
        if (message.type === 'location') {
            clients.set(ws, { latitude: message.latitude, longitude: message.longitude });
        } else if (message.type === 'chat') {
            console.log('received: %s', message.content);
            const senderLocation = clients.get(ws);
            if (senderLocation) {
                broadcastMessage(message.content, ws, senderLocation); // Pass the WebSocket instance directly
            }
        }
    });

    ws.on('close', function close() {
        clients.delete(ws);
    });
});

console.log('Chat server running');

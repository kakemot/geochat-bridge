const WebSocket = require('ws');

const port = process.env.PORT || 8080; // Default to 8080 if PORT isn't set
const wss = new WebSocket.Server({ port: port, path: '/chat' });

const clients = new Map(); // Use a Map to associate clients with locations

function checkIfNearby(long1, lat1, long2, lat2, km) {
    const R = 6371;
    const rad = (deg) => deg * (Math.PI / 180);

    const dLat = rad(lat2 - lat1);
    const dLong = rad(long2 - long1);

    // Haversine formula
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in kilometers
    const distance = R * c;

    // Check if the distance is less than or equal to the specified kilometers
    console.log(distance);
    return distance <= km;
}

function broadcastMessage(message, senderWs, senderLocation) {
    clients.forEach((location, client) => {
        if (client.readyState === WebSocket.OPEN && client !== senderWs) { // Directly compare WebSocket instances
            if (location.city == senderLocation.city) {
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

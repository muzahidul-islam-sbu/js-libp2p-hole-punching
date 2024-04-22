import http from 'http'

// Create a server instance
const server = http.createServer((req, res) => {
    // Set the response header
    res.writeHead(200, {'Content-Type': 'text/plain', 'connection': 'close'});
    // res.setHeader('Connection', 'close');
    
    // Send a response
    res.end('Hello, World!\n');
});

// Set the port number
const PORT = 5000;

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
export {server}
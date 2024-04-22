import http from 'http'
http.get("http://localhost:5000", (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(res)
        console.log('Response:', data);
    });
});
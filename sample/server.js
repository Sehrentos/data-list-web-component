// simple NodeJS server for testing the web component
const fs = require("fs")
const http = require("http")

const server = http.createServer((req, res) => {
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(fs.readFileSync("index.html"))
        return
    }

    if (req.url === "/UIDataList.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(fs.readFileSync("../UIDataList.js"))
        return
    }

    res.writeHead(404, { "Content-Type": "text/plain" })
    res.end("Not found")
})

server.listen(8080, () => {
    console.log("Server running at http://localhost:8080/")
})
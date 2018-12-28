/*
    PixelServer.js hosts the server that saves the painted pixel data
        and broadcasts it to all clients

    CREDITS
        Brandon Asuncion <me@brandonasuncion.tech>

    SETUP:
        $ npm install

    RUNNING:
        $ npm start

*/

/* Port for WebSocket server to listen on */
const PORT = process.env.PORT || 3001;

/* Dimensions of the canvas, these values must be the same as the ones
set in the browser's code. */
const CANVAS_WIDTH = process.env.CANVAS_WIDTH || 200;
const CANVAS_HEIGHT = process.env.CANVAS_HEIGHT || 50;

/* Minimum wait time between each draw request, per IP address (in seconds) */
const USER_PAINT_LIMIT = process.env.USER_PAINT_LIMIT || 60;


/*  !!!!! DONT EDIT ANYTHING AFTER THIS !!!!!  ok :-) */
var http = require("http");
var express = require("express");
var app = express();
var fs = require("fs");
var PNG = require('pngjs').PNG;

app.use(express.static(__dirname + "/public/"));

var server = http.createServer(app);
server.listen(PORT);

var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;

var timestamps = {};

var pixels = new Array(CANVAS_WIDTH);
for (var i = 0; i < CANVAS_WIDTH; i++)
    pixels[i] = Array(CANVAS_HEIGHT);

var BACKGROUND_COLOR = "rgb(255,255,255)"; // Must stay sync'd with the value in main.js

const endDate = new Date(Date.UTC(2018, 5, 11)); // This value must be sync'd with the value in main.js

// Reset pixel array
function resetPixels() {
    for (var x = 0; x < CANVAS_WIDTH; x++) {
        for (var y = 0; y < CANVAS_HEIGHT; y++) {
            pixels[x][y] = { x, y, color: BACKGROUND_COLOR };
        }
    }
}

function isActive(){
  return endDate - Date.now() > 0;
}


function setIt(x, y, color){
  if( y < CANVAS_HEIGHT && x < CANVAS_WIDTH){
    pixels[x][y].color = color;
  }
}

function loadBackground(xOffset, yOffset, path){
  fs.createReadStream(path)
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
        let i = yOffset, j;
        for (let y = 5; y < this.height; y += 9) {
            j = xOffset;
            for (let x = 5; x < this.width; x += 9) {
                const idx = (this.width * y + x) << 2;

                const r = this.data[idx];
                const g = this.data[idx+1];
                const b = this.data[idx+2];
                const a = this.data[idx+3];

                const color = "rgb(" + r + "," + g + "," + b + ")";
                
                setIt(j, i, color);
                setIt(j + 57, i, color);
                setIt(j + (57 * 2), i, color);
                setIt(j + (57 * 3), i, color);
                setIt(j + (57 * 4), i, color);
                setIt(j + (57 * 5), i, color);
              
                j++;
            }
            i++;
        }
    });
}

function loadSprite(xOffset, yOffset, path){
  fs.createReadStream(path)
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
        let i = 0, j;
        for (let y = 0; y < this.height; y += 1) {
            j = 0;
            for (let x = 0; x < this.width; x += 1) {
                const idx = (this.width * y + x) << 2;

                const r = this.data[idx];
                const g = this.data[idx+1];
                const b = this.data[idx+2];
                const a = this.data[idx+3];

                if(a === 255){
                  const color = "rgb(" + r + "," + g + "," + b + ")";
                  
                  setIt(j + xOffset, i + yOffset, color);
                }
                j++;
            }
            i++;
        }
    });
}


console.log("Pixel Server Initializing");

resetPixels();

loadBackground(0, 13, "input.png");
setTimeout(function(){
  loadSprite(5, 3, "megaman.png")
}, 100);

let ws = new WebSocketServer({ server });

ws.on("connection", function(socket) {
    var remoteIP = socket._socket.remoteAddress;

    var log = function(text) {
        //console.log("[" + (new Date()).toLocaleString() + "] [" + remoteIP + "] ->\t" + text);
        console.log("[Client " + remoteIP + "] ->\t" + text);
    };

    function sendPixelUpdate(x, y, receiver = socket) {
        receiver.send(JSON.stringify({
            "action": "updatePixel",
            x,
            y,
            'color': pixels[x][y].color
        }));
    }

    function sendTimer(type, time) {
        socket.send(JSON.stringify({
            "action": "timer",
            type,
            time
        }));
    }

    log("New client connected\t(" + ws.clients.size + " total)");

    socket.send(JSON.stringify({
        "action": "canvasInfo",
        "width": CANVAS_WIDTH,
        "height": CANVAS_HEIGHT
    }));

    function rgbToUint(color){
      const chunks = color.split(",");
      const r = chunks[0].slice(4);
      const g = chunks[1];
      const b = chunks[2].slice(0, -1);
      
      return r << 16 | 
             g << 8 | 
             b;
    }
    
    function uintToRgb(color){
      const mask = 255;
      
      const r = (color >> 16) & mask;
      const g = (color >> 8) & mask;
      const b = color & (mask);
      
      return "rgb(" + r + "," + g + "," + b + ")";
    }
    
    socket.on("message", function(rawdata) {
        var message_timestamp = new Date();

        var data;
        try {
            data = JSON.parse(rawdata);
        } catch (e) {}
        var action = (data && data.action) ? data.action : rawdata;

        switch (action) {
            /*
            case "clearCanvas":
                log("CLEARED CANVAS")
                resetPixels();
                break;
            */
            case "ping":
                socket.send('{"action":"pong"}');
                break;

            case "refreshPixels":
                log("Client requested pixel refresh");

                var pixelArray = new Uint32Array(CANVAS_WIDTH * CANVAS_HEIGHT);
                for (var x = 0; x < CANVAS_WIDTH; x++) {
                    for (var y = 0; y < CANVAS_HEIGHT; y++) {
                        pixelArray[x + y * CANVAS_WIDTH] = rgbToUint(pixels[x][y]["color"]);
                    }
                }

                socket.send(pixelArray);
                break;

            case "paint":

                // Check rate limits
                // if (remoteIP in timestamps) {
                //     if (message_timestamp - timestamps[remoteIP] < USER_PAINT_LIMIT * 1000) {
                //         sendTimer('toofast', USER_PAINT_LIMIT * 1000 - (message_timestamp - timestamps[remoteIP]));
                //         sendPixelUpdate(data.x, data.y);
                //         break;
                //     }
                // }

                if (isActive() && 
                    data.x >= 0 && data.y >= 0 && data.x < CANVAS_WIDTH && data.y < CANVAS_HEIGHT) {

                    log("PAINT (" + data.x + ", " + data.y + ") " + data.color);
                    pixels[data.x][data.y]["color"] = data.color;
                    timestamps[remoteIP] = message_timestamp;
                    sendTimer("paintsuccess", USER_PAINT_LIMIT * 1000);

                    

                    var broadcastPacket = JSON.stringify({
                        "action": "updatePixel",
                        'x': data.x,
                        'y': data.y,
                        'color': pixels[data.x][data.y].color
                    });
                    ws.clients.forEach(function(client) {
                        if ((client !== socket) && (client.readyState === WebSocket.OPEN)) {
                            client.send(broadcastPacket);
                        }
                    });

                } else {
                    log("Invalid paint request");
                }
                break;

            case "getPixel":
                log("GETPIXEL (" + data.x + ", " + data.y + ")");
                sendPixelUpdate(data.x, data.y);
                break;

            default:
                log("Invalid message");
                break;
        }
    });

    socket.on("error", function(exception) {
        log("Error encountered");
        log(exception);
    });

    socket.on("close", function() {
        log("Client disconnected (" + ws.clients.size + " total)");
    });
});

console.log("Pixel Server Listening on port " + PORT);

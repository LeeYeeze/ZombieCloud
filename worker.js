var net = require('net');
var HTTP = require("http");
var WebSocketServer = require("websocket").server;
var Game = require("./game.js");

var Frame = 0;
var FramesPerGameStateTransmission = 3;
var MaxConnections = 10;
var Connections = {};
var HTTPServer = HTTP.createServer(
			function(Request, Response)
			{
				Response.writeHead(200, { "Content-Type": "text/plain" });
				Response.end();
			}
			);
// createConnection
var tcpConnection = net.createConnection({port: 8181, host:'127.0.0.1'},
// connectListener callback
    function() {
        console.log('connection successful');
});

tcpConnection.on('data', function(data){
	var message= JSON.parse(data);
	if("rank" in message){
		console.log(message.rank);
		if(message.rank==1){
			setupGameServer();
		}
	}
	else if("connects" in message){
		Connections=message.connects;
		console.log("new state");
	}
});

function setupGameServer(){
	HTTPServer.listen(8001, function() { console.log("Listening for connections on port 8001"); });

// Creates a WebSocketServer using the HTTP server just created.
var Server = new WebSocketServer(
			{
				httpServer: HTTPServer,
				closeTimeout: 2000
			}
			);

Server.on("request",
			function(Request)
			{
				if (ObjectSize(Connections) >= MaxConnections)
				{
					Request.reject();
					return;
				}
				
				var Connection = Request.accept(null, Request.origin);
				Connection.IP = Request.remoteAddress;
				
				// Assign a random ID that hasn't already been taken.
				do { Connection.ID = Math.floor(Math.random() * 100000) } while (Connection.ID in Connections);
				Connections[Connection.ID] = Connection;
				
				Connection.on("message",
					function(Message)
					{
						// All of our messages will be transmitted as unicode text.
						if (Message.type == "utf8")
							HandleClientMessage(Connection.ID, Message.utf8Data);
					}
					);
					
				Connection.on("close",
					function()
					{
						HandleClientClosure(Connection.ID);
					}
					);
				
				console.log("Logged in " + Connection.IP + "; currently " + ObjectSize(Connections) + " users.");
			}
			);
function HandleClientClosure(ID)
{
	if (ID in Connections)
	{
		console.log("Disconnect from " + Connections[ID].IP);
		delete Connections[ID];
	}
}

function HandleClientMessage(ID, Message)
{
	// Check that we know this client ID and that the message is in a format we expect.
	if (!(ID in Connections)) {console.log("ID not in");return;}
	
	try { Message = JSON.parse(Message); }
	catch (Err) { return; }
	if (!("Type" in Message && "Data" in Message)) {console.log("wrong type");return;}
	
	// Handle the different types of messages we expect.
	var C = Connections[ID];
	switch (Message.Type)
	{
		// Handshake.
		case "HI":
			// If this player already has a car, abort.
			if (C.Car) break;
			
			// Create the player's car with random initial position.
            if("Details" in Message){
                C.Car=Message.Details;
                C.Car.Name= Message.Data.toString().substring(0, 10);

            }
            else{
                C.Car =
                {
                    X: Math.random() * (320-50),
                    Y: Math.random() * (480-100),
                    VX: 0,
                    VY: 0,
                    OR: 0,
                    // Put a reasonable length restriction on usernames, which will be displayed to all players.
                    Name: Message.Data.toString().substring(0, 10),
					// Flag for this player being human or zombie
					humanzombie: Math.floor(Math.random() * 2),
					// Flag for this player being alive or not
					alive: 1//Math.floor(Math.random() * 2)
                };
            }

			// Initialize the input bitfield.
			C.KeysPressed = 0;
			console.log(C.Car.Name + " spawned a car!");
			
			SendGameState();
			break;
			
		// Key up.
		case "U":
			if (typeof C.KeysPressed === "undefined") break;
			
			//if (Message.Data == 37) C.KeysPressed &= ~2; // Left
			//else if (Message.Data == 39) C.KeysPressed &= ~4; // Right
			//else if (Message.Data == 38) C.KeysPressed &= ~1; // Up
			C.KeysPressed=0;
			break;
			
		// Key down.
		case "D":
			if (typeof C.KeysPressed === "undefined") break;
			
			//if (Message.Data == 37) C.KeysPressed |= 2; // Left
			//else if (Message.Data == 39) C.KeysPressed |= 4; // Right
			//else if (Message.Data == 38) C.KeysPressed |= 1; // Up
			C.KeysPressed=Message.Data;
			break;
	}
}
function SendGameState()
{
	var CarData = [];
	var Indices = {};
	
	// Collect all the car objects to be sent out to the clients
	for (var ID in Connections)
	{
		// Some users may not have Car objects yet (if they haven't done the handshake)
		var C = Connections[ID];
		if (!C.Car) continue;
		
		CarData.push(C.Car);
		
		// Each user will be sent the same list of car objects, but needs to be able to pick
		// out his car from the pack. Here we take note of the index that belongs to him.
		Indices[ID] = CarData.length - 1;
	}
	//tcpConnection.write(JSON.stringify(Connections)+'\n');
	
	// Go through all of the connections and send them personalized messages. Each user gets
	// the list of all the cars, but also the index of his car in that list.
	for (var ID in Connections)
		Connections[ID].sendUTF(JSON.stringify({ MyIndex: Indices[ID], Cars: CarData }));
	//console.log(Connections);
}

// Set up game loop.
setInterval(function()
			{
				// Make a copy of the car data suitable for RunGameFrame.
				var Cars = [];
				for (var ID in Connections)
				{
					var C = Connections[ID];
					if (!C.Car) continue;
					
					Cars.push(C.Car);
				
					if (C.KeysPressed==37) {C.Car.OR =4; C.Car.VX=-1; C.Car.VY=0;}
					else if (C.KeysPressed==39) {C.Car.OR =6; C.Car.VX=1; C.Car.V=0;}
					else if (C.KeysPressed==38) {C.Car.OR =2; C.Car.VX=0; C.Car.VY=-1;}
					else if (C.KeysPressed==40) {C.Car.OR =0; C.Car.VX=0; C.Car.VY=1}
					else {C.Car.VX=0; C.Car.VY=0;}
				}
				
				Game.RunGameFrame(Cars);

				// Increment the game frame, which is only used to time the SendGameState calls.
				Frame = (Frame + 1) % FramesPerGameStateTransmission;
				if (Frame == 0) SendGameState();
			},
			20
			);
			
function ObjectSize(Obj)
{
	var Size = 0;
	for (var Key in Obj)
		if (Obj.hasOwnProperty(Key))
			Size++;
			
	return Size;
}
}
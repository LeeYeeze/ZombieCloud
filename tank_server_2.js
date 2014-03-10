
var HTTP = require("http");
var WebSocketServer = require("websocket").server;
var Game = require("./game.js");

var Frame = 0;
var FramesPerGameStateTransmission = 3;
var MaxConnections = 2;
var Connections = {};

// Creates an HTTP server that will respond with a simple blank page when accessed.
var HTTPServer = HTTP.createServer(
			function(Request, Response)
			{
				Response.writeHead(200, { "Content-Type": "text/plain" });
				Response.end();
			}
			);

// Starts the HTTP server on port 8001.
HTTPServer.listen(8003, function() { console.log("Listening for connections on port 8003"); });

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
	if (!(ID in Connections)) return;
	
	try { Message = JSON.parse(Message); }
	catch (Err) { return; }
	if (!("Type" in Message && "Data" in Message)) return;
	
	// Handle the different types of messages we expect.
	var C = Connections[ID];
	switch (Message.Type)
	{
		// Handshake.
		case "HI":
			// If this player already has a car, abort.
			if (C.Car) break;
			
			// Create the player's car with random initial position.
			C.Car = 
				{
					X: Math.random() * (320 - 118),
					Y: Math.random() * (480-118),
					VX: 0,
					VY: 0,
					OR: 0,
					// Put a reasonable length restriction on usernames, which will be displayed to all players.
					Name: Message.Data.toString().substring(0, 10)
				};

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
	
	// Go through all of the connections and send them personalized messages. Each user gets
	// the list of all the cars, but also the index of his car in that list.
	for (var ID in Connections)
		Connections[ID].sendUTF(JSON.stringify({ MyIndex: Indices[ID], Cars: CarData }));
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
				
					if (C.KeysPressed==37) {C.Car.OR =4; C.Car.VX=-0.3; C.Car.VY=0;}
					else if (C.KeysPressed==39) {C.Car.OR =6; C.Car.VX=0.3; C.Car.V=0;}
					else if (C.KeysPressed==38) {C.Car.OR =2; C.Car.VX=0; C.Car.VY=-0.3;}
					else if (C.KeysPressed==40) {C.Car.OR =0; C.Car.VX=0; C.Car.VY=0.3}
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
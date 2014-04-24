var net = require('net');
var HTTP = require("http");
var WebSocketServer = require("websocket").server;
var Game = require("./game.js");
var fs = require('fs');
var Memcached = require('memcached');
var memcached = new Memcached('localhost:11211');
var lifetime = 86400; //24hrs
var mongoose = require('mongoose');
var mongoDB = require('mongodb').Db;
var mongoServer = require('mongodb').Server;

var db = new mongoDB('test', new mongoServer('localhost', 27017));
	mongoose.connect('mongodb://localhost/test');
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function callback () {});
var playerSchema = mongoose.Schema({
	    name: String,
	    GameRecords: Number
		});
var player = mongoose.model('player', playerSchema);

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
	                C.Car = Message.Details;
	                C.Car.Name = Message.Data.toString().substring(0, 10);
									RetrieveDB(C.Car);
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
				console.log(C.Car.Name + " spawned a zombie/human!");
				
				UpdateDB(C.Car);
							
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
	
	function UpdateDB(oneCar)
	{
		/*var DB = fs.readFileSync("./Database.json");
	  try { var DataBase = JSON.parse(DB); }
		catch (Err) { return; }
	
		if (typeof DataBase[Name] === "undefined") {
			DataBase[Name] = 1;
		}	else {
			DataBase[Name] += 1;	
		}
		
		fs.writeFileSync("./Database.json", JSON.stringify(DataBase, null, 4));*/
		player.find({ name:oneCar.Name },function(err, oldplayer){
			if (err){
				var onePlayer = new player({ 
					name: oneCar.Name,
					GameRecords: 1
				})	
				onePlayer.save(function(err, oneplayer){
					if (err)	return console.error(err);
				})
			}
			else{
				oldplayer.GameRecords += 1;	
			}	
		});
		
		memcached.set(oneCar.Name, {X: oneCar.X, Y: oneCar.Y, VX: oneCar.VX, VY: oneCar.VY, OR: oneCar.OR, humanzombie: oneCar.humanzombie, alive: oneCar.alive}, lifetime, function( err, result ){
	  if( err ) console.error( err );
	  //console.dir( result );
	    //console.log("Database updated!" );
	});
	}
	
	function RetrieveDB(oneCar)
	{
		player.find({ name:oneCar.Name },function(err, oldplayer){
			if (err){
				console.log("Error:" + oneCar.Name + "db Not found");
			}
			else{
				console.log("No Error");
			}	
		});
		
		memcached.get(oneCar.Name, function( err, result ){
		  if( err ) console.error( err );
			oneCar.X = result.X;
			oneCar.Y = result.Y; 
			oneCar.VX = result.VX; 
			oneCar.VY = result.VY;
			oneCar.OR = result.OR; 
			oneCar.humanzombie = result.humanzombie; 
			oneCar.alive = result.alive;
	});
	    console.log("User " + oneCar.Name + " Data retrieved!" );		
	}	
		
	//	fs.readFile("./test.json", function (err, data) {
	//	  if (err) throw err;
	//	  try { DBd = JSON.parse(data); }
	//		catch (Err) { return; }
	//	  console.log(DBd);
	//	})
	//	
	//	if (typeof DB[Name] === "undefined") {
	//		DB[Name] = 1;
	//	}	else {
	//		DB[Name] += 1;	
	//	}
	//	
	//	fs.writeFile("./test.json", JSON.stringify(DB, null, 4), function(err) {
	//		if(err) { 
	//			console.log(err); 
	//		} else {
	//		  console.log("Database updated" ); 
	//		}
	//	})
		 
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
						else if (C.KeysPressed==32) 
						{
							C.Car.VX=0; C.Car.VY=0; 
							C.Car.firing=1;
							var hurtx1; var hurtx2; var hurty1; var hurty2;
							if(C.Car.OR == 4) {hurtx1 = C.Car.X-50; hurtx2 = C.Car.X; hurty1 = C.Car.Y; hurty2 = C.Car.Y+100;}
							else if(C.Car.OR == 6) {hurtx1 = C.Car.X+50; hurtx2 = C.Car.X+100; hurty1 = C.Car.Y; hurty2 = C.Car.Y+100;}
							else if(C.Car.OR == 2) {hurtx1 = C.Car.X; hurtx2 = C.Car.X+50; hurty1 = C.Car.Y-100; hurty2 = C.Car.Y;}
							else if(C.Car.OR == 0) {hurtx1 = C.Car.X; hurtx2 = C.Car.X+50; hurty1 = C.Car.Y+100; hurty2 = C.Car.Y+200;}
							
							if(C.Car.alive==1)
							{
								for (var ID in Connections)
								{
									var C2 = Connections[ID];
									var thiscarx = C2.Car.X + 25;
									var thiscary = C2.Car.Y + 50;
									if ((thiscarx>hurtx1) && (thiscarx<hurtx2) && (thiscary>hurty1) && (thiscary<hurty2) && (C.Car.humanzombie != C2.Car.humanzombie))
									{
										C2.Car.alive=0;
									}
								}
							}
						}
						else {C.Car.VX=0; C.Car.VY=0;C.Car.firing=0;}
					}
					
					Game.RunGameFrame(Cars);
					
					for (var ID in Connections)
					{
						var C = Connections[ID];
						if (!C.Car) continue;
						UpdateDB(C.Car);
					}
	
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
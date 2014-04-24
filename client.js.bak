var GraphicsContext;
var Cars=[];
var MyCar=[];
var Socket=[];
var GameFrameTime=20;
var GameTimer=null;
var KEY_CODES={37:'left', 38:'up', 39:'right', 40:'down', 32:'fire'};
var keys=[];
var BattleField;
var hostArray=new Array("localhost:8001","localhost:8002","localhost:8003","localhost:8004");
var index=0;
var Name

var ZombieImg=new Image();
ZombieImg.src="Zombie-Sprite-Sheet.png";
var HumanImg=new Image();
HumanImg.src="Human-Sprite-Sheet.png";

function resetSocket(start, mode)
{
    try
    {
        if (typeof MozWebSocket !== "undefined")
        { Socket[start] = new MozWebSocket("ws://"+hostArray[start]); }
        else if (typeof WebSocket !== "undefined")
        { Socket[start] = new WebSocket("ws://"+hostArray[start]);}
        else
        {
            Socket[start] = null;
            alert("Your browser does not support websockets. ");
            return false;
        }
    }
    catch (E) { Socket[start] = null; return false; }
    Socket[start].onerror=null;
    Socket[start].onerror = function(E) {
        /*if(start+1>=hostArray.length)
            alert("WebSocket error: " + JSON.stringify(E));
        else{
            //Socket[start].close();
            Socket[start]=null;
            if (mode==0){
                try
                {
                    if (typeof MozWebSocket !== "undefined")
                    { resetSocket(start+1,0);}
                    else if (typeof WebSocket !== "undefined")
                    {resetSocket(start+1,0);}
                    else
                    {
                        Socket[start] = null;
                        alert("Your browser does not support websockets. ");
                        return false;
                    }
                }
                catch (E) { Socket[start] = null; return false; }
            }
        }*/
    };
    Socket[start].onclose=null;
    Socket[start].onclose = function (E)
    {

        // Shut down the game loop.
        if (GameTimer) clearInterval(GameTimer);
        GameTimer = null;
        //Socket[start].close();
        resetSocket(start,1);
    };
    Socket[start].onopen=null;
    Socket[start].onopen = function()
    {
        //document.write("I here");
        // Send a handshake message.
        if (mode==0){
            Socket[start].send(JSON.stringify({ Type: "HI", Data: Name.substring(0, 10) }));
        }
        else {
            Socket[start].send(JSON.stringify({Type:"HI", Data: Name.substring(0,10),Details: MyCar}));
        }

        // Set up game loop.
        GameTimer = setInterval(
            function()
            {
                // Supposing MyCar is not null, which it shouldn't be if we're
                // participating in the game and communicating with the server.
                var maxVel=1;
                if (MyCar)
                {
                    // Turn and accelerate the car locally, while we wait for the server
                    // to respond to the key presses we transmit to it.
                    if(keys['left']){MyCar.VX=-maxVel;MyCar.VY=0;MyCar.OR=4;}
                    else if(keys['right']){MyCar.VX=maxVel;MyCar.VY=0;MyCar.OR=6}
                    else if(keys['up']){MyCar.VX=0;MyCar.VY=-maxVel;MyCar.OR=2;}
                    else if(keys['down']){MyCar.VX=0;MyCar.VY=maxVel;MyCar.OR=0;}
					else if(keys['fire']){MyCar.VX=0; MyCar.VY=0; MyCar.firing=1;}
                    else {MyCar.VX=0; MyCar.VY=0;MyCar.firing=0;}
                }

                RunGameFrame(Cars);
                DrawGame();
            },
            GameFrameTime);
    };
    Socket[start].onmessage=null;
    Socket[start].onmessage = function(E)
    {
        //resetSocket(start);
        var Message;

        // Check that the message is in the format we expect.
        try { Message = JSON.parse(E.data); }
        catch (Err) { return; }
        if (!("MyIndex" in Message && "Cars" in Message)) return;

        // Overwrite our old Cars array with the new data sent from the server.
        Cars = Message.Cars;
        if (Message.MyIndex in Cars) MyCar = Cars[Message.MyIndex];
    };
}


document.addEventListener("keydown",
    function(E)
    {
        console.log("keydown");
        if(KEY_CODES[event.keyCode]){
            keys[KEY_CODES[event.keyCode]]=true;
            E.preventDefault();
            for(var j=0; j<Socket.length;j++)
            if(Socket[j]&&Socket[j].readyState==1){
                Socket[j].send(JSON.stringify({Type:"D", Data: event.keyCode}))
            }
        }
    });

document.addEventListener("keyup",
    function(E){

        console.log("keyup");
        if(KEY_CODES[event.keyCode]){
            keys[KEY_CODES[event.keyCode]]=false;
            E.preventDefault();
            for(var j=0; j<Socket.length;j++)
            {if(Socket[j]&&Socket[j].readyState==1){
                Socket[j].send(JSON.stringify({Type:"U", Data: event.keyCode}))
            }
            }
        }
    }
);

window.addEventListener("load",
    function()
    {
        BattleField=document.getElementById("game");
        GraphicsContext=BattleField.getContext("2d");
        Name= prompt("What is your username?", "Anonymous");
        GraphicsContext.textAlign="center";
        GraphicsContext.fillText("Connecting...",BattleField.width/2,BattleField.height/2);
        resetSocket(0,0);

    }
);

function DrawGame()
{
    // Clear the screen
    GraphicsContext.clearRect(0, 0, BattleField.width, BattleField.height);
    GraphicsContext.font = "12pt Arial";
    GraphicsContext.fillStyle = "red";
    GraphicsContext.textAlign = "center";
	var myX;
	var myY;
	var myalive;
	
	GraphicsContext.fillStyle = "#A9A9A9";
	GraphicsContext.fillRect(0,0,BattleField.width,BattleField.height);
	
	for (var i = 0; i < Cars.length; i++)
    {			
		if (Cars[i] == MyCar)
		{
			myX=Cars[i].X;
			myY=Cars[i].Y;
			myalive=Cars[i].alive;
		}
	}
	
	if(myalive==1)
	{
	GraphicsContext.save();	
	GraphicsContext.beginPath();
	GraphicsContext.arc(myX+25,myY+50,100,0,Math.PI*2,false);
	GraphicsContext.clip();	
	GraphicsContext.fillStyle = "#000000";
	GraphicsContext.fillRect(0,0,BattleField.width,BattleField.height);
	
    for (var i = 0; i < Cars.length; i++)
    {
        var layer=0;
        var frame=0;
		if(Cars[i].humanzombie==0)
		{
			if(Cars[i].OR==4)
				frame=1;
			if(Cars[i].OR==6)
				frame=2;
			if(Cars[i].OR==2)
				frame=3;
			if(Cars[i].OR==0)
				frame=0;
		}
		else
		{
			if(Cars[i].OR==4)
				frame=3;
			if(Cars[i].OR==6)
				frame=2;
			if(Cars[i].OR==2)
				frame=0;
			if(Cars[i].OR==0)
				frame=1;
		}
		
		if(Cars[i].alive==1)
		{
			if(Cars[i].humanzombie==0)
			{
				GraphicsContext.drawImage(ZombieImg,0,0+frame*56,40,56,Math.floor(Cars[i].X),Math.floor(Cars[i].Y),50, 100);
			}
			else
			{
				GraphicsContext.drawImage(HumanImg,0,0+frame*64,32,64,Math.floor(Cars[i].X),Math.floor(Cars[i].Y),50, 100);
			}
			if(Cars[i].firing==1)
			{
				GraphicsContext.fillStyle = "#ffff00";
				if(Cars[i].OR==4)
					GraphicsContext.fillRect(Cars[i].X-50,Cars[i].Y,50,100);
				else if(Cars[i].OR==6)
					GraphicsContext.fillRect(Cars[i].X+50,Cars[i].Y,50,100);
				else if(Cars[i].OR==2)
					GraphicsContext.fillRect(Cars[i].X,Cars[i].Y-100,50,100);
				else if(Cars[i].OR==0)
					GraphicsContext.fillRect(Cars[i].X,Cars[i].Y+100,50,100);
			}
		}
	}	
	GraphicsContext.fillStyle = "red";	
	for (var i = 0; i < Cars.length; i++)
    {
        if ((Cars[i].Name)&&(Cars[i].alive==1)) 
			GraphicsContext.fillText((Cars[i] == MyCar ? "Me" : Cars[i].Name.substring(0, 10)), Cars[i].X | 0, Cars[i].Y | 0);
    }	
	GraphicsContext.restore();
	}
	else
	{
	GraphicsContext.fillStyle = "#000000";
	GraphicsContext.fillRect(0,0,BattleField.width,BattleField.height);
	
    for (var i = 0; i < Cars.length; i++)
    {
        var layer=0;
        var frame=0;
		if(Cars[i].humanzombie==0)
		{
			if(Cars[i].OR==4)
				frame=1;
			if(Cars[i].OR==6)
				frame=2;
			if(Cars[i].OR==2)
				frame=3;
			if(Cars[i].OR==0)
				frame=0;
		}
		else
		{
			if(Cars[i].OR==4)
				frame=3;
			if(Cars[i].OR==6)
				frame=2;
			if(Cars[i].OR==2)
				frame=0;
			if(Cars[i].OR==0)
				frame=1;
		}
		
		if(Cars[i].alive==1)
		{
			if(Cars[i].humanzombie==0)
			{
				GraphicsContext.drawImage(ZombieImg,0,0+frame*56,40,56,Math.floor(Cars[i].X),Math.floor(Cars[i].Y),50, 100);
			}
			else
			{
				GraphicsContext.drawImage(HumanImg,0,0+frame*64,32,64,Math.floor(Cars[i].X),Math.floor(Cars[i].Y),50, 100);
			}
			if(Cars[i].firing==1)
			{
				GraphicsContext.fillStyle = "#ffff00";
				if(Cars[i].OR==4)
					GraphicsContext.fillRect(Cars[i].X-50,Cars[i].Y,50,100);
				else if(Cars[i].OR==6)
					GraphicsContext.fillRect(Cars[i].X+50,Cars[i].Y,50,100);
				else if(Cars[i].OR==2)
					GraphicsContext.fillRect(Cars[i].X,Cars[i].Y-100,50,100);
				else if(Cars[i].OR==0)
					GraphicsContext.fillRect(Cars[i].X,Cars[i].Y+100,50,100);
			}
		}
	}
	
	GraphicsContext.fillStyle = "red";	
	for (var i = 0; i < Cars.length; i++)
    {
        if ((Cars[i].Name)&&(Cars[i].alive==1)) 
			GraphicsContext.fillText((Cars[i] == MyCar ? "Me" : Cars[i].Name.substring(0, 10)), Cars[i].X | 0, Cars[i].Y | 0);
    }
	GraphicsContext.fillStyle = "green";
	GraphicsContext.fillText("You are dead...",BattleField.width/2,BattleField.height/2);
	}
}
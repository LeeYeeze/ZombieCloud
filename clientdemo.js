var GraphicsContext;
var Cars=[];
var MyCar=[];
var Socket=null;
var GameFrameTime=20;
var Radius=118;
var GameTimer=null;
var KEY_CODES={37:'left', 38:'up', 39:'right', 40:'down', 32:'fire'};
var keys=[];
var CarImage=new Image();
var BattleField;
CarImage.src="Enemy-3-Sprite-Sheet.png";

document.addEventListener("keydown",
    function(E)
    {
        if(KEY_CODES[event.keyCode]){
            keys[KEY_CODES[event.keyCode]]=true;
            E.preventDefault();
            if(Socket&&Socket.readyState==1){
                Socket.send(JSON.stringify({Type:"D", Data: event.keyCode}))
            }
        }
    });

document.addEventListener("keyup",
    function(E){
        if(KEY_CODES[event.keyCode]){
            keys[KEY_CODES[event.keyCode]]=false;
            E.preventDefault();
            if(Socket&&Socket.readyState==1){
                Socket.send(JSON.stringify({Type:"U", Data: event.keyCode}))
            }
        }
    }
);

window.addEventListener("load",
    function()
    {
        BattleField=document.getElementById("game");
        GraphicsContext=BattleField.getContext("2d");
        var Name= prompt("What is your username?", "Anonymous");
        GraphicsContext.textAlign="center";
        GraphicsContext.fillText("Connecting...",BattleField.width/2,BattleField.height/2);

        try
        {
            if (typeof MozWebSocket !== "undefined")
                Socket = new MozWebSocket("ws://localhost:8001");
            else if (typeof WebSocket !== "undefined")
                Socket = new WebSocket("ws://localhost:8001");
            else
            {
                Socket = null;
                alert("Your browser does not support websockets. ");
                return false;
            }
        }
        catch (E) { Socket = null; return false; }

        Socket.onerror = function(E) { alert("WebSocket error: " + JSON.stringify(E)); };

        Socket.onclose = function (E)
        {
            // Shut down the game loop.
            if (GameTimer) clearInterval(GameTimer);
            GameTimer = null;
        };

        Socket.onopen = function()
        {
            // Send a handshake message.
            Socket.send(JSON.stringify({ Type: "HI", Data: Name.substring(0, 10) }));

            // Set up game loop.
            GameTimer = setInterval(
                function()
                {
                    // Supposing MyCar is not null, which it shouldn't be if we're
                    // participating in the game and communicating with the server.
                    var maxVel=0.3;
                    if (MyCar)
                    {
                        // Turn and accelerate the car locally, while we wait for the server
                        // to respond to the key presses we transmit to it.
                        if(keys['left']){MyCar.VX=-maxVel;MyCar.VY=0;MyCar.OR=4;}
                        else if(keys['right']){MyCar.VX=maxVel;MyCar.VY=0;MyCar.OR=6}
                        else if(keys['up']){MyCar.VX=0;MyCar.VY=-maxVel;MyCar.OR=2;}
                        else if(keys['down']){MyCar.VX=0;MyCar.VY=maxVel;MyCar.OR=0;}
                        else {MyCar.VX=0; MyCar.VY=0;}
                    }

                    RunGameFrame(Cars);
                    DrawGame();
                },
                GameFrameTime);
        };

        Socket.onmessage = function(E)
        {
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
);

function DrawGame()
{
    // Clear the screen
    GraphicsContext.clearRect(0, 0, BattleField.width, BattleField.height);
    GraphicsContext.font = "12pt Arial";
    GraphicsContext.fillStyle = "red";
    GraphicsContext.textAlign = "center";
    for (var i = 0; i < Cars.length; i++)
    {
        var layer=0;
        var frame=0;
        if(Cars[i].OR>=4)
        {
            layer=1;
            frame=Cars[i].OR-4;
        }
        else
        {
            layer=0;
            frame=Cars[i].OR;
        }
        GraphicsContext.drawImage(CarImage,
            0 + frame*118,
            0 +layer* 118,
            118, 118,
            Math.floor(Cars[i].X), Math.floor(Cars[i].Y),
            118, 118);

        if (Cars[i].Name) GraphicsContext.fillText((Cars[i] == MyCar ? "Me" : Cars[i].Name.substring(0, 10)), Cars[i].X | 0, Cars[i].Y | 0);
    }
}
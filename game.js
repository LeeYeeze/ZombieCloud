
var Radius=118;


var BattleField={width:320, height:480};
function RunGameFrame(Cars){
    for (var i=0; i<Cars.length; i++)
    {
        Cars[i].X+=Cars[i].VX;
        Cars[i].Y+=Cars[i].VY;
        if(Cars[i].X<0){Cars[i].X=0;}
        else if(Cars[i].X>BattleField.width-Radius){
            Cars[i].X=BattleField.width-Radius;
        }
        if(Cars[i].Y<0){Cars[i].Y=0;}
        else if(Cars[i].Y>BattleField-Radius){
            Cars[i].Y=BattleField-Radius;
        }
    }
}

if (typeof exports !== "undefined")
{
    exports.RunGameFrame = RunGameFrame;
}


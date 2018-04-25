var map;
var leftHandPrev;
var separationStart;
var SEPARATION_SCALING = 1.25;
var constLeftHand = 0;
var constRightHand = 1;
var marker;    
var infowindow;
var X = 0,
    Y = 1,
    Z = 2;

//callback
function move(frame) 
{
    //Checks if the leap has finished connecting to the websocket and if any gesture has been made
    if (frame.valid && frame.gestures.length > 0) 
    {
        frame.gestures.forEach(function (gesture) 
        {
            switch (gesture.type)
            {
                case "circle":
                    zoom(frame, gesture);
                    break;
                case "keyTap":
                    break;
                case "screenTap":
                    closeMarker();
                    break;
            }
        });
    }

    drawHands(frame);
    //Checando primeiro mao esquerda, pois o id da mesma é 0, se houver alguma mao detectada
    //A primeira posicao do array é certeza de nao ser nula
    if (frame.hands.length > 0 && isGripped(frame.hands[constLeftHand])) 
    {
        var leftHand = frame.hands[constLeftHand];
        //var rightHand = frame.hands.length > 1 ? frame.hands[constRightHand] : undefined; //Se houver mais de uma mao, nunca retorna undefined
        var separation;

        
        if (leftHandPrev == null) //
        {
            leftHandPrev = leftHand;
            return;
        }
        
        var dX = leftHandPrev.stabilizedPalmPosition[X] - leftHand.stabilizedPalmPosition[X];
        var dY = leftHandPrev.stabilizedPalmPosition[Y] - leftHand.stabilizedPalmPosition[Y];

        var center = map.getCenter();
        var scaling = 4.0 / Math.pow(2, map.getZoom() - 1);
        var newLat = center.lat() + dY * scaling;
        var newLng = center.lng() + dX * scaling;
        var newCenter = new google.maps.LatLng(newLat, newLng);


        map.setCenter(newCenter);
        leftHandPrev = leftHand;
    } 
    else 
    {
        if (frame.hands.length > constLeftHand && !isGripped(frame.hands[constLeftHand]) && leftHandPrev != null) {
            leftHandPrev = null;
        }
        
        if (frame.hands.length > constRightHand && !isGripped(frame.hands[constRightHand]) && separationStart != null) {
            separationStart = null;
        }

    }

    //alert(frame.pointable.length); //fingers
	
	switch(frame.pointable.length)
	{
		case 6:
		ChangeMap("hybrid");
		break;
		ChangeMap("roadmap");
		case 7:
		ChangeMap("satellite");
		break;
		case 8:
		ChangeMap("terrain");
		break;
	
	}
}

var handMarkers = [];
var HEIGHT_OFFSET = 150;

    function drawHands(frame) 
    {
        var scaling = (4.0 / Math.pow(2, map.getZoom() - 1));
        var bounds = map.getBounds();
        
        if (!bounds) 
        {
            return;
        }

        var origin = new google.maps.LatLng(bounds.getSouthWest().lat(), bounds.getCenter().lng());
        var hands = frame.hands;
        for (var i in hands) {
            if (hands.hasOwnProperty(i)) {
                //Check if there is more than 1 hand, if yes, do not handle the extras
                if (i > 0) {
                    return;
                }
                var hand = hands[i];
                newCenter = new google.maps.LatLng(origin.lat() + ((hand.stabilizedPalmPosition[1] - HEIGHT_OFFSET) *
                    scaling), origin.lng() + (hand.stabilizedPalmPosition[0] * scaling));
                
                var handIcon = getHandIcon(hand);
                var handMarker = handMarkers[i];
                
                if (!handMarker)
                {
                    handMarker = new google.maps.Marker();
                    handMarker.setOptions({
                        position: newCenter,
                        icon: handIcon,
                        map: map
                     
                    });
                    handMarkers[i] = handMarker;
                }

               handMarker.setOptions({
                   position : newCenter,
                   icon: handIcon
                });
                handMarkers[i] = handMarker;
            }
            handMarker.setOptions({
                position: newCenter
            });
        }
    }

var zoomLevelAtCircleStart;
var INDEX_FINGER = 1;

function zoom(frame, circleGesture) 
{
    if (circleGesture.pointableIds.length == 1 &&
        frame.pointable(circleGesture.pointableIds[0]).type == INDEX_FINGER) 
        {
        switch (circleGesture.state) 
        {
            case "start":
                zoomLevelAtCircleStart = map.getZoom();

            case "update":

                var zoomChange = Math.floor(circleGesture.progress);
                var currentZoom = map.getZoom();
                var zoomDirection = isClockwise(frame, circleGesture) ? zoomChange : -zoomChange;
                if (zoomLevelAtCircleStart + zoomDirection != currentZoom) 
                {
                    var newZoom = zoomLevelAtCircleStart + zoomDirection;
                    if (newZoom >= 0 && newZoom <= 22) 
                    {
                        map.setZoom(newZoom);
                    }
                }
                break;
            case "stop":
                zoomLevelAtCircleStart = null;
                break;
        }
    }
}

function initialize() 
{
    var mapOptions = {
        zoom: 8,
        center: new google.maps.LatLng(53.2784669, -9.0107282),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControlOptions: 
        {
            position: google.maps.ControlPosition.TOP_LEFT
        }
    };
    map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);
   
    //Leap setup using animation frame
    Leap.loop({
            enableGestures: true
        }, move);
    
}

function isGripped(hand) 
{
    return hand.grabStrength == 1.0;
}

function getHandIcon(hand) 
{
    if (isGripped(hand)) 
    {
        return "./images/closedHand.png";
    } 
    else 
    {
        return "./images/openHand.png";
    }
}

function closeMarker()
{
    //alert("Detectou swipe");
    //marker.setMap(null);
    infowindow.close();
}
function isClockwise(frame, gesture) 
{
    var clockwise = false;
    var pointableID = gesture.pointableIds[0];
    var direction = frame.pointable(pointableID).direction;
    var dotProduct = Leap.vec3.dot(direction, gesture.normal);
    if (dotProduct > 0) clockwise = true;
    return clockwise;
}
google.maps.event.addDomListener(window, 'load', initialize);

function ChangeMap(op)
{
    switch(op)
    {
        case "hybrid":
        {
            map.setOptions({
                mapTypeId: google.maps.MapTypeId.HYBRID
            });
            break;
        }
        case "roadmap":
        {
            map.setOptions({
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            break;
        }
        case "satellite":
        {
            map.setOptions({
                mapTypeId: google.maps.MapTypeId.SATELLITE
            });
            break;
        }
        case "terrain":
        {
            map.setOptions({
                mapTypeId: google.maps.MapTypeId.TERRAIN
            });
            break;
        }
    }
}

function NewPositionMap(lat,long,zoomMap, contentImg, contentTXT)
{
    map.setOptions({
        zoom: zoomMap,
        center: new google.maps.LatLng(lat, long)
    });
    
    var contentString = "<img width='400' src='"+ contentImg + "'>" + "<br><br>" + contentTXT

   // var contentString = "<div><img width='400' src='http://graftonstreet.ie/wp-content/uploads/2013/03/grafton_street_shot1.jpg'</div><br><br> Grafton Street (Irish: Sráid Grafton) is one of the two principal shopping streets in Dublin city centre, the other being Henry Street. It runs from St Stephen's Green in the south to College Green in the north (to the lowest point).";

    infowindow = new google.maps.InfoWindow
    ({
        content: contentString,
        maxWidth: 400
    });


    marker = new google.maps.Marker({
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(lat, long),
        map: map
      });

      marker.addListener('click', function() {
        infowindow.open(map, marker);
      });
}
// AIzaSyB1ptIqxvZLpayWsSscOgup_6CcRHNSACM


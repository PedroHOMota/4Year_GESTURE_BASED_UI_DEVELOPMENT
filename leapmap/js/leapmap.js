var map;
var leftHandPrev;
var separationStart;
var MAX_ZOOM = 22;
var SEPARATION_SCALING = 1.25;
var LEFT_HAND = 0,
    RIGHT_HAND = 1;
var X = 0,
    Y = 1,
    Z = 2;

function move(frame) {
    if (frame.valid && frame.gestures.length > 0) {
        frame.gestures.forEach(function (gesture) {
            filterGesture("circle", zoom)(frame, gesture);
        });
    }
    markHands(frame);
    
    if (frame.hands.length > 0 && isGripped(frame.hands[LEFT_HAND])) {
        var leftHand = frame.hands[LEFT_HAND];
        var rightHand = frame.hands.length > 1 ? frame.hands[RIGHT_HAND] : undefined;
        var separation;

        
        if (leftHandPrev == null) {
            leftHandPrev = leftHand;
            return;
        }
        
        if (rightHand) {
            if (isGripped(rightHand)) {
                separation = Math.sqrt(
                    Math.pow(rightHand.stabilizedPalmPosition[X] - leftHand.stabilizedPalmPosition[X], 2) +
                    Math.pow(rightHand.stabilizedPalmPosition[Y] - leftHand.stabilizedPalmPosition[Y], 2)
                );
                
                if (separationStart == null) {
                    separationStart = separation;
                    return;
                }
                
                var currentZoom = map.getZoom();
                if (currentZoom > 1 && separation < (separationStart / SEPARATION_SCALING)) {
                    map.setZoom(currentZoom - 1);
                    separationStart = separation;
                } else if (currentZoom < MAX_ZOOM && separation > (SEPARATION_SCALING * separationStart)) {
                    map.setZoom(currentZoom + 1);
                    separationStart = separation;
                }
            
            } else if (separationStart != null) {
                separationStart = null;
            }
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
    } else {
        
        if (frame.hands.length > LEFT_HAND && !isGripped(frame.hands[LEFT_HAND]) && leftHandPrev != null) {
            leftHandPrev = null;
        }
        
        if (frame.hands.length > RIGHT_HAND && !isGripped(frame.hands[RIGHT_HAND]) && separationStart != null) {
            separationStart = null;
        }

    }
}
var handMarkers = [];
var HEIGHT_OFFSET = 150;
var BASE_MARKER_SIZE_GRIPPED = 350000,
    BASE_MARKER_SIZE_UNGRIPPED = 500000;

    function markHands(frame) {
        var scaling = (4.0 / Math.pow(2, map.getZoom() - 1));
        var bounds = map.getBounds();
        // FIXME: Sometimes this gets run too early, just exit if its too early.
        if (!bounds) {
            return;
        }
        var origin = new google.maps.LatLng(bounds.getSouthWest().lat(), bounds.getCenter().lng());
        var hands = frame.hands;
        for (var i in hands) {
            if (hands.hasOwnProperty(i)) {
                //Check if there is more than 2 hands, if yes, do not handle the extras
                if (i > 1) {
                    return;
                }
                var hand = hands[i];
                newCenter = new google.maps.LatLng(origin.lat() + ((hand.stabilizedPalmPosition[1] - HEIGHT_OFFSET) *
                    scaling), origin.lng() + (hand.stabilizedPalmPosition[0] * scaling));
                var gripped = isGripped(hand);
                var baseRadius = gripped ? BASE_MARKER_SIZE_GRIPPED : BASE_MARKER_SIZE_UNGRIPPED;
                var handColor = getHandColor(hand);
                var handMarker = handMarkers[i];
                if (!handMarker) {
                    handMarker = new google.maps.Marker();
                    handMarker.setOptions({
                        position: newCenter,
                        icon: 'https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png',
                        map: map
                     
                    });
                    handMarkers[i] = handMarker;
                }
               handMarker.setOptions({
                   position : newCenter
                });
            }
        }
    }
var zoomLevelAtCircleStart;
var INDEX_FINGER = 1;

function zoom(frame, circleGesture) {
    
    if (circleGesture.pointableIds.length == 1 &&
        frame.pointable(circleGesture.pointableIds[0]).type == INDEX_FINGER) {
        switch (circleGesture.state) {
            case "start":
                zoomLevelAtCircleStart = map.getZoom();
            
            case "update":
                
            var zoomChange = Math.floor(circleGesture.progress);
                var currentZoom = map.getZoom();
                var zoomDirection = isClockwise(frame, circleGesture) ? zoomChange : -zoomChange;
                if (zoomLevelAtCircleStart + zoomDirection != currentZoom) {
                    var newZoom = zoomLevelAtCircleStart + zoomDirection;
                    if (newZoom >= 0 && newZoom <= MAX_ZOOM) {
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

function initialize() {
    var mapOptions = {
        zoom: 8,
        center: new google.maps.LatLng(-34.397, 150.644),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT
        }
    };
    map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);
   
    //Leap setup
    Leap.loop({
        enableGestures: true
    }, move);
}

function isGripped(hand) {
    return hand.grabStrength == 1.0;
}

function getHandColor(hand) {
    if (isGripped(hand)) {
        return "rgb(0,119,0)";
    } else {
        var tint = Math.round((1.0 - hand.grabStrength) * 119);
        tint = "rgb(119," + tint + "," + tint + ")";
        return tint;
    }
}

function filterGesture(gestureType, callback) {
    return function (frame, gesture) {
        if (gesture.type == gestureType) {
            callback(frame, gesture);
        }
    }
}

function isClockwise(frame, gesture) {
    var clockwise = false;
    var pointableID = gesture.pointableIds[0];
    var direction = frame.pointable(pointableID).direction;
    var dotProduct = Leap.vec3.dot(direction, gesture.normal);
    if (dotProduct > 0) clockwise = true;
    return clockwise;
}
google.maps.event.addDomListener(window, 'load', initialize);

// AIzaSyB1ptIqxvZLpayWsSscOgup_6CcRHNSACM
 
 
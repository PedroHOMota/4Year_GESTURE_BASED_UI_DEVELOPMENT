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
function move(frame) {
    //Checks if the leap has finished connecting to the websocket and if any gesture has been made
    if (frame.valid && frame.gestures.length > 0) {
        frame.gestures.forEach(function (gesture) {
            switch (gesture.type) {
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
    lat
    drawHands(frame);
    //Checando primeiro mao esquerda, pois o id da mesma é 0, se houver alguma mao detectada
    //A primeira posicao do array é certeza de nao ser nula
    if (frame.hands.length > 0 && isGripped(frame.hands[constLeftHand])) {
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
    } else {
        if (frame.hands.length > constLeftHand && !isGripped(frame.hands[constLeftHand]) && leftHandPrev != null) {
            leftHandPrev = null;
        }

        if (frame.hands.length > constRightHand && !isGripped(frame.hands[constRightHand]) && separationStart != null) {
            separationStart = null;
        }

    }

    //alert(frame.pointable.length); //fingers

    switch (frame.pointable.length) {
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

function drawHands(frame) {
    var scaling = (4.0 / Math.pow(2, map.getZoom() - 1));
    var bounds = map.getBounds();

    if (!bounds) {
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

            if (!handMarker) {
                handMarker = new google.maps.Marker();
                handMarker.setOptions({
                    position: newCenter,
                    icon: handIcon,
                    map: map

                });
                handMarkers[i] = handMarker;
            }

            handMarker.setOptions({
                position: newCenter,
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
var tid = -1;

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
                    if (newZoom >= 0 && newZoom <= 22) {
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

var streetView = false;
var links;
var panoIsMoving = false;
lat = 53.277024;
longe = -9.061486;
zoomMap = 8;

function initMap(str) {
    if (str) {
        var fenway = new google.maps.LatLng(lat, longe);
        // Note: constructed panorama objects have visible: true
        // set by default.
        var panoOptions = {
            position: fenway,
            addressControlOptions: {
                position: google.maps.ControlPosition.BOTTOM_CENTER
            },

            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL
            },
            enableCloseButton: false
        };
        map = new google.maps.StreetViewPanorama(
            document.getElementById('map-canvas'), panoOptions);

        map.addListener('links_changed', function () {
            links = map.getLinks();
        });
    } else {
        var fenway = new google.maps.LatLng(lat, longe);
        var mapOptions = {
            zoom: zoomMap,
            center: fenway,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT
            }
        };

        map = new google.maps.Map(document.getElementById('map-canvas'),
            mapOptions);
    }
}

frameCounter = 0;

function initialize() {
    initMap(streetView);

    //Leap setup using animation frame
    Leap.loop({
            enableGestures: true
        },
        function (frame) {
            if (frame.pointables.length == 10 && frameCounter < 1) {
                frameCounter = 120;
                streetView = !streetView;
                initMap(streetView);

            }

            frameCounter--;
            if (streetView) {
                moveStreetView(frame);
            } else {
                move(frame);
            }
        });

}

function isGripped(hand) {
    return hand.grabStrength == 1.0;
}

function getHandIcon(hand) {
    if (isGripped(hand)) {
        return "./images/closedHand.png";
    } else {
        return "./images/openHand.png";
    }
}

function closeMarker() {
    try {
        infowindow.close();
    } catch (Exception) {}
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

function ChangeMap(op) {
    switch (op) {
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

function NewPositionMap(latt, longg, zoomMapp, contentImg, contentTXT) {
    lat = latt;
    longe = longg;
    zoomMap = zoomMapp;
    map.setOptions({
        zoom: zoomMap,
        center: new google.maps.LatLng(lat, longe)
    });

    var contentString = "<img width='400' src='" + contentImg + "'>" + "<br><br>" + contentTXT

    infowindow = new google.maps.InfoWindow({
        content: contentString,
        maxWidth: 400
    });


    marker = new google.maps.Marker({
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(lat, longe),
        map: map
    });

    marker.addListener('click', function () {
        infowindow.open(map, marker);
    });
}

function moveStreetView(frame) {

    if (frame.hands.length > 0 && isGripped(frame.hands[0])) {
        // the grabbing controller migrated from leap-map
        var leftHand = frame.hands[0];

        // If there was no previous closed position, capture it and exit
        if (leftHandPrev == null) {
            leftHandPrev = leftHand;
            stabilizedPalmPositionAtGripForZ = leftHand.stabilizedPalmPosition[Z];
            return;
        }

        // Calculate how much the hand moved
        var dX = leftHandPrev.stabilizedPalmPosition[X] - leftHand.stabilizedPalmPosition[X];
        var dY = leftHandPrev.stabilizedPalmPosition[Y] - leftHand.stabilizedPalmPosition[Y];

        var zOffsetFromAtGrip = stabilizedPalmPositionAtGripForZ - leftHand.stabilizedPalmPosition[Z];

        /* we should call a function to change the panorama here */
        if (dX >= 0) {
            moveClockwise(dX);
        } else if (dX < 0) {
            moveCounterClockwise(dX);
        }

        processPitch(dY);

        if (zOffsetFromAtGrip >= 20 && panoIsMoving == false) {
            tid = setInterval(function () {
                moveLink("up");
            }, 500);
            panoIsMoving = true;
        }

        if (zOffsetFromAtGrip < 20) {
            clearInterval(tid);
            panoIsMoving = false;
        }

        leftHandPrev = leftHand;

    } else {
        // If the left hand is not in a grab position, clear the last hand position
        if (frame.hands.length > 0 && !isGripped(frame.hands[0]) && leftHandPrev != null) {
            leftHandPrev = null;
            stabilizedPalmPositionAtGripForZ = null;
            clearInterval(tid);
            panoIsMoving = false;


        }
    }
}

//Handles clockwise movement based on a given magnitude
function moveClockwise(magnitude) {
    if (isNaN(magnitude)) {
        return;
    }
    processRotation(true, magnitude);
}

//Handles counter-clockwise movement based on a given magnitude
function moveCounterClockwise(magnitude) {
    if (isNaN(magnitude)) {
        return;
    }
    processRotation(false, 0 - magnitude);
}

//Function to change the rotation of the panorama
function processRotation(direction, magnitude) {
    calls = +1;
    if (calls == 1) {
        if (direction == false) {

            var newHeading = (map.pov.heading - magnitude);

            //Adjust heading to be positive.
            if (newHeading < 0) {
                newHeading += 360;
            }

            //Readjust Pov heading.
            map.setPov({
                heading: newHeading,
                pitch: map.pov.pitch
            });

        } else {
            map.setPov({
                heading: ((map.pov.heading + magnitude) % 360),
                pitch: map.pov.pitch
            });
        }
    }
}

//Adjust the pitch of the map.
function processPitch(magnitude) {
    var newPitch = map.pov.pitch + magnitude;
    if (newPitch < -90 || newPitch > 90) {
        return;
    }

    map.setPov({
        heading: map.pov.heading,
        pitch: newPitch
    })
}

function moveLink(gestureDirection) {

    var relative_heading;
    var links_relative_headings = [links.length];
    var i;

    //Store our heading withing 0 to 360.
    if (map.pov.heading < 0) {
        relative_heading = map.pov.heading + 360;
    } else {
        relative_heading = map.pov.heading;
    }

    //Store link angles relative if our heading was 0 and make sure they are between 0 and 360.
    for (i = 0; i < links.length; i++) {
        links_relative_headings[i] = (links[i].heading - relative_heading);
        while (links_relative_headings[i] < 0) {
            links_relative_headings[i] = links_relative_headings[i] + 360;
        }
    }

    //Recognize and act according* to the direction of movement
    if (gestureDirection == "up") {
        for (i = 0; i < links.length; i++) {
            if ((0 <= links_relative_headings[i] && links_relative_headings[i] <= 45) ||
                (315 < links_relative_headings[i] && links_relative_headings[i] <= 360)) {
                processSVGestureData(links[i]);
                break;
            }
        }
    }
}

function processSVGestureData(linkData) {
    map.setPano(linkData.pano);

    map.setPov({
        heading: linkData.heading,
        pitch: 0
    });
    map.setVisible(true);
}
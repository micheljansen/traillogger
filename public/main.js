function log(text) {
  var el = document.getElementById("log");

  if("join" in text) {
    el.innerHTML = text.join(', ')+"\n" + el.innerHTML;
  }
  else {
    el.innerHTML = text+"\n" + el.innerHTML;
  }
}

var geo_options = {
  enableHighAccuracy: true,
  maximumAge        : 0,
  timeout           : Infinity
};

var watchID = navigator.geolocation.watchPosition(handleSuccess, handleError, geo_options);

function handleSuccess(position) {
  log([position.timestamp, position.coords.latitude, position.coords.longitude, position.coords.accuracy]);
  var xmlhttp = new XMLHttpRequest();
  var measured_time = position.timestamp > 1000000000 ? position.timestamp / 1000 : position.timestamp;
  var send_time = new Date().getTime() / 1000;
  xmlhttp.open("GET","/ping?&t="+send_time
               +"&mt="+measured_time
               +"&lat="+position.coords.latitude
               +"&long="+position.coords.longitude
               +"&acc="+position.coords.accuracy
               +"&alt="+position.coords.altitude
               +"&alt_acc="+position.coords.altitudeAccuracy

    ,true);
  xmlhttp.send();
}

function handleError() {
  //alert("error");
  log("gps error");
}

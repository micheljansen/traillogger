function log(text) {
  var el = document.getElementById("log");
  el.innerHTML = text;

  /*
  if("join" in text) {
    el.innerHTML = text.join(', ')+"\n" + el.innerHTML;
  }
  else {
    el.innerHTML = text+"\n" + el.innerHTML;
  }
  */
  if(console && console.log) { console.log(text); }
}

function startLogging() {
  if(window["humanTideLoggingEnabled"]) {
    return;
  }

  window["humanTideLoggingEnabled"] = true;

  var geo_options = {
    enableHighAccuracy: true,
    maximumAge        : 0,
    timeout           : Infinity
  };

  var watchID = navigator.geolocation.watchPosition(handleSuccess, handleError, geo_options);

  return watchID;
}

function handleSuccess(position) {
  if(window.location.hash == "#step4") {
    window.location.hash = "#step5";
  }
  var xmlhttp = new XMLHttpRequest();
  var measured_time = position.timestamp > 1000000000 ? position.timestamp / 1000 : position.timestamp;
  var dt = new Date(measured_time * 1000);
  var ts = dt.getHours()+":"+dt.getMinutes()+":"+dt.getSeconds();
  log([ts, Math.floor(position.coords.accuracy)]);
  var send_time = new Date().getTime() / 1000;
  xmlhttp.open("GET","/ping?&t="+send_time
               +"&mt="+measured_time
               +"&lat="+position.coords.latitude
               +"&long="+position.coords.longitude
               +"&acc="+position.coords.accuracy
               +(position.coords.altitude ? "&alt="+position.coords.altitude : "")
               +(position.coords.altitudeAccuracy ? "&alt_acc="+position.coords.altitudeAccuracy : "")

    ,true);
  xmlhttp.send();
}

function handleError(err) {
  //alert("error");
  log("gps error");
  if(err.code == 1) {
    alert("Your device denied access to its location. Please check your permissions or settings and try again.");
    window["humanTideLoggingEnabled"] = false;
    window.location.hash = "#step3";
  }
}

function showPage() {
  var hash = window.location.hash;
  switch(hash) {
    case "#step2":
      $('#step1, #step3, #step4, #step5, #done').fadeOut('fast');
      $('#step2').fadeIn('fast'); 
      break;
    case "#step3":
      $('#step1, #step2, #step4, #step5, #done').fadeOut('fast');
      $('#step3').fadeIn('fast'); 
      break;
    case "#step4":
      $('#step1, #step2, #step3, #step5, #done').fadeOut('fast');
      $('#step4').fadeIn('fast');
      startLogging();
      break;
    case "#step5":
      $('#step1, #step2, #step3, #step4, #done').fadeOut('fast');
      $('#step5').fadeIn('fast');
      break;
    case "#done":
      $('#step1, #step2, #step3, #step4, #step5').fadeOut('fast');
      $('#done').fadeIn('fast'); 
      startLogging();
      break;
    default:
      $('#step2, #step3, #step4, #step5, #done').fadeOut('fast');
      $('#step1').fadeIn('fast'); 
  }
  $('html, body').animate({ scrollTop: 0 }, 10);
}

window.addEventListener("hashchange", showPage, false);

// if someone refreshes past step 4, bump them back to the "waiting" dialog.
if(window.location.hash == "#step5" || window.location.hash == "#done" ) {
  window.location.hash = "#step4";
}
// run showPage on page load
$(showPage);

$('a').css('cursor', 'pointer');




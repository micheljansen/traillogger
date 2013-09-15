// create a map in the "map" div, set the view to a given place and zoom
var map = L.map('map').setView([51.37291984476517, 1.1135458918156482], 16);

// add an OpenStreetMap tile layer
/*
new L.StamenTileLayer("watercolor").addTo(map);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
*/

map._layersMaxZoom=20


function getUrlVars() {
  var URLParams = "";
  var ps = window.location.search.split(/\?|&/);
  for (var i = 0; i<ps.length; i++) {
    if (ps[i]) {
      var p = ps[i].split(/=/);
      URLParams = URLParams + p[0] + '=' + p[1] + '&';
    }
  }
  return URLParams;
}


var funkycolors = ["blueviolet", "chartreuse", "darkblue", "darkmagenta", "green", "indigo", "maroon", "orangered", "black", "magenta", "deeppink"];
var params = getUrlVars();
var $debug = $("#debug");

$.ajax({dataType: "JSON", url: "/segments.json?"+ params })
.done(function(segments) {
  var bounds = new L.LatLngBounds();

   _(segments).each(function(segment) {
    for (var cid in segment) {
      var trail = segment[cid];
      var latlngs = trail.map(function(e) { return new L.LatLng(+e.latitude, +e.longitude) });
      bounds.extend(latlngs);
      //var pl = new L.Polyline(latlngs, {color: funkycolors[cid % funkycolors.length]}).addTo(map)
      var pl = new L.Polyline(latlngs, {color: "black"}).addTo(map)
      var dots = trail.map(function(e) {
        var dt =  new Date(e.generated_at);
        var minute = dt.getMinutes();
        var t = (dt.getMinutes()*60+dt.getSeconds())/(60*60);
        var dot = new L.Circle(new L.LatLng(+e.latitude, +e.longitude), 0.5 /*e.accuracy*/,
        {
          //color: funkycolors[cid & funkycolors.length],
          color: "hsl("+Math.floor(360*t)+",100%, 50%)",
          //stroke: false,
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
          title: "test"
        });
        // dot.addTo(map);
        dot.on('mouseover', function() { $debug.html(JSON.stringify(e, null, "  ")); console.log(e) });
        return dot;
      });
    }
  });

  map.fitBounds(bounds);

  // start at sensible zoomlevel
  if(map.getZoom() > 16) {
    //map.setZoom(16);
  }
});


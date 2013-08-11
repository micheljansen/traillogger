// create a map in the "map" div, set the view to a given place and zoom
var map = L.map('map').setView([51.505, -0.09], 13);

// add an OpenStreetMap tile layer
//new L.StamenTileLayer("watercolor").addTo(map);
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

$.ajax({dataType: "JSON", url: "/trails.json?"+ params })
.done(function(result) {
  var bounds = new L.LatLngBounds();

  var grouped = result.reduce(function(coll, e, i, array){
    coll[e.client_id] = coll[e.client_id] ? coll[e.client_id] : [];
    coll[e.client_id].push(e);
    return coll;
  }, {});

  for (var key in grouped) {
    var trail = grouped[key];
    var latlngs = trail.map(function(e) { return new L.LatLng(+e.latitude, +e.longitude) });
    bounds.extend(latlngs);
    //var pl = new L.Polyline(latlngs, {color: funkycolors[key % funkycolors.length]}).addTo(map)
    var dots = trail.map(function(e) {
      var dt =  new Date(e.generated_at);
      var minute = dt.getMinutes();
      var t = (dt.getMinutes()*60+dt.getSeconds())/(60*60);
      var dot = new L.Circle(new L.LatLng(+e.latitude, +e.longitude), 0.5 /*e.accuracy*/,
      {
        //color: funkycolors[key & funkycolors.length],
        color: "hsl("+Math.floor(256*t)+",100%, 50%)",
        stroke: false,
        title: "test"
      });
      dot.addTo(map);
      return dot;
    });
  }

  map.fitBounds(bounds);

  // start at sensible zoomlevel
  if(map.getZoom() > 16) {
    //map.setZoom(16);
  }
});


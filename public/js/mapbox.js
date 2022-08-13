export const displayMap = (locations) => {
  // Here goes the mapbox
  mapboxgl.accessToken =
    'pk.eyJ1Ijoiamp1MWk0biIsImEiOiJjbDY4N2I4eHczc2VoM2lvMXMyODJ6MXU2In0.g20TcwXVDP5CO2atzHXpXQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jju1i4n/cl687nmyo005s14m8n62rmuh0',
    scrollZoom: false,
    //center: [-40, 34],
    //zoom: 10,
    //interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create Marker
    const el = document.createElement('div');
    el.className = 'marker';
    // Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bound to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};

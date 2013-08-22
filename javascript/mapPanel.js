(function() {

    pandemix.MapPanel = function() {
        var map,
            bounds = undefined,
            layers = [],
            layerControl,
            mapData = undefined,
            centroids = {"Tibet": [87, 31.7], "HongKong": [114, 22]},
            contoursLoaded = false;


        var panel = {
            panelType: "mapPanel",

            placePanel: function(targ) {
                map = new L.Map(targ, {
                    center: [34, 104],
                    zoom: 4,
                    maxBounds: [[-90, -180], [90, 180]]
                });
                layerControl = L.control.layers(null, null).addTo(map);
                return panel;
            },

            //begin loading map file and return immediately
            loadContours: function(dataFile) {
                var that = this;
                d3.json(dataFile, function(json) {
                    var path = d3.geo.path().projection(that.project);
                    mapData = json; //save a reference to the parsed contour file for use with layers
                    bounds = d3.geo.bounds(mapData);
                    

                    for (var i = 0; i < mapData.features.length; i++) {
                        var centroid = path.centroid(mapData.features[i]);
                        if (centroid) {
                            centroid = map.layerPointToLatLng(new L.Point(centroid[0], centroid[1]));
                            centroids[mapData.features[i].properties.name] = [centroid.lng, centroid.lat];
                        }
                    }
                    contoursLoaded = true;
                });
                return panel;
            },

            addTileLayer: function(source) {
                var l = new L.TileLayer(source, {
                                 noWrap: true
                });
                map.addLayer(l);
                layerControl.addOverlay(l, "Tiles");
                return panel;
            },

            addLayer: function(layer, args) {
                var that = this;
                var args = args || {};
                pandemix.when(function() {return contoursLoaded; },
                               function() {
                                   args.map = map;
                                   args.project = that.project;
                                   args.bounds = bounds;
                                   args.mapData = mapData;
                                   args.centroids = centroids;
                                   var l = new layer(args);
                                   layerControl.addOverlay(l, args.name || "layer");
                                   map.addLayer(l);
                                   layers.push(l);
                               },
                               100);
                return panel;
            },

            getMap: function() {
                return map;
            },

            leafSelectionUpdate: function() {
                var selectedRegions = [],
                    i;

                for (i = 0; i < pandemix.selectedLeaves.length; i += 1) {
                    if (!pandemix.contains(selectedRegions, pandemix.selectedLeaves[i].location)) {
                        selectedRegions.push(pandemix.selectedLeaves[i].location);
                    }
                }

                for (i = 0; i < layers.length; i += 1) {
                    //use this instead of hasOwnProperty because layer functions get stored in the prototype by leaflet
                    if ("leafSelectionUpdate" in layers[i]) {
                        layers[i].leafSelectionUpdate(selectedRegions);
                    }
                }
            },

            timeSelectionUpdate: function() {
                for (i = 0; i < layers.length; i += 1) {
                    //use this instead of hasOwnProperty because layer functions get stored in the prototype by leaflet
                    if ("timeSelectionUpdate" in layers[i]) {
                        layers[i].timeSelectionUpdate();
                    }
                }
            },

            project: function(x) {
                var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
                return [point.x, point.y];
            }
        };

        return panel;
    }

})();



















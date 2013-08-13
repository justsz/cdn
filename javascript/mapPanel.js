(function() {

    treestuff.MapPanel = function() {
        var panel,
            provinceLayer,
            centroidLayer,
            map,
            tileLayer,
            provLayer,
            centroidLayer,
            treeLayer,
            baseLayers,
            overlayLayers,
            mapData = null,
            centroids = {},
            centroidsLoaded = false,
            dataFile = "data/reducedGeography.json";

        function abs(v) {
            if (v < 0) {
                v = -v;
            }
            return v;
        }

        provinceLayer = L.Class.extend({
            svg: "",

            g: "",

            bounds: "",

            path: "",

            feature: "",

            initialize: function (map) {
                // save position of the layer or any options from the constructor
                //this._latlng = latLng;
                var that = this;
                this._map = map;

                // create a DOM element and put it into one of the map panes
                this._el = L.DomUtil.create('div', 'provinceLayer leaflet-zoom-hide');
                this.svg = d3.select(this._el).append("svg");

                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");

                if (!mapData) {
                    d3.json(dataFile, function(collection) {
                        mapData = collection;
                        processData(collection);
                        that._reset();
                    });
                } else {
                    processData(mapData);
                    that._reset();
                }

                function processData(dat) {
                    that.bounds = d3.geo.bounds(dat);
                    //TODO: add this check for latitude as well if needed
                    if (that.bounds[1][0] < that.bounds[0][0]) { //if true, the area has crossed the antimeridian
                        //set the bounds to span the entire map
                        that.bounds[0][0] = -180;
                        that.bounds[1][0] = 180;
                    }
                    that.path = d3.geo.path().projection(that._project);

                    that.feature = that.g.selectAll("path")
                                    .data(dat.features)
                                    .enter().append("path");                    
                }
            },

            onAdd: function (map) {
                var that = this;
                map.getPanes().overlayPane.appendChild(this._el);
                map.on('viewreset', that._reset, that);
            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                map.getPanes().overlayPane.removeChild(this._el);
                map.off('viewreset', this._reset, this);
            },

            _reset: function () {
                var bottomLeft = this._project(this.bounds[0]),
                topRight = this._project(this.bounds[1]);


                this.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                this.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                this.feature.attr("d", this.path);
            },

            _project: function(x) {
                var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
                return [point.x, point.y];
            }
        });


        centroidLayer = L.Class.extend({
            svg: "",

            g: "",

            bounds: "",

            path: "",

            circle: "",

            initialize: function (map) {
                var that = this;
                this._map = map;

                // create a DOM element and put it into one of the map panes
                this._el = L.DomUtil.create('div', 'centroidLayer leaflet-zoom-hide');      //<<could replace this (And similar) with a D3 method for consistency

                this.svg = d3.select(this._el).append("svg");
                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");//.attr("class", "leaflet-zoom-hide");

                if (!mapData) {
                    d3.json(dataFile, function(collection) {
                        mapData = collection;
                        processData(collection);
                        that._reset();
                    });
                } else {
                    processData(mapData);
                    that._reset();
                }

                function processData(dat) {
                    that.bounds = d3.geo.bounds(dat);
                    that.path = d3.geo.path().projection(that._project);

                    
                    if (!centroidsLoaded) {
                        for (var i = 0; i < dat.features.length; i++) {
                            var centroid = that.path.centroid(dat.features[i]);
                            if (centroid) {
                                centroid = map.layerPointToLatLng(new L.Point(centroid[0], centroid[1]));
                                centroids[dat.features[i].properties.name] = centroid;
                            }
                        }
                        centroidsLoaded = true;
                    }

                    circleCoords = [];
                    for (c in centroids) {
                        if (centroids.hasOwnProperty(c)) {
                            circleCoords.push({center : [centroids[c].lng, centroids[c].lat]});
                        }
                    }

                    that.circle = that.g.selectAll("circle")
                                      .data(circleCoords)
                                      .enter().append("circle").attr("r", 5);
                };
            },

            onAdd: function (map) {
                var that = this;
                map.getPanes().overlayPane.appendChild(this._el);
                // add a viewreset event listener for updating layer's position, do the latter
                map.on('viewreset', that._reset, that);
            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                map.getPanes().overlayPane.removeChild(this._el);
                map.off('viewreset', this._reset, this);
            },

            _reset: function () {
                var that = this;
                // update layer's position
                //var pos = this._map.latLngToLayerPoint(this._latlng);
                //L.DomUtil.setPosition(this._el, pos);

                var bottomLeft = this._project(this.bounds[0]),
                topRight = this._project(this.bounds[1]);

                this.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                this.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                this.circle.attr("cx", function(d) {return that._project(d.center)[0]; })
                    .attr("cy", function(d) {return that._project(d.center)[1]; });

            },

            _project: function(x) {
                var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
                return [point.x, point.y];
            },
        });

        function approx(a, b, p) {
            return a > (b - p) || a < (b + p);
        }


        treeLayer = L.Class.extend({
            svg: "",

            g: "",

            bounds: "",

            path: "",

            tree: "",

            initialize: function (map, tree) {
                var that = this;
                this._map = map;

                // create a DOM element and put it into one of the map panes
                this._el = L.DomUtil.create('div', 'centroidLayer leaflet-zoom-hide');

                this.svg = d3.select(this._el).append("svg");
                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");

                function processData(dat) {
                    that.bounds = d3.geo.bounds(dat);
                    that.path = d3.geo.path().projection(that._project);

                   circleCoords = [];    
                   for (var i = 0; i < dat.features.length; i++) {
                       var centroid = that.path.centroid(dat.features[i]);
                       if (centroid) {
                           centroid = map.layerPointToLatLng(new L.Point(centroid[0], centroid[1]));
                           centroids[dat.features[i].properties.Administra] = centroid;
                           circleCoords.push({center : [centroid.lng, centroid.lat]});
                       }
                   }

                    that.circle = that.g.selectAll("circle")
                                  .data(circleCoords)
                                  .enter().append("circle").attr("r", 5);

                
                };

            },

            onAdd: function (map) {
                map.getPanes().overlayPane.appendChild(this._el);
                map.on('viewreset', that._reset, that);
            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                map.getPanes().overlayPane.removeChild(this._el);
                map.off('viewreset', this._reset, this);
            },

            _reset: function () {
                var that = this;

                var bottomLeft = this._project(this.bounds[0]),
                topRight = this._project(this.bounds[1]);

                this.svg .attr("width", topRight[0] - bottomLeft[0])
                    .attr("height", bottomLeft[1] - topRight[1])
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                this.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                this.circle.attr("cx", function(d) {return that._project(d.center)[0]; })
                    .attr("cy", function(d) {return that._project(d.center)[1]; });

            },

            _project: function(x) {
                var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
                return [point.x, point.y];
            },

            _drawTree: function(tee) {
                console.log(root);
            }
        });


        panel = {
            panelType: "mapPanel",

            placePanel: function(target) {
                map = new L.Map(target, {
                    center: [34, 104],
                    zoom: 2,
                });
            },

            initializePanelData: function() {
                tileLayer = new L.TileLayer("http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/998/256/{z}/{x}/{y}.png");
                provLayer = new provinceLayer(map)
                centroidLayer = new centroidLayer(map);

                baseLayers = {"Tiles": tileLayer};
                overlayLayers = {"Provinces": provLayer,
                                     "Centroids": centroidLayer};

                map.addLayer(tileLayer)
                   .addLayer(centroidLayer)
                   .addLayer(provLayer);

                L.control.layers(null, overlayLayers).addTo(map);
            },

            drawTree: function(tree) {
                //centroidLayer._drawTree(root);
            },

            getMap: function() {
                return map;
            }
        };

        return panel;
    }

})();



















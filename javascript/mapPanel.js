(function() {

    treestuff.MapPanel = function() {
        var panel,
            provinceLayer,
            centroidLayer,
            map,
            tileLayer,
            provLayer,
            centroidLayer,
            baseLayers,
            overlayLayers;

        provinceLayer = L.Class.extend({
            svg: "",

            g: "",

            bounds: "",

            path: "",

            feature: "",

            initialize: function (latLng) {
                // save position of the layer or any options from the constructor
                //this._latlng = latLng;
            },

            onAdd: function (map) {
                var that = this;
                this._map = map;

                // create a DOM element and put it into one of the map panes
                this._el = L.DomUtil.create('div', 'provinceLayer leaflet-zoom-hide');
                map.getPanes().overlayPane.appendChild(this._el);

                this.svg = d3.select(this._el).append("svg");

                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");//.attr("class", "leaflet-zoom-hide");

                d3.json("data/china.geojson", function(collection) {
                    that.bounds = d3.geo.bounds(collection);
                    that.path = d3.geo.path().projection(that._project);

                    that.feature = that.g.selectAll("path")
                                    .data(collection.features)
                                    .enter().append("path");


                // add a viewreset event listener for updating layer's position, do the latter
                    map.on('viewreset', that._reset, that);
                    that._reset();
                });

            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                map.getPanes().overlayPane.removeChild(this._el);
                map.off('viewreset', this._reset, this);
            },

            _reset: function () {
                // update layer's position
                //var pos = this._map.latLngToLayerPoint(this._latlng);
                //L.DomUtil.setPosition(this._el, pos);

                var bottomLeft = this._project(this.bounds[0]),
                topRight = this._project(this.bounds[1]);

                this.svg .attr("width", topRight[0] - bottomLeft[0])
                    .attr("height", bottomLeft[1] - topRight[1])
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

            data: null,

            initialize: function (latLng) {
                // save position of the layer or any options from the constructor
                //this._latlng = latLng;
            },

            onAdd: function (map) {
                var that = this;
                this._map = map;

                // create a DOM element and put it into one of the map panes
                this._el = L.DomUtil.create('div', 'centroidLayer leaflet-zoom-hide');
                map.getPanes().overlayPane.appendChild(this._el);

                this.svg = d3.select(this._el).append("svg");
                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");//.attr("class", "leaflet-zoom-hide");

                if (!this.data) {
                    d3.json("data/china.geojson", function(collection) {
                        that.data = collection;
                        processData(collection);
                    });
                } else {
                    processData(this.data);
                }

                function processData(dat) {
                    that.bounds = d3.geo.bounds(dat);
                    that.path = d3.geo.path().projection(that._project);

                   circleCoords = [];    
                   for (var i = 0; i < dat.features.length; i++) {
                       var centroid = that.path.centroid(dat.features[i]);
                       if (centroid) {
                           centroid = map.layerPointToLatLng(new L.Point(centroid[0], centroid[1]));
                           circleCoords.push({center : [centroid.lng, centroid.lat]});
                       }
                   }

                    that.circle = that.g.selectAll("circle")
                                  .data(circleCoords)
                                  .enter().append("circle").attr("r", 5);

                // add a viewreset event listener for updating layer's position, do the latter
                    map.on('viewreset', that._reset, that);
                    that._reset();
                };

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

            _drawTree: function(tree) {
                
            }
        });


        panel = {
            panelType: "mapPanel",

            placePanel: function(target) {
                map = new L.Map(target, {
                    center: [33.966142, 103.710938],
                    zoom: 4
                });
            },

            initializePanelData: function() {
                tileLayer = new L.TileLayer("http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/998/256/{z}/{x}/{y}.png");
                provLayer = new provinceLayer();
                centroidLayer = new centroidLayer();

                baseLayers = {"Tiles": tileLayer};
                overlayLayers = {"Provinces": provLayer,
                                     "Centroids": centroidLayer};

                map.addLayer(tileLayer)
                   .addLayer(provLayer)
                   .addLayer(centroidLayer);

                L.control.layers(null, overlayLayers).addTo(map);
            }
        };

        return panel;
    }

})();



















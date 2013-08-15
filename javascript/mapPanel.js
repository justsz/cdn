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
            //forceLayer,
            overlayLayers,
            layerControl,
            mapData = null,
            centroids = {"Tibet": [87, 31.7], "HongKong": [114, 22]},
            centroidsLoaded = false,
            dataFile = "data/reducedGeography.json";

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
                                    .enter().append("path")
                                    .on("click", function(d) {
                                        //find names via crossfilter
                                        treestuff.dateDim.filter(null);
                                        treestuff.selectedLeaves = 
                                        treestuff.locDim.filter(d.properties.name).top(Infinity);
                                        treestuff.callUpdate("leafSelectionUpdate");
                                        //if no taxa are in this location, the clicked province won't highlight 
                                        //from the selection update so highlight manually
                                        d3.select(this).classed("highlighted", true);
                                    });                    
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
                this._el = L.DomUtil.create('div', 'centroidLayer leaflet-zoom-hide');  //<<could replace this (And similar) with a D3 method for consistency

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
                                centroids[dat.features[i].properties.name] = [centroid.lng, centroid.lat];
                            }
                        }
                        centroidsLoaded = true;
                    }

                    circleCoords = [];
                    for (c in centroids) {
                        if (centroids.hasOwnProperty(c)) {
                            circleCoords.push({center : [centroids[c][0], centroids[c][1]]});
                        }
                    }


                    that.circle = that.g.selectAll("circle")
                                      .data(circleCoords)
                                      .enter().append("circle");
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

                var radius = 1 * map.getZoom();

                this.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
                this.circle
                    .attr("cx", function(d) {return that._project(d.center)[0]; })
                    .attr("cy", function(d) {return that._project(d.center)[1]; })
                    .attr("r", radius);

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
                this._el = L.DomUtil.create('div', 'treeLayer leaflet-zoom-hide');

                this.svg = d3.select(this._el).append("svg");
                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");

                that.bounds = [[-180, -90], [180, 90]];

                if (centroidsLoaded) {
                    that._drawTree(tree);
                    that._reset();
                } else {
                    console.log("centroids not loaded D:");
                }


            },

            onAdd: function (map) {
                map.getPanes().overlayPane.appendChild(this._el);
                map.on('viewreset', this._reset, this);
                //this._reset();
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

                this.g.selectAll("line")
                   .attr("x1", function(d) {return that._project(d.start)[0]})
                   .attr("y1", function(d) {return that._project(d.start)[1]})
                   .attr("x2", function(d) {return that._project(d.end)[0]})
                   .attr("y2", function(d) {return that._project(d.end)[1]})
                   .style("stroke", 1);


            },

            _project: function(x) {
                var point = map.latLngToLayerPoint([x[1], x[0]]);
                return [point.x, point.y];
            },

            _drawTree: function(node) {
                //centroids {name: centerPoint}
                if (node.children) {
                    for (var i = 0; i < node.children.length; i += 1) {
                        var child = node.children[i];

                        if (centroids[node.location] && centroids[child.location]) {
                            //var lineEnds = [this._project(centroids[node.location]),
                            //                this._project(centroids[child.location])];
                            var lineEnds = {"start": centroids[node.location], "end": centroids[child.location]};
                            if (lineEnds.start !== lineEnds.end) {
                                this.g.append("line").datum(lineEnds); //draw only lines that go somewhere
                            }
                            
                        } else {
                            console.log("didn't find location on map: " + child.location + " or " + node.location);
                        }

                        this._drawTree(child);
                    } 
                }
            }
        });


function when(test, callback) {
    var interval = 10; // ms
    window.setTimeout(function() {
        if (test()) {
            callback();
        } else {
            window.setTimeout(arguments.callee, interval);
        }
    }, interval);
}


        forceLayer = L.Class.extend({
            svg: "",

            g: "",

            bounds: "",

            path: "",

            tree: "",

            force: "",

            node: "",

            foci: "",

            currNodes: "",

            fill: d3.scale.category10(),

            color: "",

            initialize: function (map, tree, color) {
                console.log(tree);
                var that = this;
                this._map = map;
                this.tree = tree;
                this.currNodes = [[tree, tree.location]];
                this.color = color;
                this.foci = [];
                

                // create a DOM element and put it into one of the map panes
                this._el = L.DomUtil.create('div', 'treeLayer leaflet-zoom-hide');

                this.svg = d3.select(this._el).append("svg");
                this.svg.on("mousedown", function() {event.preventDefault(); });
                this.g = this.svg.append("g");

                that.bounds = [[-180, -90], [180, 90]];



                var clbk = function() {

                if (centroidsLoaded) {
                    //that._drawTree(tree);
                    for (c in centroids) {
                        if (centroids.hasOwnProperty(c)) {
                            that.foci.push({name: c, x: that._project(centroids[c])[0], y: that._project(centroids[c])[1]});
                        }
                    }
                    that._reset();
                } else {
                    console.log("centroids not loaded D:");
                }
                console.log("foci length: " + that.foci.length);


                var sizing = that._reset; //set svg's size and return the size
                    //fill = d3.scale.category10(),
                that.nodes = [];

                // var vis = d3.select("body").append("svg:svg")
                //     .attr("width", w)
                //     .attr("height", h);

                that.force = d3.layout.force()
                    .nodes(that.nodes)
                    .links([])
                    .gravity(0)
                    .size(sizing)
                    .charge(-1);

                that.force.on("tick", function(e) {
                  // Push nodes toward their designated focus.
                  var k = .1 * e.alpha;
                  that.nodes.forEach(function(o, i) {
                    o.y += (that.foci[o.id].y - o.y) * k;
                    o.x += (that.foci[o.id].x - o.x) * k;
                  });

                  that.g.selectAll("circle.virusParticle")
                      .attr("cx", function(d) { return d.x; })
                      .attr("cy", function(d) { return d.y; });
                });

                setInterval(function() {
                    var newNodes = [];
                  for (var i = 0; i < that.currNodes.length; i += 1) {
                    var nd = that.currNodes[i];
                    if (nd[0].children) {
                        for (var a = 0; a < nd[0].children.length; a += 1) {
                            newNodes.push([nd[0].children[a], nd[0].location]);
                        }
                    }
                    for (var e = 0; e < that.foci.length; e += 1) {
                        if (that.foci[e].name === nd[0].location) {//find the location to where the particle needs to go
                            var initLoc = that._project(centroids[nd[1]]);
                            that.nodes.push({id: e, x: initLoc[0], y: initLoc[1]}); //id is which focus the node will go to        centroids(that.currNodes[i].parent)
                            break;
                        }
                    }
                    
                  }
                  console.log("number of virus particles added: " + newNodes.length);
                  that.currNodes = newNodes;  

                  that.force.start();

                  that.g.selectAll("circle.virusParticle")
                      .data(that.nodes)
                    .enter().append("svg:circle")
                      .attr("class", "virusParticle")
                      .attr("cx", function(d) { return d.x; })
                      .attr("cy", function(d) { return d.y; })
                      .attr("r", map.getZoom())
                      .style("fill", that.fill(that.color)) //fill(d.id);
                      .style("stroke", 1)//function(d) { return d3.rgb(fill(d.id)).darker(2); })
                      //.style("stroke-width", 1.5)
                      .call(that.force.drag);
                }, 3000);

                }; //end of clbk function

                when(function() {return centroidsLoaded;}, clbk);


            },

            onAdd: function (map) {
                map.getPanes().overlayPane.appendChild(this._el);
                map.on('viewreset', this._reset, this);
            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                map.getPanes().overlayPane.removeChild(this._el);
                map.off('viewreset', this._reset, this);
            },

            _reset: function () {
                var that = this,
                    w,
                    h;

                var bottomLeft = this._project(this.bounds[0]),
                topRight = this._project(this.bounds[1]);

                w = topRight[0] - bottomLeft[0];
                h = bottomLeft[1] - topRight[1];

                this.svg .attr("width", w)
                    .attr("height", h)
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                this.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                
                return [w, h];
            },

            _project: function(x) {
                var point = map.latLngToLayerPoint([x[1], x[0]]);
                return [point.x, point.y];
            },

            _drawTree: function(node) {
                //centroids {name: centerPoint}
                if (node.children) {
                    for (var i = 0; i < node.children.length; i += 1) {
                        var child = node.children[i];

                        if (centroids[node.location] && centroids[child.location]) {
                            //var lineEnds = [this._project(centroids[node.location]),
                            //                this._project(centroids[child.location])];
                            var lineEnds = {"start": centroids[node.location], "end": centroids[child.location]};
                            if (lineEnds.start !== lineEnds.end) {
                                this.g.append("line").datum(lineEnds); //draw only lines that go somewhere
                            }
                            
                        } else {
                            console.log("didn't find location on map: " + child.location + " or " + node.location);
                        }

                        this._drawTree(child);
                    } 
                }
            }
        });





        var 

        panel = {
            panelType: "mapPanel",

            placePanel: function(target) {
                map = new L.Map(target, {
                    center: [34, 104],
                    zoom: 4,
                    maxBounds: [[-90, -180], [90, 180]]
                });
            },

            initializePanelData: function() {
                tileLayer = new L.TileLayer("http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/998/256/{z}/{x}/{y}.png", {
                                 noWrap: true
                             });
                provLayer = new provinceLayer(map)
                centroidLayer = new centroidLayer(map);


                baseLayers = {"Tiles": tileLayer};
                overlayLayers = {"Provinces": provLayer,
                                     "Centroids": centroidLayer};

                map.addLayer(tileLayer)
                   .addLayer(centroidLayer)
                   .addLayer(provLayer);

                layerControl = L.control.layers(null, overlayLayers).addTo(map);
            },

            drawTree: function(tree) {
                /*var trLayer = new treeLayer(map, tree["root"]);
                overlayLayers[tree.name] = trLayer;
                layerControl.addOverlay(trLayer, tree.name);
                map.addLayer(trLayer);*/
            },

            drawForce: function(tree, color) {
                var frLayer = new forceLayer(map, tree["root"], color);
                overlayLayers[tree.name] = frLayer;
                layerControl.addOverlay(frLayer, tree.name);
                map.addLayer(frLayer);
            },

            getMap: function() {
                return map;
            },

            leafSelectionUpdate: function() {
                var selectedRegions = [],
                    i;

                for (i = 0; i < treestuff.selectedLeaves.length; i += 1) {
                    if (!treestuff.contains(selectedRegions, treestuff.selectedLeaves[i].location)) {
                        selectedRegions.push(treestuff.selectedLeaves[i].location);
                    }
                }

                provLayer.feature.classed("highlighted", function(d) {
                    return treestuff.contains(selectedRegions, d.properties.name);
                });
            }
        };

        return panel;
    }

})();



















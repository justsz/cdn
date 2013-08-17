(function() {
	 treestuff.map.regionOutlineLayer = L.Class.extend({
            svg: undefined,

            g: undefined,

            bounds: undefined,

            path: undefined,

            feature: undefined,

            project: undefined,

            initialize: function(args) {
                var that = this;
                that.map = args.map;
                that.project = args.project;
                that.bounds = args.bounds;

                // create a DOM element and put it into one of the map panes
                that.el = L.DomUtil.create('div', 'provinceLayer leaflet-zoom-hide');
                that.svg = d3.select(that.el).append("svg");

                that.svg.on("mousedown", function() {event.preventDefault(); });
                that.g = that.svg.append("g");

                processData(args.mapData);
                that.reset();

                function processData(dat) {
                    //TODO: add that check for latitude as well if needed
                    if (that.bounds[1][0] < that.bounds[0][0]) { //if true, the area has crossed the antimeridian
                        //set the bounds to span the entire map
                        that.bounds[0][0] = -180;
                        that.bounds[1][0] = 180;
                    }
                    that.path = d3.geo.path().projection(that.project);

                    that.feature = that.g.selectAll("path")
                                    .data(dat.features)
                                    .enter().append("path")
                                    .on("click", function(d) {
                                        //find names via crossfilter
                                        treestuff.dateDim.filter(null);
                                        treestuff.selectedLeaves = 
                                        treestuff.locDim.filter(d.properties.name).top(Infinity);
                                        treestuff.callUpdate("leafSelectionUpdate");
                                        //if no taxa are in that location, the clicked province won't highlight 
                                        //from the selection update so highlight manually
                                        d3.select(this).classed("highlighted", true);
                                    });                    
                }
				
				var st = [-130, 36];//args.centroids["Russia"];
				var nd = args.centroids["Russia"];
				
				var steps = 100;
				
				var incrX = (nd[0] - st[0]) / steps;
				var incrY = (nd[1] - st[1]) / steps;
				
				var chord = [];
				
				for (var ii = 0; ii <= steps; ii += 1) {
					chord.push([st[0] + ii * incrX, st[1] + ii * incrY]);
				}
				
				var geoJSONChord = {coordinates: chord, type: "LineString"};
				console.log(geoJSONChord);
				
				var tst = that.g.append("path").datum(geoJSONChord).attr("d", that.path).attr("class", "chord");
				console.log(tst);
				
                that.reset();


            },

            onAdd: function() {
                var that = this;
                that.map.getPanes().overlayPane.appendChild(that.el);
                that.map.on('viewreset', that.reset, that);
            },

            onRemove: function() {
                // remove layer's DOM elements and listeners
                var that = this;
                that.map.getPanes().overlayPane.removeChild(that.el);
                that.map.off('viewreset', that.reset, that);
            },

            reset: function() {
            	var that = this;
                var bottomLeft = that.project(that.bounds[0]),
                topRight = that.project(that.bounds[1]);


                that.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                that.feature.attr("d", that.path);
            },

            leafSelectionUpdate: function(selectedRegions) {
            	this.feature.classed("highlighted", function(d) {
                    return treestuff.contains(selectedRegions, d.properties.name);
                });
            }

        });

})();









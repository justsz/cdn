(function() {
	pandemix.map.treeLayer = L.Class.extend({
            needsCentroids: true,

            svg: "",

            g: "",

            bounds: "",

            path: "",

            tree: "",

            initialize: function() {
                //do nothing
            },

            initDraw: function (args) {
                var that = this;
                that.map = args.map;
                that.project = args.project;
                that.bounds = args.bounds;
                that.centroids = args.centroids;
                that.path = d3.geo.path().projection(that.project);
                that.color = args.color;

                // create a DOM element and put it into one of the map panes
                that.el = L.DomUtil.create('div', 'treeLayer leaflet-zoom-hide');
                d3.select(that.el).style("position", "absolute").style("z-index", args.zIndex);

                that.svg = d3.select(that.el).append("svg");
                that.svg.on("mousedown", function() {d3.event.preventDefault(); });
                that.g = that.svg.append("g");

                that.drawTree(args.treeData);

                that.map.getPanes().overlayPane.appendChild(that.el);
                that.svg.style("display", "none");
            },

            onAdd: function (map) {
                var that = this;
                that.svg.style("display", null);
                map.on('viewreset', that.reset, that);
                that.reset();
            },

            onRemove: function (map) {
                var that = this;
                that.svg.style("display", "none");
                map.off('viewreset', that.reset, that);
            },

            reset: function () {
                var that = this;

                var bottomLeft = that.project(that.bounds[0]),
                topRight = that.project(that.bounds[1]);

                that.svg.attr("width", topRight[0] - bottomLeft[0])
                    .attr("height", bottomLeft[1] - topRight[1])
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                that.g.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                that.g.selectAll("path.chord").attr("d", that.path).style("stroke", that.color);


            },

            drawTree: function(node) {
                var that = this;
                //centroids {name: centerPoint}
                if (node.children) {
                    for (var i = 0; i < node.children.length; i += 1) {
                        var child = node.children[i];

                        if (that.centroids[node.location] && that.centroids[child.location]) {
                            //var lineEnds = [this.project(centroids[node.location]),
                            //                this.project(centroids[child.location])];
                            var lineEnds = [that.centroids[node.location], that.centroids[child.location]];
                            if (lineEnds[0] !== lineEnds[1]) {
                                that.g.append("path")
                                    .attr("class", "chord")
                                    .datum({coordinates: lineEnds, type: "LineString"}); //draw only lines that go somewhere
                            }
                            
                        } else {
                            console.log("didn't find location on map: " + child.location + " or " + node.location);
                        }

                        that.drawTree(child);
                    } 
                }
            }
        });

})();


//var st = [-130, 36];//args.centroids["Russia"];
                        // var nd = args.centroids["Russia"];
                        
                        // var steps = 100;
                        
                        // var incrX = (nd[0] - st[0]) / steps;
                        // var incrY = (nd[1] - st[1]) / steps;
                        
                        // var chord = [st, nd];
                        
                        // for (var ii = 0; ii <= steps; ii += 1) {
                        // //   chord.push([st[0] + ii * incrX, st[1] + ii * incrY]);
                        // }
                        
                        // var geoJSONChord = {coordinates: chord, type: "LineString"};
                        // console.log("chord", geoJSONChord);
                        
                        // var tst = that.g.append("path").datum(geoJSONChord).attr("d", that.path).attr("class", "mapPath");
                        // console.log(tst);
(function() {
	"use strict";

    var axisSelection,
        timeScale,
    	timeAxis,
    	rootHeights = [],
    	leafHeights = [],
    	brush,
    	brushHighlight,
    	panel,
    	div,
    	scrobblerWidth;
    
	pandemix.TimePanel = function() {
	    function brushstart() {
	        //brush.clear();
	        //d3.selectAll(".link").classed("highlighted", false);
	    };

	    function brushmove() {
	        var e = brush.extent();
	        pandemix.selectedPeriod = e;
	        if (pandemix.brushHighlight) {
	            brushHighlight.attr("x", timeScale(e[0]))
	                          .attr("width", timeScale(e[1]) - timeScale(e[0]));
	        } else {
	            brushHighlight = axisSelection.append("rect")
	                                          .attr("class", "timeSelection")
	                                          .attr("x", timeScale(e[0]))
	                                          .attr("y", 0)
	                                          .attr("width", timeScale(e[1]) - timeScale(e[0]))
	                                          .attr("height", 20);
	            pandemix.brushHighlight = brushHighlight;
	        }
	        pandemix.locDim.filter(null);
	        pandemix.selectedLeaves = pandemix.dateDim.filterRange(e).top(Infinity);
	        pandemix.callUpdate("timeSelectionUpdate");
	        pandemix.callUpdate("leafSelectionUpdate");
	    };


	    function brushend() {
	        if (brush.empty()) {
	            if (brushHighlight) {
	                brushHighlight.remove();
	                brushHighlight = null;
	                pandemix.brushHighlight = null;
	            }
	        }
	    };


	    var scrobClicked = false;
	    var scrobblerBackground = undefined;
	    var scrobbler = undefined;

	    function mDown() {
	    	event.preventDefault();
	    	scrobClicked = true;

            if (brushHighlight) {
                brushHighlight.remove();
                brushHighlight = null;
                pandemix.brushHighlight = null;
            }

	    };

	    function mMove() {
	    	if (scrobClicked) {
	    		var pos = d3.mouse(scrobblerBackground[0][0])[0];
	    		//select a 1 pixel wide period on the timescale
	    		var prd = [timeScale.invert(pos), timeScale.invert(pos + 1)];
	    		//pandemix.showPeriod(prd);
	    		pandemix.selectedPeriod = prd;
            	pandemix.callUpdate("timeSelectionUpdate");
	    		//move scrobbler along the time axis by changing its displacement from the left side
	    		scrobbler.style("left", (pos - scrobblerWidth / 2) + "px");


	    		
	    	}
	    };

	    function mUp() {
	    	scrobClicked = false;
	    };

	    panel = {
	    	panelType : "timePanel",
		    /*
		    As data is being added, update the global time axis with new min/max taxon dates.
		    */
		    updateGlobalTimeAxis : function(rootHeight, minLeafHeight) {
		        rootHeights.push(rootHeight);
		        leafHeights.push(minLeafHeight);
		        
		        timeScale.domain([pandemix.nodeHeightToDate(d3.max(rootHeights), 2014), pandemix.nodeHeightToDate(d3.min(leafHeights), 2014)]);

		        axisSelection.call(timeAxis);
		    },

			placePanel : function(targ) {
		        timeScale = d3.time.scale()
		                            .domain([0, 0])
		                            .range([0, 700]);
		        timeAxis = d3.svg.axis()
		                            .scale(timeScale)
		                            .orient("bottom");
		                            
		        brush = d3.svg
		                  .brush()
		                  .x(timeScale)
		                  .on("brushstart", brushstart)
		                  .on("brush", brushmove)
		                  .on("brushend", brushend);
		          
		        pandemix.globalTimeBrush = brush;
		        
		        div = d3.select(targ)
		        		.attr("class", "timePanel");

		        scrobblerBackground = div.append("div")
		        			   .attr("class", "scrobblerBackground")
		        			   .on("mousemove", mMove)
		        			   .on("mouseup", mUp);

				scrobbler = scrobblerBackground.append("div")
									           .attr("class", "timeScrobbler")
									           .on("mousedown", mDown);

				scrobblerWidth = scrobbler[0][0].offsetWidth || 0;

		        axisSelection = div.append("svg")
		                          .attr("width", 750)
		                          .attr("height", 20)
		                          .call(brush)
		                          .append("g")
		                          .attr("class", "axis")
		                          .style("cursor", "crosshair")
		                          //.attr("transform", "translate(0," + (height) + ")")
		                          .call(timeAxis);
		    }
		}

		return panel;

	}

})();
(function() {
	"use strict";

    var axisSelection,
        timeScale,
    	timeAxis,
    	startDates = [],
    	endDates = [],
    	brush,
    	brushHighlight,
    	panel,
    	div,
    	sliderWidth,
    	timeLineWidth,
    	timeLineHeight,
    	panelID = 0 + pandemix.counter,
    	aimLine;

    pandemix.counter += 1;
    
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
	                                          .attr("height", timeLineHeight);
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


	    var sliderClicked = false;
	    var sliderBackground = undefined;
	    var slider = undefined;

	    function mDown() {
	    	event.preventDefault();
	    	sliderClicked = true;
            if (brushHighlight) {
                brushHighlight.remove();
                brushHighlight = null;
                pandemix.brushHighlight = null;

                pandemix.selectedPeriod = [];
                pandemix.selectedLeaves = [];
                pandemix.callUpdate("timeSelectionUpdate");
	        	pandemix.callUpdate("leafSelectionUpdate");

            }
            var postn = d3.mouse(sliderBackground.node())[0];
            if (postn > timeLineWidth) { //subtracting one pixel to have some display at the very edge
    			postn = timeLineWidth;
    		} else if (postn < 0) {
    			postn = 0;
    		}


       		slider.style("left", (postn - sliderWidth / 2) + "px");
	       	pandemix.selectedDate = timeScale.invert(postn);
	        pandemix.callUpdate("timeSlideUpdate");
	    };
		
	    function mMove() {
	    	event.preventDefault();
	    	if (sliderClicked) {
	    		var postn = d3.mouse(sliderBackground.node())[0];
	    		if (postn > timeLineWidth) {
	    			postn = timeLineWidth;
	    		} else if (postn < 0) {
	    			postn = 0;
	    		}

       			slider.style("left", (postn - sliderWidth / 2) + "px");
	       		pandemix.selectedDate = timeScale.invert(postn);
	            pandemix.callUpdate("timeSlideUpdate");
	            d3.select("body").selectAll("span.date-calendar").text(pandemix.selectedDate.toDateString().substring(4));
	    	}
	    };

	    function mUp() {
	    	if (sliderClicked) {
	    		sliderClicked = false;
	    	}
	    };

	    panel = {
	    	panelType : "timePanel",
		    /*
		    As data is being added, update the global time axis with new min/max taxon dates.
		    */
		    updateGlobalTimeAxis : function(startDate, endDate) {
		        startDates.push(startDate);
		        endDates.push(endDate);

		        pandemix.minDate = d3.min(startDates);
		        pandemix.maxDate = d3.max(endDates);
		        
		        timeScale.domain([d3.min(startDates), d3.max(endDates)]);

		        axisSelection.call(timeAxis);
		    },

			placePanel : function(targ) {
				//grab panel's div
				div = d3.select(targ)
		        		.classed("timePanel", true);

		        //add time slider 
	    		sliderBackground = div.append("div")
				        			     .attr("class", "sliderBackground")
				        			     .on("mousedown", mDown);

		        d3.select(document).on("mousemove.time", mMove)
		              			   .on("mouseup.time", mUp);

				slider = sliderBackground.append("div")
								     	 .attr("class", "timeSlider");

				sliderWidth = parseInt(slider.style("width").replace( /\D+/, ''), 10);

				slider.style("left", (-sliderWidth / 2) + "px");

				//add the timeline itself
		        axisSelection = div.append("svg")
		        				  .attr("class", "timeLine");

                timeLineWidth = parseInt(axisSelection.style("width").replace( /\D+/, ''), 10);
                timeLineHeight = parseInt(axisSelection.style("height").replace( /\D+/, ''), 10);


		        aimLine = axisSelection.append("line")
									   .attr("class", "aimLine")
									   .attr("x1", "0")
									   .attr("x2", "0")
									   .attr("y1", "0")
									   .attr("y2", timeLineHeight);

		        		        timeScale = d3.time.scale()
		                            .domain([0, 1])
		                            .range([0, timeLineWidth]);
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

		        axisSelection.call(brush)
	                          .call(timeAxis);

                //register panel for updates
                pandemix.panels.push(panel);
		    },

		    timeSlideUpdate: function() {
		    	d3.select("body").selectAll("span.date-calendar").text(pandemix.selectedDate.toDateString().substring(4));
		    	aimLine.attr("x1", timeScale(pandemix.selectedDate)).attr("x2", timeScale(pandemix.selectedDate));
		    	if (!sliderClicked) {
		    		slider.style("left", (timeScale(pandemix.selectedDate) - sliderWidth / 2) + "px");
		    	}
		    }
		}

		return panel;

	}

})();
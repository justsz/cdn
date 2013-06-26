(function() {

    treestuff.CirclePanel = function() {
        var width = 400;
        var height = 30;
        var circScale = d3.scale.linear()
                          .domain([0, 300])
                          .range([15, width - 15]);

        return {
            selectionUpdate : function() {
                var nodes = treestuff.focusedLeaves;
                var circles = d3.selectAll("svg.circlePanel")
                                .selectAll("circle")
                                .data(nodes, treestuff.getNodeKey);

                circles.enter()
                       .append("circle")
                       .attr("class", "pointlessCircle")
                       .attr("r", 12)
                       .attr("cx", function(d) {return circScale(parseInt(d.name, 10)) || 0; })
                       .attr("cy", 15);

                circles.exit().remove();
            },
                
            placePanel : function() {
            var div = d3.select("body").append("div")
                        .attr("class", "circBox");

            div.append("svg")
               .attr("class", "circlePanel")
               .attr("width", width)
               .attr("height", height);
            }
        }

    };

})();
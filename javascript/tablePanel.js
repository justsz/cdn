(function() {

    treestuff.TablePanel = function() {
        var width = 100,
            height = 300,
            div,
            svg
            rowCount = 0;

        return {
            selectionUpdate : function() {
                var nodes = treestuff.focusedLeaves;
                var rows = svg.selectAll(".tableRow")
                              .data(nodes, treestuff.getNodeKey);

                rows.exit().remove();
                
                rows.enter()
                    .append("g")
                    .attr("class", "tableRow")
                    .append("text") 
                    .text(function(d) {return d.name; });
                    
                    rows.attr("transform", function(d, i) {
                        return "translate(0," + (10 * (i + 1)) + ")"; 
                    });
                    
                var rowCount = rows.size();
                if (rowCount < height / 10) {
                    rowCount = height / 10; 
                }
                svg.attr("height", rowCount * 10);
            },
                
            placePanel : function() {
            div = d3.select("body").append("div")
                    .attr("class", "tableBox")
                    .style("width", width + "px")
                    .style("height", height + "px")
                    .style("overflow", "scroll");

            svg = div.append("svg")
                     .attr("class", "tablePanel")
                     .attr("width", width)
                     .attr("height", height);
            }
        }

    };

})();
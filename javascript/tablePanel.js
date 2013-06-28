(function() {

    treestuff.TablePanel = function() {
        var width = 100,
            height = 300,
            div,
            svg,
            rowCount = 0,
            panelID = 0 + treestuff.counter;
            
            treestuff.counter += 1;

        return {
            panelType : "tablePanel",
            
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

                rows.call(function() {
                    var i = 0;
                    this.attr("transform", function() {
                        i += 1;
                        return "translate(0," + (10 * (i)) + ")"; 
                    });
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
                    .style("float", "right")
                    .style("border", "1px solid")
                    .style("overflow", "scroll");

            svg = div.append("svg")
                     .attr("class", "tablePanel")
                     .attr("width", width)
                     .attr("height", height);
            }
        }

    };

})();
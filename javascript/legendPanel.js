(function() {

    pandemix.LegendPanel = function() {
        var width,
            height, 
            div,
            svg,
            rowCount = 0,
            panelID = 0 + pandemix.counter,
            traits = {"No trait" : []},
            legendSize,
            rowPadding = 1,
            legendTextGap = 2,
            maxRowWidth = width,
            tableHeight = height;
            
            pandemix.counter += 1;


        function drawPanel(displayTrait) {
            if (!displayTrait || !(displayTrait in traits)) {
                return;
            }

            var rowData = function() {
                            var names = traits[displayTrait];
                                var out = [];
                                for (var i = 0; i < names.length; i += 1) {
                                    out.push({name : names[i],
                                              color : "hsl(" + (i * Math.floor(360 / names.length)) + ",75%,50%)",
                                              selected : true});
                                    }
                                    return out;
                            }();

            var traitRows = svg.selectAll(".traitRow")
                               .data(rowData, function(d) {return d.name; });

            var rowEnter = traitRows.enter()
                                    .append("g")
                                    .attr("class", "traitRow")
                                    .on("click", function(d) {
                                        d.selected = !d.selected;
                                        svg.selectAll(".traitRow").select("rect").style("fill", function(d) {
                                                                if (d.selected) {
                                                                    return d.color;
                                                                }
                                                                return "gray"; });

                                        pandemix.traitType = displayTrait;
                                        pandemix.traitValues = [];
                                        svg.selectAll(".traitRow")
                                           .each(function(d) {
                                               if (d.selected) {
                                                   pandemix.traitValues.push(d);
                                               } else {
                                                console.log(d); 
                                               }
                                           });
                                       pandemix.callUpdate("traitSelectionUpdate");
                                    });

            rowEnter.append("rect")
                    .attr("class", "traitRowBackground")
                    .attr("y", -legendSize)
                    .attr("height", legendSize)
                    .attr("width", "100%")
                    .style("fill-opacity", 0);
                    

            rowEnter.append("rect")
                    .attr("y", -legendSize)
                    .attr("height", legendSize)
                    .attr("width", legendSize)
                    .style("fill", function(d) {return d.color; });

            rowEnter.append("text")
                    .attr("x", (legendSize + legendTextGap))
                    .text(function(d) {return d.name; });

            traitRows.attr("transform", function(d, i) {return "translate(0," + ((i+1) * (legendSize + rowPadding)) + ")"; });

            traitRows.exit().remove();

            tableHeight = traitRows.size() * (legendSize + rowPadding);

            svg.attr("width", width)
               .attr("height", tableHeight);

            // if (maxRowWidth > width) {
            //     div.style("overflow-x", "scroll");
            // } else {
            //     div.style("overflow-x", null);
            // }
            if (tableHeight > height) {
                div.style("overflow-y", "scroll");
            } else {
                div.style("overflow-y", null);
            }



            traitRows.select("rect").style("fill", function(d) {
                                        if (d.selected) {
                                            return d.color;
                                        }
                                        return "gray";
                                    });
        };


        var panel = {
            panelType : "legendPanel",


            placePanel : function(targ) {
            div = d3.select(targ)
                    .classed("legendPanel", true);

            width = parseInt(div.style("width").replace( /\D+/, ''), 10);
            height = parseInt(div.style("height").replace( /\D+/, ''), 10);
            legendSize = parseInt(div.style("font-size").replace( /\D+/, ''), 10);

            svg = div.append("svg")
                     .attr("class", "legendSvg")
                     .attr("width", width)
                     .attr("height", height);
            },


            addTraits : function(newTraits) {
                var dirty = false,
                    i;
                for (trait in newTraits) {
                    if (newTraits.hasOwnProperty(trait)) {
                        if (traits.hasOwnProperty(trait)) {
                            for (i = 0; i < newTraits[trait].length; i += 1) {
                                if (!pandemix.contains(traits[trait], newTraits[trait][i])) {
                                    traits[trait].push(newTraits[trait][i]);
                                    dirty = true;
                                }
                            }
                        } else {
                            traits[trait] = newTraits[trait].slice(0);
                            dirty = true;
                        }
                    }
                }
                if (dirty) {
                   drawPanel("location");
                }
            },

            getTraits : function() {
                return traits;
            }
        };

        return panel;
    }

})();


































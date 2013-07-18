(function() {

    treestuff.TraitPanel = function() {
        var width = 300, //div initial sizing. Later used to specify SVG size
            height = 80, 
            div,
            svg,
            rowCount = 0,
            panelID = 0 + treestuff.counter,
            traits = {"No trait" : []},
            legendSize = 10,
            rowPadding = 1,
            legendTextGap = 2,
            maxTraitNameSize = 30,
            maxRowWidth = width,
            tableHeight = height;
            
            treestuff.counter += 1;

        function drawPanel() {
            var traitTypes = [];
            for (var t in traits) {
                if (traits.hasOwnProperty(t)) {
                    traitTypes.push(t);
                }
            }


            var traitRows = svg.selectAll(".traitRow")
                               .data(traitTypes, function(d) {return d; });

            var rowEnter = traitRows.enter()
                                    .append("g")
                                    .attr("class", "traitRow")
                                    .on("click", function(d) {
                                        d3.selectAll(".traitRow").select(".traitRowBackground")
                                          .style("fill-opacity", 0);
                                        d3.select(this).select(".traitRowBackground")
                                          .style("fill-opacity", 0.125);

                                        treestuff.traitType = d;
                                        treestuff.traitValues = [];
                                        d3.select(this)
                                          .selectAll(".traitValue")
                                          .each(function(d) {
                                              if (d.selected) {
                                                  treestuff.traitValues.push(d);
                                              }
                                          });
                                       treestuff.callUpdate("traitSelectionUpdate");
                                    });

            rowEnter.append("rect")
                    .attr("class", "traitRowBackground")
                    .attr("y", -legendSize)
                    .attr("height", legendSize)
                    .attr("width", "100%")
                    .style("fill", "blue")
                    .style("fill-opacity", 0);

            rowEnter.append("text")
                    .attr("dy", -1)
                    .text(function(d) {return d; });

            maxTraitNameSize = d3.max(traitRows.select("text")[0], function(d) {return d.getComputedTextLength(); });

            traitRows.attr("transform", function(d, i) {return "translate(0," + ((i + 1) * (legendSize + rowPadding)) + ")"; });

            traitRows.exit().remove();


            var traitValues = traitRows.selectAll(".traitValue")
                                       .data(function(d) {
                                            var names = traits[d];
                                            var out = [];
                                            for (var i = 0; i < names.length; i += 1) {
                                                out.push({name : names[i],
                                                          color : "hsl(" + (i * Math.floor(360 / names.length)) + ",100%,50%)",
                                                          selected : true});
                                            }
                                            return out;
                                        },
                                        function(d) {return d.name; });

            var traitEnter = traitValues.enter()
                                        .append("g")
                                        .attr("class", "traitValue")
                                        .on("click", function(d) {
                                            //console.log(d);
                                            d.selected = !d.selected;
                                            //need to update colors here because calling drawPanel would rebind the data.
                                            svg.selectAll(".traitValue").select("rect").style("fill", function(d) {
                                                if (d.selected) {
                                                    return d.color;
                                                }
                                                return "gray";
                                            });
                                        });

            traitEnter.append("rect")
                      .attr("y", "-10")
                      .attr("height", legendSize)
                      .attr("width", legendSize);

            traitEnter.append("text")
                      .attr("x", (legendSize + legendTextGap))
                      .attr("dy", -1) //move text up 1 pixel
                      .text(function(d) {return d.name; });


            //every cell is a g element. Compute how to space-out
            //the cells and how much space is needed to display them
            traitRows.each(function(d) {
                var rowWidth = maxTraitNameSize;
                d3.select(this).selectAll(".traitValue").attr("transform", function() {
                    var cellSize = d3.select(this).select("text")[0][0].getComputedTextLength() + legendSize + 2 * legendTextGap;
                    rowWidth += cellSize;
                    return "translate(" + (rowWidth - cellSize) + ",0)"; 
                });
                if (rowWidth > maxRowWidth) {
                    maxRowWidth = rowWidth;
                }
            });
                       

            traitValues.select("rect").style("fill", function(d) {
                                                    if (d.selected) {
                                                        return d.color;
                                                    }
                                                    return "gray";
                                                });


            traitValues.exit().remove();

            tableHeight = traitRows.size() * (legendSize + rowPadding);

            svg.attr("width", maxRowWidth)
               .attr("height", tableHeight);

            if (maxRowWidth > width) {
                div.style("overflow-x", "scroll");
            } else {
                div.style("overflow-x", null);
            }
            if (tableHeight > height) {
                div.style("overflow-y", "scroll");
            } else {
                div.style("overflow-y", null);
            }


        };


        var panel = {
            panelType : "traitPanel",


            placePanel : function() {
            div = d3.select("body").append("div")
                    .attr("class", "traitBox")
                    .style("width", width + "px")
                    .style("height", height + "px")
                    .style("display", "inline-block")
                    .style("border", "1px solid");

            svg = div.append("svg")
                     .attr("class", "traitPanel")
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
                                if (!treestuff.contains(traits[trait], newTraits[trait][i])) {
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
                   drawPanel();
                }
            }
        };

        return panel;
    }

})();


































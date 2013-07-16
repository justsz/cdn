(function() {

    treestuff.TraitPanel = function() {
        var width = 640,
            height = 100,
            div,
            svg,
            rowCount = 0,
            panelID = 0 + treestuff.counter,
            traits = {"No trait" : []};
            
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
                    .attr("y", -10)
                    .attr("height", 10)
                    .attr("width", width)
                    .style("fill", "blue")
                    .style("fill-opacity", 0);

            rowEnter.append("text")
                    .text(function(d) {return d; });

            traitRows.attr("transform", function(d, i) {return "translate(0," + ((i + 1) * 11) + ")"; });

            traitRows.exit().remove();


            var traitValues = traitRows.selectAll(".traitValue")
                                       .data(function(d) {
                                            var names = traits[d];
                                            var out = [];
                                            for (var i = 0; i < names.length; i += 1) {
                                                out.push({name : names[i],
                                                          color : "hsl(" + (i * Math.floor(360 / traits[d].length)) + ",100%,50%)",
                                                          selected : true});
                                            }
                                            return out;
                                        },
                                        function(d) {return d.name; });

            var traitEnter = traitValues.enter()
                                        .append("g")
                                        .attr("class", "traitValue")
                                        .on("click", function(d) {
                                            d.selected = !d.selected;
                                            svg.selectAll(".traitValue").select("rect").style("fill", function(d) {
                                                if (d.selected) {
                                                    return d.color;
                                                }
                                                return "gray";
                                            });
                                        });

            traitEnter.append("rect")
                      .attr("y", "-10")
                      .attr("height", 10)
                      .attr("width", 10);

            traitEnter.append("text")
                      .attr("x", 12)
                      .text(function(d) {return d.name; });

            traitValues.attr("transform", function(d, i) {return "translate(" + (30 * i + 30) + ",0)"; });
                       

            traitValues.select("rect").style("fill", function(d) {
                                                    if (d.selected) {
                                                        return d.color;
                                                    }
                                                    return "gray";
                                                });


            traitValues.exit().remove();
        };


        var traitPanel = {
            panelType : "traitPanel",


            placePanel : function() {
            div = d3.select("body").append("div")
                    .attr("class", "traitBox")
                    .style("width", width + "px")
                    .style("height", height + "px")
                    .style("display", "inline-block")
                    .style("border", "1px solid");
                    //.style("overflow", "scroll");

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

        return traitPanel;
    }

})();


































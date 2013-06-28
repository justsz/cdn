#!/usr/bin/python

import json

inputFiles = ["../data/H9N2 Trees/H9N2.MP.json",
              "../data/H9N2 Trees/H9N2.NP.json",
              "../data/H9N2 Trees/H9N2.NS.json",
              "../data/H9N2 Trees/H9N2.PA.json",
              "../data/H9N2 Trees/H9N2.PB1.json",
              "../data/H9N2 Trees/H9N2.PB2.json"];

taxa = {}

for filename in inputFiles:
    json_data = open(filename)
    tree = json.load(json_data)
    print(tree['name'])
    json_data.close()

#go through all trees, traverse them to find child nodes
#make a dict of unique taxa and height array
#calculate average height for each taxon
#update all read files (traverse again or save references?)
#dump files





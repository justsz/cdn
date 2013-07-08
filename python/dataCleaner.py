#!/usr/bin/python

import json
import numpy

def climbNode(node):
    if ('children' in node):
        for child in node['children']:
            climbNode(child)
    else:
        if not node['name'] in taxa:
            taxa[node['name']] = [node['height']]
        else:
            taxa[node['name']].append(node['height'])


def changeHeights(node):
    if ('children' in node):
        for child in node['children']:
            changeHeights(child)
    else:
        node['height'] = numpy.mean(taxa[node['name']])
            
inputFiles = ["../data/H9N2 Trees/H9N2.MP.json",
              "../data/H9N2 Trees/H9N2.NP.json",
              "../data/H9N2 Trees/H9N2.NS.json",
              "../data/H9N2 Trees/H9N2.PA.json",
              "../data/H9N2 Trees/H9N2.PB1.json",
              "../data/H9N2 Trees/H9N2.PB2.json"]

taxa = {}

for filename in inputFiles:
    print("processing " + filename)
    json_data = open(filename)
    tree = json.load(json_data)
    climbNode(tree['root'])
    changeHeights(tree['root'])
    json_data.close()

for filename in inputFiles:
    print("editing " + filename)
    json_data = open(filename)
    tree = json.load(json_data)
    changeHeights(tree['root'])
    json_data.close()
    jsonWrite = open(filename, "w+")
    jsonWrite.write(json.dumps(tree, separators = (',\n', ': ')))
    jsonWrite.close()

#go through all trees, traverse them to find child nodes
#make a dict of unique taxa and height array
#calculate average height for each taxon
#update all read files (traverse again or save references?)
#dump files






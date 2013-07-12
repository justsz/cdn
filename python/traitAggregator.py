#!/usr/bin/python

import json
import numpy

def getTraits(node, traitType):
    for trait in node[traitType + '.set']:
        if not trait in traitListings[traitType]:
            traitListings[traitType].append(trait)

def climbNode(node, traitType):
    if ('children' in node):
        for child in node['children']:
            climbNode(child, traitType)
    else:
        getTraits(node, traitType)

            
inputFiles = ["../data/H9N2 Trees/H9N2.MP.json",
              "../data/H9N2 Trees/H9N2.NP.json",
              "../data/H9N2 Trees/H9N2.NS.json",
              "../data/H9N2 Trees/H9N2.PA.json",
              "../data/H9N2 Trees/H9N2.PB1.json",
              "../data/H9N2 Trees/H9N2.PB2.json"]

traitsToAggregate = ['Nx', 'Hx']

traitListings = {}

for tr in traitsToAggregate:
    traitListings[tr] = []

for filename in inputFiles:
    print("processing " + filename)
    json_data = open(filename)
    tree = json.load(json_data)
    for trait in traitsToAggregate:
        climbNode(tree['root'], trait)
    json_data.close()



for filename in inputFiles:
    print("editing " + filename)
    json_data = open(filename)
    tree = json.load(json_data)
    for trait in traitsToAggregate:
        print(traitListings[trait])
        tree[trait + '.fullSet'] = traitListings[trait]
    json_data.close()
    jsonWrite = open(filename, "w+")
    jsonWrite.write(json.dumps(tree, separators = (',\n', ': ')))
    jsonWrite.close()
#!/usr/bin/python

import json
import numpy

def getTraits(node, traitType, traitSet):
    for trait in node[traitType + '.set']:
        if not trait in traitSet:
            traitSet.append(trait)

def climbNode(node, traitType, traitSet):
    if ('children' in node):
        for child in node['children']:
            climbNode(child, traitType, traitSet)
    else:
        getTraits(node, traitType, traitSet)

            
inputFiles = ["../data/H9N2 Trees/H9N2.MP.json",
              "../data/H9N2 Trees/H9N2.NP.json",
              "../data/H9N2 Trees/H9N2.NS.json",
              "../data/H9N2 Trees/H9N2.PA.json",
              "../data/H9N2 Trees/H9N2.PB1.json",
              "../data/H9N2 Trees/H9N2.PB2.json"]

traitsToAggregate = ['Nx', 'Hx', 'location']


for filename in inputFiles:
    print("processing " + filename)
    json_data = open(filename)
    tree = json.load(json_data) #open file
    for trait in traitsToAggregate:
        traitSet = []
        climbNode(tree['root'], trait, traitSet) #assamble set of all values of this trait
        print(traitSet)
        tree[trait + '.fullSet'] = traitSet #append full set to tree
    json_data.close()
    jsonWrite = open(filename, "w+")
    jsonWrite.write(json.dumps(tree, separators = (',\n', ': '))) #write modified tree back to original file
    jsonWrite.close()



# for filename in inputFiles:
#     print("editing " + filename)
#     json_data = open(filename)
#     tree = json.load(json_data)
#     for trait in traitsToAggregate:
#         print(traitListings[trait])
#         tree[trait + '.fullSet'] = traitListings[trait]
#     json_data.close()
#     jsonWrite = open(filename, "w+")
#     jsonWrite.write(json.dumps(tree, separators = (',\n', ': ')))
#     jsonWrite.close()
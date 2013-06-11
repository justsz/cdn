#!/usr/bin/python

import json
import random


print("input node count")
nodeCount = raw_input() / 2
nodeCount = int(nodeCount)

print("output filename")
fileName = raw_input()



k = "children"
l = "length"
n = "name"


tree = {}

def getChildren (node):
             if k in node:
                 return node[k]
             else:
                 return None


for x in range(0, nodeCount):
    print(x)
    cont = True
    node = tree
    children = getChildren(node)
    while (cont):
        if (children != None): #full branch, climb down
            choice = random.randint(0,1)
            node = children[choice]
            children = getChildren(node)
        else: #branch has space, add child
	        node[k] = []
	        children = getChildren(node)
	        children.append({n : str(x), l: random.random()})
        	children.append({n : str(x+nodeCount), l: random.random()})
    	    #print("appending")
	        cont = False
    


json.dump(tree, open("../data/" + fileName + ".json", "w+"))
    






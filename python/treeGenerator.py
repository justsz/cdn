#!/usr/bin/python

import json
import random


print("input node count")
nodeCount = raw_input()
nodeCount = int(nodeCount)

print("output filename")
fileName = raw_input()



k = "children"
l = "length"
n = "name"


tree = {k : []}

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
        if (len(children) == 2): #full branch, climb down
            choice = random.randint(0,1)
            node = children[choice]
            children = getChildren(node)
            if (children == None): #create the children's array
                node[k] = []
                children = getChildren(node)
            #print("traversing")
        else: #branch has space, add child
            children.append({n : str(x), l : random.random()})
            #print("appending")
            cont = False
    


json.dump(tree, open("../data/" + fileName + ".json", "w+"))
    






#!/usr/bin/python

import json
import random



nodeCount = 200

k = "children"
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
        if (len(children) == 2):
            choice = random.randint(0,1)
            node = children[choice]
            children = getChildren(node)
            if (children == None):
                node[k] = []
                children = getChildren(node)
            #print("traversing")
        else:
            children.append({n : str(x)})
            #print("appending")
            cont = False
    


json.dump(tree, open("../data/randomTree.json", "w+"))
    






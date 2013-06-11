#!/usr/bin/python

import json
import random


print("input node count")
nodeCount = raw_input()
nodeCount = int(nodeCount) / 2

print("output filename")
fileName = raw_input()



k = "children"
l = "length"
n = "name"

wordList = []
file = open("nouns.txt")

for line in file:
	wordList.append(line.rstrip()) #strip newline characters

tree = {}

def getChildren (node):
             if k in node:
                 return node[k]
             else:
                 return None
                 
def sampleWord (wordList):
	return wordList[random.randint(0, len(wordList)-1)]


for x in range(0, nodeCount):
    #print(x)
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
        	children.append({n : str(x+nodeCount*2), l: random.random()})
    	    #print("appending")
	        cont = False
    


json.dump(tree, open("../data/" + fileName + ".json", "w+"))
    






#!/usr/bin/python

import json


countryFile = "../data/reducedGeography.json"
outputFile = "../data/reducedGeography.json"

print("Opening file..")
dataFile = open(countryFile)
dataJSON = json.load(dataFile)["features"]

print("Processing file..")
for f in dataJSON:
    geomList = f["geometry"]["coordinates"]
    multiPoly = f["geometry"]["type"] == "MultiPolygon"
    for geom in geomList:
        if (multiPoly):
            geom = geom[0]
        cutPoints = []
        for i in range(0, len(geom)):
             if (geom[i][0] > 180):
                print("editing " + str(geom[i]))
                geom[i][0] = 180
             elif (geom[i][0] < -180):
                print("editing " + str(geom[i]))
                geom[i][0] = -180



dataFile.close()

outputJSON = {}
outputJSON["type"] = "FeatureCollection"
outputJSON["features"] = dataJSON

print("Writing output to file..")
jsonWrite = open(outputFile, "w+")
jsonWrite.write(json.dumps(outputJSON, separators = (',', ':')))
jsonWrite.close()

print("Done.")
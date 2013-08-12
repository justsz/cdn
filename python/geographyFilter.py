#!/usr/bin/python

import json
            
countryFile = "../data/country_outlines.json"
regionFile = "../data/state_province_outlines.json"
outputFile = "../data/reducedGeography.json"

nameSet = ["Hebei", "Shandong", "Hong Kong", "Hunan", "Henan", "Anhui", "Jiangsu", "Shaanxi", "Shanghai", "Xinjiang", "Jiangxi", "Zhejiang", "Hubei", "Vietnam", "Tibet", "Beijing", "Guangdong", "Japan", "Guangxi", "Heilongjiang", "Russia", "Fujian"]
countryCodeList = []



#initialize output file
outputJSON = {}
outputJSON["type"] = "FeatureCollection"
outputJSON["features"] = []


#go through regions and match names, add "sr_sov_a3" to country code list. remove name from nameSet
#remove duplicate entries from code list. add to output all regions matching the codes in the code list
#
#whatever remains should be a country hopefully
#go through countries file and match names. If the code is already in the code list, just remove the entry from nameSet [what to do?]
#otherwise add the country outline to output
#
#print out the remainder that hasn't been matched to a country or region
#
#write filtered feature file to JSON
#
#


print("Opening regions..")
dataFile = open(regionFile)
dataJSON = json.load(dataFile)["features"]

print("Matching regions..")
for f in dataJSON:
    match = ""
    for name in nameSet:
        if (f["properties"]["name"] == name):
            match = name
            countryCodeList.append(f["properties"]["sr_sov_a3"])
    if (match != ""):
        nameSet.remove(match)
        if(len(nameSet) == 0):
            break     
countryCodeList = list(set(countryCodeList))

print("Adding regions to output..")
for f in dataJSON:
    for code in countryCodeList:
        if (f["properties"]["sr_sov_a3"] == code):
            outputJSON["features"].append(f)

dataFile.close()


if (len(nameSet) != 0):
    print("Opening countries..")
    dataFile = open(countryFile)
    dataJSON = json.load(dataFile)["features"]

    print("Matching countries..")
    for f in dataJSON:
        match = ""
        for name in nameSet:
            if (f["properties"]["sovereignt"] == name):
                match = name
                if (not (f["properties"]["sov_a3"] in countryCodeList)):
                    outputJSON["features"].append(f);
        if (match != ""):
            nameSet.remove(match)
            if(len(nameSet) == 0):
                break     

    dataFile.close()

if (len(nameSet) != 0):
    print("Unmatched features: " + str(nameSet))


print("Writing output to file..")
jsonWrite = open(outputFile, "w+")
jsonWrite.write(json.dumps(outputJSON, separators = (',', ':')))
jsonWrite.close()

print("Done.")
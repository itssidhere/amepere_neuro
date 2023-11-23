import sys
import os

SEGMENTED_FILE = sys.argv[1]
OUTPUT_FOLDER = SEGMENTED_FILE.split(".")[0].replace("_temp", "")

if not os.path.exists(OUTPUT_FOLDER):
   os.makedirs(OUTPUT_FOLDER)

segmentationNode = slicer.util.loadSegmentation(SEGMENTED_FILE)

slicer.modules.segmentations.logic().ExportSegmentsClosedSurfaceRepresentationToFiles(OUTPUT_FOLDER, segmentationNode, None, "STL")

for filename in os.listdir(OUTPUT_FOLDER):
    if filename.endswith(".stl"):
        new_filename = filename.split("_")[-1]
        os.rename(os.path.join(OUTPUT_FOLDER, filename),
                  os.path.join(OUTPUT_FOLDER, new_filename))

filledSegmentationNode = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLSegmentationNode")
votingBinaryHoleFilling = slicer.modules.votingbinaryholefillingimagefilter
parameters = {}
parameters["inputVolume"] = segmentationNode
parameters["outputVolume"] = filledSegmentationNode
parameters["radius"] = 1
parameters["MajorityThreshold"] = 1

slicer.cli.runSync(votingBinaryHoleFilling, None, parameters)

smoothedSegmentationNode = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLSegmentationNode")
labelMapSmoothing = slicer.modules.labelmapsmoothing
parameters = {}
parameters["inputVolume"] = filledSegmentationNode
parameters["outputVolume"] = smoothedSegmentationNode
parameters["labelToSmooth"] = -1
parameters["numberOfIterations"] = 50
parameters["maxRMSError"] = 0.01
parameters["gaussianSigma"] = 10

slicer.cli.runSync(labelMapSmoothing, None, parameters)

slicer.modules.segmentations.logic().ExportSegmentsClosedSurfaceRepresentationToFiles(OUTPUT_FOLDER, smoothedSegmentationNode, None, "STL")

for filename in os.listdir(OUTPUT_FOLDER):
    if filename.startswith("Segmentation"):
        new_filename = "0.stl"
        os.rename(os.path.join(OUTPUT_FOLDER, filename),
                  os.path.join(OUTPUT_FOLDER, new_filename))

os.remove(SEGMENTED_FILE)
slicer.app.quit()
import sys
import os

SEGMENTED_FILE = sys.argv[1]
OUTPUT_FOLDER = SEGMENTED_FILE.split(".")[0]

if not os.path.exists(OUTPUT_FOLDER):
   os.makedirs(OUTPUT_FOLDER)

segmentationNode = slicer.util.loadSegmentation(SEGMENTED_FILE)

slicer.modules.segmentations.logic().ExportSegmentsClosedSurfaceRepresentationToFiles(OUTPUT_FOLDER, segmentationNode, None, "STL")

slicer.app.quit()
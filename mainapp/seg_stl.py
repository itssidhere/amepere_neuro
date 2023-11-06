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
        os.rename(os.path.join(OUTPUT_FOLDER, filename), os.path.join(OUTPUT_FOLDER, new_filename))

os.remove(SEGMENTED_FILE)
slicer.app.quit()
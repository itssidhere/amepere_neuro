import os
import mri_seg

MRI_FILE = "/Volumes/T7/INSA-LYON/amepere_neuro/PATIENT_01.nii.gz"
Slicer_PATH = "/Volumes/T7/INSA-LYON/Slicer.app/Contents/MacOS/Slicer"

OUTPUT_FOLDER = os.path.dirname(MRI_FILE)
OUTPUT_FILE = MRI_FILE.replace(".nii.gz", "_synthseg.nii.gz")

mri_seg.SegmentMRI(MRI_FILE, OUTPUT_FOLDER)

Seg_Stl_PATH = os.path.join(os.path.dirname(os.path.realpath(__file__)), "seg_stl.py")

# Run Slicer
os.system(Slicer_PATH + " --no-splash --no-main-window --python-script " + Seg_Stl_PATH + " " + OUTPUT_FILE)
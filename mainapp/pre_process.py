import os
import mri_seg

MRI_FILE = "../media/mri_files/PATIENT_05.nii.gz"

OUTPUT_FOLDER = os.path.dirname(MRI_FILE)
OUTPUT_FILE = MRI_FILE.replace(".nii.gz", "_synthseg.nii.gz")

mri_seg.SegmentMRI(MRI_FILE, OUTPUT_FOLDER)

Seg_Stl_PATH = os.path.join(os.path.dirname(os.path.realpath(__file__)), "seg_stl.py")


Slicer_PATH = "/home/sid/Downloads/Slicer-5.4.0-linux-amd64/Slicer"
# Run Slicer
os.system(Slicer_PATH + " --no-splash --no-main-window --python-script " + Seg_Stl_PATH + " " + OUTPUT_FILE)
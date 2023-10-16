from django.shortcuts import render
import os
from pathlib import Path
from .models import MriFile
from django.http import JsonResponse
from .tasks import run_synthseg
from . import mri_seg


def index(request):
    BASE_DIR = Path(__file__).resolve().parent
    STL_DIR = BASE_DIR / "static" / "STLs"
    stl_files = [f for f in os.listdir(STL_DIR) if f.endswith(".stl")]
    return render(request, "index.html", {"stl_files": stl_files})


def uploadMriFiles(request):
    if request.method == "POST":
        uploaded_file = request.FILES.get('file')
        if uploaded_file:
            new_file = MriFile(file=uploaded_file, name= uploaded_file.name)
            new_file.save()
            #geth the full path of the file starting from C:/
            full_path = new_file.file.path
            print(os.path.dirname(full_path))
            return JsonResponse({"success": True, "file": uploaded_file.name})
        else:
            return JsonResponse({'status': 'error', 'message': 'No file upload'})
        
    return JsonResponse({'status': 'error', 'message': 'No file upload'})

def segment_mri(request):
    #pick the last uploaded file
    try:
        print('------------------ Segmenting MRI ------------------')
        last_uploaded_file = MriFile.objects.order_by('-uploaded_at').last()
        path = last_uploaded_file.file.path
        # result = run_synthseg.apply_async( (last_uploaded_file.file.path, ) )
        OUTPUT_FOLDER = os.path.dirname(path)
        OUTPUT_FILE = path.replace(".nii.gz", "_synthseg.nii.gz")

        print(OUTPUT_FOLDER, OUTPUT_FILE)    

        mri_seg.SegmentMRI(path, OUTPUT_FOLDER)
        # print(result)

        

        print('------------------ Finish Segmenting MRI ------------------')

    except Exception as e:
        print(e)
        print('------------------ Error Segmenting MRI ------------------')

    return JsonResponse({'status': 'success', 'message': 'MRI segmented successfully'})
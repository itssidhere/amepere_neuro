from django.shortcuts import render
import os
from pathlib import Path


def index(request):
    BASE_DIR = Path(__file__).resolve().parent
    STL_DIR = BASE_DIR / "static" / "STLs"
    stl_files = [f for f in os.listdir(STL_DIR) if f.endswith(".stl")]
    return render(request, "index.html", {"stl_files": stl_files})

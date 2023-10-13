#!/bin/bash

while read requirement; do
    pip install $requirement || echo "Failed to install $requirement, skipping"
done < requirements.txt
#!/bin/bash

# Counter starts at 1
i=1

# Loop through all base images that do NOT contain "_mask"
for img in *_mask.png; do
    : # skip mask files in first loop
done

for img in *.png; do
    # Skip mask files
    if [[ "$img" == *_mask.png ]]; then
        continue
    fi

    base="${img%.*}"            # strip .png → e.g. "50194"
    mask="${base}_mask.png"     # mask file with same ID

    # Check if mask exists
    if [[ ! -f "$mask" ]]; then
        echo "Warning: mask missing for $img, skipping."
        continue
    fi

    # New names
    new_img="${i}.png"
    new_mask="${i}_mask.png"

    echo "Renaming $img → $new_img"
    mv "$img" "$new_img"

    echo "Renaming $mask → $new_mask"
    mv "$mask" "$new_mask"

    ((i++))
done

echo "Done!"

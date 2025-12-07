#!/bin/bash

# Directory containing the images (default: current directory)
DIR="${1:-.}"

cd "$DIR" || exit 1

# Find all images matching <number>.png but not *_mask.png
images=( $(ls | grep -E '^[0-9]+\.png$' | sort -n) )

index=1

for img in "${images[@]}"; do
    identifier="${img%.png}"
    mask="${identifier}_mask.png"

    # Skip if mask doesn't exist
    if [[ ! -f "$mask" ]]; then
        echo "Skipping $img (no matching mask)"
        continue
    fi

    new_img="${index}.png"
    new_mask="${index}_mask.png"

    echo "Renaming: $img → $new_img"
    echo "           $mask → $new_mask"

    # Rename safely (use mv -n if you want to avoid overwriting)
    mv "$img" "$new_img"
    mv "$mask" "$new_mask"

    index=$((index+1))
done

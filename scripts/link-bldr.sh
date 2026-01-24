#!/bin/bash

# Only run if bldr has been built
if [ ! -f "packages/bldr/dist/index.js" ]; then
  exit 0
fi

# Find all packages that have @bb-labs/bldr in their node_modules
for pkg in packages/*/node_modules/@bb-labs/bldr; do
  if [ -d "$pkg" ]; then
    # Get the package directory
    pkg_dir=$(dirname $(dirname "$pkg"))
    bin_dir="$pkg_dir/.bin"

    # Create .bin directory if it doesn't exist
    mkdir -p "$bin_dir"

    # Create symlink if it doesn't exist
    if [ ! -L "$bin_dir/bldr" ]; then
      ln -sf ../@bb-labs/bldr/dist/index.js "$bin_dir/bldr"
    fi
  fi
done

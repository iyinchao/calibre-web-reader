#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration Abstraction ---
# This section sets the final CALIBRE_DB_PATH variables
# for the Node.js application based on the chosen run mode.
# This simplifies the application code and user configuration.

if [ "$CALIBRE_RUN_MODE" = "self" ]; then
  # --- Self-Hosted Mode Logic ---
  echo "ℹ️ Running in 'self' mode."

  INSTALL_DIR="$SELF_CALIBRE_INSTALL_DIR"
  VERSION_FILE="$INSTALL_DIR/calibre-version.txt"

  if [ -z "$INSTALL_DIR" ]; then
    echo "❌ Error: SELF_CALIBRE_INSTALL_DIR is not set in .env file. It is required for 'self' mode."
    exit 1
  fi

  mkdir -p "$INSTALL_DIR"

  # --- Dynamic Version Resolution ---
  # If the requested version is 'latest' or empty, fetch the actual latest version number.
  REQUIRED_VERSION="$SELF_CALIBRE_VERSION"
  if [ -z "$REQUIRED_VERSION" ] || [ "$REQUIRED_VERSION" = "latest" ]; then
    echo "ℹ️ 'latest' version requested. Fetching the latest Calibre version number..."
    # Set frontend to noninteractive to prevent hangs and reduce noise
    export DEBIAN_FRONTEND=noninteractive
    # Get latest version
    LATEST_VERSION=$(curl -sLk https://calibre-ebook.com/downloads/latest_version)

    if [ -z "$LATEST_VERSION" ]; then
      echo "❌ Error: Could not fetch the latest Calibre version. Please check network connection."
      exit 1
    fi
    REQUIRED_VERSION=$LATEST_VERSION
    echo "✅ Latest Calibre version is: ${REQUIRED_VERSION}"
  fi

  INSTALLED_VERSION=""
  if [ -f "$VERSION_FILE" ]; then
    INSTALLED_VERSION=$(cat "$VERSION_FILE")
  fi

  if [ "$INSTALLED_VERSION" = "$REQUIRED_VERSION" ]; then
    echo "✅ Calibre version ${REQUIRED_VERSION} is already installed in ${INSTALL_DIR}."
  else
    echo " Calibre version mismatch. Required: '${REQUIRED_VERSION}', Found: '${INSTALLED_VERSION}'."
    echo "🚀 Installing Calibre version ${REQUIRED_VERSION} to ${INSTALL_DIR}..."

    # Set frontend to noninteractive to prevent hangs and reduce noise
    export DEBIAN_FRONTEND=noninteractive
    # Using apt-get for Debian-based image
    # Install required system libraries for Calibre, including graphics dependencies
    apt-get update && apt-get install -y python3 wget xz-utils xdg-utils libegl1 libopengl0 libxcb-cursor0 libfreetype6 && rm -rf /var/lib/apt/lists/*

    find "$INSTALL_DIR" -mindepth 1 -print0 | xargs -0 rm -rf

    # The installer script does not need the 'version' argument when installing the latest version.
    # We check against the original SELF_CALIBRE_VERSION variable here.
    if [ "$SELF_CALIBRE_VERSION" = "latest" ] || [ -z "$SELF_CALIBRE_VERSION" ]; then
      echo "Installing latest Calibre version..."
      wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sh /dev/stdin install_dir=${INSTALL_DIR} isolated=y
    else
      echo "Installing Calibre version ${REQUIRED_VERSION}..."
      wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sh /dev/stdin version=${REQUIRED_VERSION} install_dir=${INSTALL_DIR} isolated=y
    fi

    # Write the specific, resolved version number to the file for future checks.
    mkdir -p "$(dirname "$VERSION_FILE")"
    echo "$REQUIRED_VERSION" > "$VERSION_FILE"

    echo "✅ Calibre installation complete."
  fi

  # Set the DB path for the application to use the installed binary.
  export CALIBRE_DB_PATH="$INSTALL_DIR/calibre/calibredb"
  export CALIBRE_LIBRARY_PATH="$SELF_CALIBRE_LIBRARY_PATH"

elif [ "$CALIBRE_RUN_MODE" = "DooD" ]; then
  echo "ℹ️ Running in 'DooD' mode."
  export CALIBRE_DB_PATH="$DOOD_CALIBRE_DB_PATH"
  export CALIBRE_LIBRARY_PATH="$DOOD_CALIBRE_LIBRARY_PATH"

elif [ "$CALIBRE_RUN_MODE" = "host" ]; then
  echo "ℹ️ Running in 'host' mode."
  export CALIBRE_DB_PATH="$HOST_CALIBRE_DB_PATH"
  export CALIBRE_LIBRARY_PATH="$HOST_CALIBRE_LIBRARY_PATH"

else
  echo "⚠️ Warning: CALIBRE_RUN_MODE is not set or is invalid. Defaulting to 'host' mode behavior."
  export CALIBRE_DB_PATH="$HOST_CALIBRE_DB_PATH"
  export CALIBRE_LIBRARY_PATH="$HOST_CALIBRE_LIBRARY_PATH"
fi

echo "--------------------------------------------------"
echo "Effective settings for the application:"
echo "  CALIBRE_LIBRARY_PATH: ${CALIBRE_LIBRARY_PATH}"
echo "  CALIBRE_DB_PATH: ${CALIBRE_DB_PATH}"
echo "--------------------------------------------------"

# --- Application Execution ---
# Execute the command passed into this script (the Dockerfile's CMD).
exec "$@"

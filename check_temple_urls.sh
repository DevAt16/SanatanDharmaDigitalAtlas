#!/bin/bash
# Extract all image URLs from tamilNadu.js and check each one

FILE="/Users/devashishpawar/Documents/Development/the-sutra-web/src/data/temples/tamilNadu.js"

# Extract image URLs using grep with extended regex
grep -n '"image"' "$FILE" | while IFS= read -r line; do
  LINE_NUM=$(echo "$line" | cut -d: -f1)
  URL=$(echo "$line" | sed -n 's/.*"image": *"\([^"]*\)".*/\1/p')
  
  if [ -z "$URL" ]; then
    continue
  fi

  # Check URL with curl (follow redirects, only get headers)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$URL")
  
  if [ "$HTTP_CODE" != "200" ]; then
    echo "BROKEN|Line $LINE_NUM|HTTP $HTTP_CODE|$URL"
  else
    echo "OK|Line $LINE_NUM|HTTP $HTTP_CODE|$URL"
  fi
done

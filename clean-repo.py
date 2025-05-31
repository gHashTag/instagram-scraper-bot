#!/usr/bin/env python3

import re
from typing import Optional

def clean_content(content: bytes) -> Optional[bytes]:
    # Convert bytes to string for easier pattern matching
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        return None

    # Pattern for OpenAI API keys (they start with 'sk-' and are 51 characters long)
    api_key_pattern = r'sk-[a-zA-Z0-9]{48}'
    
    # Check if we have any matches
    if not re.search(api_key_pattern, text):
        return None

    # Replace API keys with placeholder
    cleaned_text = re.sub(api_key_pattern, 'your_openai_api_key', text)
    
    # Only return if we made changes
    if cleaned_text != text:
        return cleaned_text.encode('utf-8')
    return None

def clean_blob(blob, callback):
    # Only process TypeScript files in src/scripts directory
    if not blob.path.startswith(b'src/scripts/') or not blob.path.endswith(b'.ts'):
        return

    # Clean the content
    cleaned_content = clean_content(blob.data)
    if cleaned_content is not None:
        # Update the blob with cleaned content
        blob.data = cleaned_content
        callback(blob)

# This will be used by git filter-repo
if __name__ == '__main__':
    import sys
    if len(sys.argv) != 1:
        print('Error: This script is meant to be used as a --blob-callback with git filter-repo')
        exit(1)


import urllib.request, urllib.parse, json, re

def sanitize_filename(name: str) -> str:
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-\_\.]', '', name)
    sanitized = re.sub(r'\.+', '.', sanitized)
    sanitized = re.sub(r'\s+', ' ', sanitized)
    sanitized = sanitized.strip(' .')
    return sanitized[:120]

req = urllib.request.Request("https://api.xierra.xyz/api/v2/status", headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        
        for f in data["files"]:
            encoded = urllib.parse.quote(f)
            decoded = urllib.parse.unquote(encoded)
            sanitized = sanitize_filename(decoded)
            
            print(f"Original : {f}")
            print(f"Decoded  : {decoded}")
            print(f"Sanitized: {sanitized}")
            print(f"Match?   : {f == sanitized}")
            print()
except Exception as e:
    print(e)

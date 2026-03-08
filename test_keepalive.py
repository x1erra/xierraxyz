import http.client
import json
import urllib.parse
import time

conn = http.client.HTTPSConnection("api.xierra.xyz")

def check_backend():
    conn.request("GET", "/api/v2/status", headers={"Connection": "keep-alive", "User-Agent": "Mozilla/5.0"})
    res = conn.getresponse()
    body = res.read()
    data = json.loads(body.decode())
    return data["files"]

found = False
for _ in range(10):
    try:
        files = check_backend()
        if len(files) == 2:
            print("Hit Container B! (2 files)")
            for f in files:
                if "Sportsnet" in f:
                    print("Found Sportsnet in status!")
                    url = "/api/v3/download?filename=" + urllib.parse.quote(f)
                    conn.request("GET", url, headers={"Connection": "keep-alive", "User-Agent": "Mozilla/5.0"})
                    res2 = conn.getresponse()
                    body2 = res2.read()
                    print("Download Status:", res2.status)
                    if res2.status == 404:
                        print("Error Body:", body2.decode())
            found = True
            break
        else:
            print("Hit Container A (9 files). Retrying...")
    except Exception as e:
        print("Error:", e)
    time.sleep(1)

conn.close()

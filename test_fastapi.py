from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.testclient import TestClient
import os

app = FastAPI()

os.makedirs("testdir", exist_ok=True)

@app.get("/download")
def download():
    return FileResponse("testdir")

client = TestClient(app)
response = client.get("/download")
print("Status:", response.status_code)
print("Body:", response.text)

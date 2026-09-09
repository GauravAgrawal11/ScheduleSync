import urllib.request
import io
import wave
import struct

buf = io.BytesIO()
with wave.open(buf, 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(16000)
    f.writeframes(struct.pack('<' + ('h'*16000), *([100, -100]*8000)))
audio_data = buf.getvalue()

boundary = '----WebKitFormBoundaryXYZ'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="test.wav"\r\n'
    f'Content-Type: audio/wav\r\n\r\n'
).encode() + audio_data + f'\r\n--{boundary}--\r\n'.encode()

req = urllib.request.Request(
    'http://127.0.0.1:8000/voice/transcribe',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
try:
    with urllib.request.urlopen(req) as resp:
        print('Status:', resp.status)
        print('Body:', resp.read().decode())
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code, e.read().decode())
except Exception as e:
    print('Error:', e)

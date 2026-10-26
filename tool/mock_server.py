"""A stand-in for the TripArro website's API on the emulator test (recorded test-site answers in fixtures/)."""
import json, os, http.server
HERE = os.path.dirname(os.path.abspath(__file__))
class H(http.server.BaseHTTPRequestHandler):
    def send(self, code, body, ctype='application/json'):
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        p = self.path.split('?')[0]
        if p.startswith('/media/'):
            f = os.path.join(HERE, 'fixtures/media', os.path.basename(p))
            if os.path.exists(f): return self.send(200, open(f, 'rb').read(), 'image/png' if f.endswith('.png') else 'image/jpeg')
            return self.send(404, b'')
        if p.startswith('/api/'):
            f = os.path.join(HERE, 'fixtures', p[5:].strip('/').replace('/', '__') + '.json')
            if os.path.exists(f): return self.send(200, open(f, 'rb').read())
            return self.send(404, b'{"message":"Not found."}')
        self.send(200, b'<html><body><h2>TripArro</h2><p>Website page (test stand-in).</p></body></html>', 'text/html')
    def do_POST(self):
        n = int(self.headers.get('content-length', 0)); self.rfile.read(n)
        p = self.path.split('?')[0]
        if p == '/api/visit': return self.send(200, b'{"ok":true}')
        if p == '/api/pets/ai': return self.send(200, json.dumps({'reply': 'Here is 1 verified host for dogs in Coimbatore: Happy Paws Home (Rs 600/night).', 'filters': {}, 'ai': False,
            'items': json.load(open(os.path.join(HERE, 'fixtures/pets__search.json')))['items']}).encode())
        self.send(422, b'{"message":"Not available on the test stand-in."}')
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('0.0.0.0', 8000), H).serve_forever()

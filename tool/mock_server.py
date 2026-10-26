"""A stand-in for the TripArro website's API on the emulator test (recorded test-site answers in fixtures/)."""
import json, os, http.server, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
B = 'http://10.0.2.2:8000'
# the signed-in guest's notifications (GET /api/notifications); GET /__add adds a new one, as if the host wrote in the Pet Stay Diary
NOTES = [
    {'id': 101, 'kind': 'booking', 'title': 'Your pet\'s stay is confirmed 🐾', 'body': 'Happy Paws Home · P1MX48HI', 'link': B + '/pet-booking/P1MX48HI', 'read': True, 'created_at': '2026-10-20T10:15:00+05:30'},
    {'id': 102, 'kind': 'checkin', 'title': 'Your pet has checked in 🐾', 'body': 'Happy Paws Home · P1MX48HI', 'link': B + '/pet-booking/P1MX48HI', 'read': False, 'created_at': '2026-10-24T09:02:00+05:30'},
    {'id': 103, 'kind': 'message', 'title': 'New diary update: Walk', 'body': 'Happy Paws Home — 30 minutes in the park, very happy!', 'link': B + '/pet-booking/P1MX48HI#diary', 'read': False, 'created_at': '2026-10-24T17:40:00+05:30'},
]
class H(http.server.BaseHTTPRequestHandler):
    def send(self, code, body, ctype='application/json'):
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/__add':
            NOTES.append({'id': max(n['id'] for n in NOTES) + 1, 'kind': 'message', 'title': 'New diary update: Feeding', 'body': 'Happy Paws Home — Bruno ate all his dinner 🍽', 'link': B + '/pet-booking/P1MX48HI#diary', 'read': False, 'created_at': '2026-10-26T19:05:00+05:30'})
            return self.send(200, b'ok', 'text/plain')
        if p == '/api/notifications':
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            after = int(q.get('after', ['0'])[0] or 0)
            items = sorted([n for n in NOTES if n['id'] > after], key=lambda n: -n['id'])
            return self.send(200, json.dumps({'items': items, 'unread': sum(1 for n in NOTES if not n['read'])}).encode())
        if p == '/api/pages/privacy':
            return self.send(200, json.dumps({'title': 'Privacy policy', 'html': '<p class="updated">TripArro · last updated 30 September 2026</p><p>This policy explains what personal information TripArro collects when you use our website and app, why we collect it, and the choices you have.</p><h2>Information we collect</h2><ul><li><strong>Account details</strong> — your name, email address, phone number and a securely hashed password.</li><li><strong>Booking details</strong> — the stay, dates, number of guests and any message to the host.</li><li><strong>Payment information</strong> — processed by our payment partner; we never see your card or UPI PIN.</li></ul><h2>Your choices</h2><p>You can update your profile or delete your account from the app at any time. Questions? <a href="mailto:hello@triparro.com">hello@triparro.com</a></p>'}).encode())
        if p == '/become-a-host':
            return self.send(200, json.dumps({'types': ['Villa', 'Cottage', 'Apartment', 'Farm stay'], 'channels': ['Airbnb', 'Booking.com', 'MakeMyTrip', 'None yet'], 'commission': 10, 'fee': 10,
                'advantages': [['tag', 'Your discounts, your decision', 'Every stay gets its own coupon code. Change or pause it any time.'], ['chart', 'Smart pricing under your control', 'Prices follow demand, always between the lowest and highest price you set.'], ['cal', 'One calendar for every platform', 'Airbnb, Booking.com and MakeMyTrip bookings in one place — no double bookings.']]}).encode())
        if p == '/become-a-pet-host':
            return self.send(200, json.dumps({'id_types': [{'value': 'aadhaar', 'label': 'Aadhaar card'}, {'value': 'passport', 'label': 'Passport'}, {'value': 'dl', 'label': 'Driving licence'}]}).encode())
        if p.startswith('/checkin/'):
            return self.send(200, json.dumps({'state': 'open', 'kind': 'stay', 'ref': 'D6F5CD3D', 'title': 'TripArro Home stay - Coimbatore BK Pudur', 'location': 'Ooty', 'check_in': '2027-01-15', 'check_out': '2027-01-18', 'max_people': 4,
                'id_types': [{'value': 'aadhaar', 'label': 'Aadhaar card'}, {'value': 'passport', 'label': 'Passport'}], 'guest': {'name': 'Asha G', 'email': 'petguest1@example.com', 'phone': '9876543210'}, 'sent': None}).encode())
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
        n = int(self.headers.get('content-length', 0)); raw = self.rfile.read(n)
        p = self.path.split('?')[0]
        if p == '/api/notifications/read':
            b = json.loads(raw or b'{}')
            for x in NOTES:
                if b.get('all') or x['id'] == b.get('id'): x['read'] = True
            return self.send(200, json.dumps({'ok': True, 'unread': sum(1 for x in NOTES if not x['read'])}).encode())
        if p == '/api/visit': return self.send(200, b'{"ok":true}')
        if p == '/api/chat/start': return self.send(200, json.dumps({'token': 'tok1', 'mode': 'ai', 'status': 'open', 'ai': True, 'listing': {'kind': 'stay', 'id': 1, 'title': 'TripArro Home stay - Coimbatore BK Pudur'}, 'host_name': 'Priya',
            'messages': [{'id': 1, 'from': 'system', 'body': "Hi! I'm TripArro AI. Ask me anything about this stay — dates, price, rooms, food. You can talk to the host at any time.", 'at': '2026-10-26 10:00:00', 'offer': None},
                         {'id': 2, 'from': 'guest', 'body': 'Is breakfast included for 4 guests?', 'at': '2026-10-26 10:01:00', 'offer': None},
                         {'id': 3, 'from': 'ai', 'body': 'Yes — breakfast is included for up to 4 guests. Extra guests (up to 2 more) pay Rs 500 per night each, breakfast included.', 'at': '2026-10-26 10:01:05', 'offer': None}]}).encode())
        if p == '/api/pets/ai': return self.send(200, json.dumps({'reply': 'Here is 1 verified host for dogs in Coimbatore: Happy Paws Home (Rs 600/night).', 'filters': {}, 'ai': False,
            'items': json.load(open(os.path.join(HERE, 'fixtures/pets__search.json')))['items']}).encode())
        self.send(422, b'{"message":"Not available on the test stand-in."}')
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('0.0.0.0', 8000), H).serve_forever()

#!/usr/bin/env python3
"""Sign the release APK and app bundle with the TripArro upload key — no Android SDK needed.

  APK (.apk): APK Signature Scheme v2 (what Android 7.0+ checks; the app's minSdk is 24). The ZIP entries are kept
              byte for byte, so the alignment from the build stays; only the APK Signing Block is replaced.
  Bundle (.aab, for Google Play): a JAR signature (what Play expects from the upload key), via jarsigner.

Usage (the key never goes into the repository):
  KEYSTORE=/path/upload-keystore.jks KEY_ALIAS=upload STORE_PASSWORD=... KEY_PASSWORD=... \\
    python3 tool/release/sign_release.py app-release.apk triparro-signed.apk [app-release.aab triparro-signed.aab]
Needs: python3 with "cryptography", and keytool/jarsigner (any JDK 17+)."""
import os, sys, struct, hashlib, subprocess, tempfile, zipfile, shutil
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12

V2_ID = 0x7109871A
ALG_RSA_PKCS1_SHA256 = 0x0103
MAGIC = b'APK Sig Block 42'
CHUNK = 1024 * 1024


def lp(b: bytes) -> bytes:                 # uint32 length-prefixed
    return struct.pack('<I', len(b)) + b


def load_key():
    ks, alias = os.environ['KEYSTORE'], os.environ.get('KEY_ALIAS', 'upload')
    sp, kp = os.environ['STORE_PASSWORD'], os.environ.get('KEY_PASSWORD', os.environ['STORE_PASSWORD'])
    if ks.endswith('.p12'):
        data, pw = open(ks, 'rb').read(), sp
    else:                                  # JKS → PKCS12 in a private temp folder (deleted afterwards)
        d = tempfile.mkdtemp(); p12 = os.path.join(d, 'k.p12')
        try:
            subprocess.run(['keytool', '-importkeystore', '-srckeystore', ks, '-srcstorepass', sp, '-srcalias', alias, '-srckeypass', kp,
                            '-destkeystore', p12, '-deststoretype', 'PKCS12', '-deststorepass', sp, '-destkeypass', sp, '-noprompt'],
                           check=True, capture_output=True)
            data, pw = open(p12, 'rb').read(), sp
        finally:
            shutil.rmtree(d, ignore_errors=True)
    key, cert, _ = pkcs12.load_key_and_certificates(data, pw.encode())
    return key, cert


def find_eocd(apk: bytes) -> int:
    for i in range(len(apk) - 22, max(-1, len(apk) - 22 - 65536), -1):
        if apk[i:i + 4] == b'PK\x05\x06' and i + 22 + struct.unpack('<H', apk[i + 20:i + 22])[0] == len(apk):
            return i
    raise SystemExit('Not a ZIP/APK (no end of central directory).')


def chunked_digest(sections) -> bytes:
    digests = []
    for s in sections:
        for o in range(0, len(s), CHUNK):
            c = s[o:o + CHUNK]
            digests.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(digests)) + b''.join(digests)).digest()


def sign_apk(src: str, dst: str, key, cert):
    apk = open(src, 'rb').read()
    eocd = find_eocd(apk)
    cd_size, cd_off = struct.unpack('<II', apk[eocd + 12:eocd + 20])
    entries_end = cd_off
    if apk[cd_off - 16:cd_off] == MAGIC:   # drop the existing (debug) signing block
        size = struct.unpack('<Q', apk[cd_off - 24:cd_off - 16])[0]
        entries_end = cd_off - size - 8
    entries, cd, eocd_b = apk[:entries_end], apk[cd_off:cd_off + cd_size], bytearray(apk[eocd:])
    eocd_for_digest = bytearray(eocd_b); eocd_for_digest[16:20] = struct.pack('<I', entries_end)
    digest = chunked_digest([entries, cd, bytes(eocd_for_digest)])
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    signed_data = lp(lp(struct.pack('<I', ALG_RSA_PKCS1_SHA256) + lp(digest))) + lp(lp(cert_der)) + lp(b'')
    sig = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    pub = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed_data) + lp(lp(struct.pack('<I', ALG_RSA_PKCS1_SHA256) + lp(sig))) + lp(pub)
    v2 = lp(lp(signer))
    pair = struct.pack('<Q', 4 + len(v2)) + struct.pack('<I', V2_ID) + v2
    size = len(pair) + 8 + 16
    block = struct.pack('<Q', size) + pair + struct.pack('<Q', size) + MAGIC
    eocd_b[16:20] = struct.pack('<I', entries_end + len(block))
    open(dst, 'wb').write(entries + block + cd + bytes(eocd_b))


def sign_aab(src: str, dst: str):
    ks, alias = os.environ['KEYSTORE'], os.environ.get('KEY_ALIAS', 'upload')
    sp, kp = os.environ['STORE_PASSWORD'], os.environ.get('KEY_PASSWORD', os.environ['STORE_PASSWORD'])
    tmp = dst + '.unsigned'
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:   # remove any earlier (debug) signature
        for it in zin.infolist():
            n = it.filename.upper()
            if n.startswith('META-INF/') and (n.endswith('.SF') or n.endswith('.RSA') or n.endswith('.DSA') or n.endswith('.EC') or n == 'META-INF/MANIFEST.MF'):
                continue
            zout.writestr(it, zin.read(it.filename))
    args = ['jarsigner', '-keystore', ks, '-storepass', sp, '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', '-signedjar', dst, tmp, alias]
    subprocess.run(args[:-1] + ['-keypass', kp, alias], check=True, capture_output=True)
    os.remove(tmp)


if __name__ == '__main__':
    if len(sys.argv) not in (3, 5): raise SystemExit(__doc__)
    key, cert = load_key()
    sign_apk(sys.argv[1], sys.argv[2], key, cert)
    print('APK signed:', sys.argv[2])
    if len(sys.argv) == 5:
        sign_aab(sys.argv[3], sys.argv[4])
        print('Bundle signed:', sys.argv[4])

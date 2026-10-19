"""確かめ用サーバー（site\ を配る・範囲指定の読み込みに応じる）

python -m http.server は Range に応じないため、音声の途中へ動かす（30秒戻し・続きから）を
手元で確かめられない。公開先の GitHub Pages は Range に応じる（206）ので、それに合わせる。
標準ライブラリだけで動く。

使い方: python tools/serve.py [port]   （既定 8460・127.0.0.1 だけで待つ）
"""
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
RANGE_RE = re.compile(r'bytes=(\d*)-(\d*)$')


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()
        m = RANGE_RE.match(rng.strip())
        size = os.path.getsize(path)
        if not m or (m.group(1) == '' and m.group(2) == ''):
            return super().send_head()
        if m.group(1) == '':
            start, end = max(0, size - int(m.group(2))), size - 1
        else:
            start = int(m.group(1))
            end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._remain = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        remain = getattr(self, '_remain', None)
        if remain is None:
            return super().copyfile(source, outputfile)
        while remain > 0:
            buf = source.read(min(64 * 1024, remain))
            if not buf:
                break
            outputfile.write(buf)
            remain -= len(buf)
        self._remain = None

    def end_headers(self):
        if not self.headers.get('Range'):
            self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()


RangeHandler.extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.m4a': 'audio/mp4', '.webp': 'image/webp', '.js': 'text/javascript'}

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8460
    handler = partial(RangeHandler, directory=os.path.abspath(SITE))
    with ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        print(f'serving {os.path.abspath(SITE)} at http://127.0.0.1:{port}/', flush=True)
        httpd.serve_forever()

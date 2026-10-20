from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
import argparse
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8781);a=p.parse_args();root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',a.port),partial(Handler,directory=str(root)))
print(f'Blue & Green Waterways: http://127.0.0.1:{a.port}/',flush=True);server.serve_forever()

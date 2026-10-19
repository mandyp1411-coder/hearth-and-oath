"""Portable source sync fallback when the Sites bundle helpers are unavailable.

Receive the short-lived source credential through hidden stdin. Authentication
exists only in the child process environment; never write it to Git config.
"""
import json
import os
import subprocess
import sys
import termios
from pathlib import Path

checkout = Path(__file__).resolve().parents[1]
stdin_settings = None
if sys.stdin.isatty():
    stdin_settings = termios.tcgetattr(sys.stdin.fileno())
    hidden = termios.tcgetattr(sys.stdin.fileno())
    hidden[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, hidden)
print('Ready for source credential JSON on stdin (input is hidden).', flush=True)
try:
    payload = json.loads(sys.stdin.readline())
finally:
    if stdin_settings:
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, stdin_settings)

credential = payload['credential']
manifest = json.loads((checkout / '.openai' / 'hosting.json').read_text())
if manifest['project_id'] != payload['project_id']:
    raise RuntimeError('Site identity mismatch')
if credential['auth_mode'] != 'http_extra_header':
    raise RuntimeError('Unsupported repository authentication mode')
env = os.environ.copy()
env['GIT_TERMINAL_PROMPT'] = '0'
env['GIT_CONFIG_COUNT'] = '1'
env['GIT_CONFIG_KEY_0'] = 'http.extraHeader'
env['GIT_CONFIG_VALUE_0'] = 'Authorization: Bearer ' + credential['token']
env['GIT_TRACE'] = '0'
env['GIT_CURL_VERBOSE'] = '0'

def git(*args, authenticated=False):
    result = subprocess.run(['git', *args], cwd=checkout,
                            env=env if authenticated else os.environ.copy(),
                            text=True, capture_output=True)
    if result.returncode:
        # No headers are enabled in Git output; redact the token regardless.
        message = result.stderr.replace(credential['token'], '[redacted]')
        raise RuntimeError(message[:2400])
    return result.stdout.strip()

if not (checkout / '.git').exists():
    git('init', '-b', credential['branch'])
git('config', 'user.name', 'Codex')
git('config', 'user.email', 'codex@users.noreply.openai.com')
remotes = git('remote').splitlines()
if 'origin' in remotes:
    git('remote', 'set-url', 'origin', credential['remote_url'])
else:
    git('remote', 'add', 'origin', credential['remote_url'])
git('add', '.')
if git('status', '--porcelain'):
    git('commit', '-m', 'Deepen Hearth & Oath childhood stories, independent social lives, pastimes and seeded cartography')
commit = git('rev-parse', 'HEAD')
git('push', '-u', 'origin', 'HEAD:' + credential['branch'], authenticated=True)
if git('status', '--porcelain'):
    raise RuntimeError('Source changed during publication; retry from the current source')

# Archive only the exact committed deployment files, never .git or credentials.
archive = Path(payload['archivePath'])
archive.parent.mkdir(parents=True, exist_ok=True)
git('archive', '--format=tar.gz', '--output=' + str(archive), commit,
    'dist', '.openai/hosting.json')
print(json.dumps({'project_id': manifest['project_id'], 'commit_sha': commit,
                  'archive': str(archive)}), flush=True)

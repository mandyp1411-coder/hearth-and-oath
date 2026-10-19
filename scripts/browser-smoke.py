"""Compatibility entry point for the current real-browser game checks."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('browser-rebuild.py')), run_name='__main__')

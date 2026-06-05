from __future__ import annotations

import os
import threading
import time
import webbrowser

import uvicorn

from app.main import app


def main() -> None:
    host = os.environ.get("AGENTDESK_HOST", "127.0.0.1")
    port = int(os.environ.get("BACKEND_PORT", "8765"))
    url = f"http://{host}:{port}"

    if os.environ.get("AGENTDESK_NO_BROWSER") != "1":
        threading.Thread(target=_open_browser, args=(url,), daemon=True).start()

    uvicorn.run(app, host=host, port=port, reload=False)


def _open_browser(url: str) -> None:
    time.sleep(1.2)
    webbrowser.open(url)


if __name__ == "__main__":
    main()

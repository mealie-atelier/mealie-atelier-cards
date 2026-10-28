"""Optional Chromium end-to-end test. Requires python playwright installed and chromium."""

import json
import os
import re
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def launch(cmd, env=None):
    p = subprocess.Popen(
        cmd,
        cwd=ROOT,
        env=env or os.environ.copy(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    for _ in range(8):
        line = p.stdout.readline().strip()
        match = re.search(r"(?:127\.0\.0\.1:)?(\d{4,5})\b", line)
        if match:
            return p, int(match.group(1))
    raise RuntimeError("Server did not start")


mock, mport = launch(["node", "test/mock-services.mjs"])
env = {
    **os.environ,
    "MEALIE_URL": f"http://127.0.0.1:{mport}",
    "MEALIE_API_TOKEN": "LOCAL_TEST_TOKEN",
    "ATELIER_USERNAME": "atelier",
    "ATELIER_PASSWORD": "test-pass",
    "ATELIER_HA_URL": f"http://127.0.0.1:{mport}",
    "ATELIER_HA_TOKEN": "TEST_HA_TOKEN",
    "ATELIER_HA_NOTIFY_SERVICE": "notify.mobile_app_test",
    "ATELIER_ALARM_CHANNEL": "ha",
    "PORT": "0",
    "HOST": "127.0.0.1",
    "ATELIER_DATA_DIR": "/tmp/atelier-e2e-offline-" + str(os.getpid()),
}
web, wport = launch(["node", "server.mjs"], env)
url = f"http://127.0.0.1:{wport}/"
report = []


def events():
    return json.load(urllib.request.urlopen(f"http://127.0.0.1:{mport}/events"))


try:
    with sync_playwright() as play:
        browser = play.chromium.launch(
            headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"]
        )
        a = browser.new_context(
            http_credentials={"username": "atelier", "password": "test-pass"},
            viewport={"width": 390, "height": 844},
            service_workers="allow",
        )
        b = browser.new_context(
            http_credentials={"username": "atelier", "password": "test-pass"},
            viewport={"width": 1440, "height": 950},
            service_workers="allow",
        )
        p = a.new_page()
        q = b.new_page()
        p.on("dialog", lambda dlg: dlg.accept())
        q.on("dialog", lambda dlg: dlg.accept())
        for page in (p, q):
            page.goto(url, wait_until="domcontentloaded", timeout=25000)
            page.locator("#a-sync-enable").click()
            page.wait_for_function(
                "document.querySelector('#a-sync-enable').textContent.includes('löschen')"
            )
            page.wait_for_function(
                "document.querySelector('#a-sync-summary').textContent.includes('Online')"
            )
        report.append(
            "Two isolated devices initialized their own IndexedDB offline shopping snapshots"
        )
        # Verify actual offline navigation under the Service Worker cache, not just client-side state.
        p.wait_for_timeout(1800)
        a.set_offline(True)
        p.reload(wait_until="domcontentloaded", timeout=14000)
        p.wait_for_selector("mealie-atelier-card", timeout=10000)
        report.append("Offline PWA shell reopened after network loss")
        # Re-enter shopping route then toggle the item while offline.
        p.locator("mealie-atelier-card").evaluate(
            'el=>el.shadowRoot.querySelector(\'[data-action="nav"][data-value="shopping"]\').click()'
        )
        p.wait_for_timeout(500)
        p.locator("mealie-atelier-card").evaluate(
            "el=>el.shadowRoot.querySelector('[data-action=\"shopping-toggle\"]').click()"
        )
        p.wait_for_function(
            "document.querySelector('#a-sync-summary').textContent.includes('1 ausstehend')",
            timeout=8000,
        )
        report.append(
            "Shopping item toggled without network and persisted in transactional IndexedDB"
        )
        a.set_offline(False)
        p.wait_for_function(
            "document.querySelector('#a-sync-summary').textContent.includes('0 ausstehend')",
            timeout=15000,
        )
        for _ in range(8):
            if events()["checked"]:
                break
            time.sleep(0.2)
        assert events()["checked"] is True, events()
        # Other device refreshes authoritative Mealie list.
        q.locator("#a-sync-now").click()
        q.wait_for_timeout(1200)
        checked_b = q.locator("mealie-atelier-card").evaluate(
            "el=>{el.shadowRoot.querySelector('[data-action=\"nav\"][data-value=\"shopping\"]').click();return el._data.shopping.items.find(x=>x.id==='item-a').checked}"
        )
        assert checked_b is True
        report.append("Other device observed the remote checkbox change after synchronization")
        # Closed browser timer: POST timer through the auth protected bridge, then close both contexts.
        timer_id = p.evaluate("crypto.randomUUID()")
        due = int(time.time() * 1000) + 2300
        r = p.evaluate(
            "async arg=>{const r=await fetch('/api/bridge',{method:'POST',headers:{'X-Atelier-Request':'1','Content-Type':'application/json'},body:JSON.stringify({type:'mealie_atelier/alarm_create',timer:arg})});return {status:r.status,body:await r.json()}}",
            {"id": timer_id, "label": "Closed-browser timer", "deadline": due},
        )
        assert r["status"] == 200, r
        a.close()
        b.close()
        browser.close()
        time.sleep(4)
        assert events()["alerts"], events()
        assert "Closed-browser timer" in events()["alerts"][0]["message"]
        report.append("Timer fired through Home Assistant notify mock after both browsers closed")
    print("\n".join("PASS: " + x for x in report))
finally:
    web.terminate()
    mock.terminate()
    try:
        web.wait(timeout=3)
    except subprocess.TimeoutExpired:
        web.kill()
    try:
        mock.wait(timeout=3)
    except subprocess.TimeoutExpired:
        mock.kill()

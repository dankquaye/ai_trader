from playwright.sync_api import sync_playwright, expect
import os
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console logs
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}", flush=True))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}", flush=True))

    # Navigate to the local server
    page.goto("http://localhost:3000/index.html")

    # Wait for DOM
    page.wait_for_load_state("domcontentloaded")

    # 1. Switch to "Auto" (AI Robot) tab
    print("Navigating to Auto tab...", flush=True)
    auto_nav = page.locator("button.nav-btn").filter(has_text="Auto")
    expect(auto_nav).to_be_visible()
    auto_nav.click()

    # 2. Check for "One Click Setup" Heading and Presets
    print("Checking One Click Setup...", flush=True)
    expect(page.locator("h3", has_text="One Click Setup")).to_be_visible()

    # 3. Check Token Input Visibility (Should be hidden if config.js works)
    # Since we added config.js with valid structure, input should remain hidden
    # and auth should attempt.
    print("Checking Token Input Visibility...", flush=True)
    token_input = page.locator("#api-token-input")

    # We expect it to be hidden because config.js is present (created in previous steps)
    # However, verify_ui.py runs in a fresh browser context.
    # The server serves config.js.

    # Let's wait a moment for app.js init logic
    page.wait_for_timeout(1000)

    # Check if hidden class is present
    # expect(token_input).not_to_be_visible() # This checks visibility style/layout
    # But it has 'hidden' class which sets display:none.

    # Actually, Playwright's not_to_be_visible() works for display:none.
    expect(token_input).not_to_be_visible()
    print("Token input is hidden (Config loaded).", flush=True)

    # 4. Take screenshot
    if not os.path.exists("verification"):
        os.makedirs("verification")

    print("Taking screenshot...", flush=True)
    page.screenshot(path="verification/dashboard_fix_ui.png")
    print("Screenshot taken.", flush=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

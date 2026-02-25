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

    # Wait for Loader to vanish
    print("Waiting for loader...", flush=True)
    page.wait_for_selector("#loading-overlay", state="hidden", timeout=10000)

    # 1. Check for "ELITE EXECUTION" Header
    print("Checking Header...", flush=True)
    expect(page.locator("h1", has_text="ELITE")).to_be_visible()

    # 2. Check Sidebar Navigation (Dashboard)
    print("Checking Dashboard Nav...", flush=True)
    dash_nav = page.locator("button.nav-btn[data-target='dashboard']")
    expect(dash_nav).to_be_visible()

    # 3. Check for Chart Container
    print("Checking Chart...", flush=True)
    expect(page.locator("#chart-container")).to_be_visible()

    # 4. Check Debugger Panel Presence
    print("Checking Debugger Panel...", flush=True)
    expect(page.locator("text=Execution Debugger")).to_be_visible()
    expect(page.locator("#debug-state")).to_be_visible()

    # 5. Check Token Input (Should be hidden if config loaded)
    print("Checking Token Input...", flush=True)
    token_input = page.locator("#api-token-input")

    if token_input.is_visible():
        print("Token input is visible.", flush=True)
    else:
        print("Token input is hidden (Config loaded).", flush=True)
        expect(token_input).to_be_hidden()

    # 6. Take screenshot
    if not os.path.exists("verification"):
        os.makedirs("verification")

    print("Taking screenshot...", flush=True)
    page.screenshot(path="verification/dashboard_elite.png")
    print("Screenshot taken.", flush=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

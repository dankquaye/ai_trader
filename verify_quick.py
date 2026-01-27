from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture logs
    page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # Navigate to the local server
    print("Navigating...")
    try:
        page.goto("http://localhost:8080/index.html", wait_until="domcontentloaded", timeout=10000)
    except Exception as e:
        print(f"Navigation failed or timed out: {e}")
        # Capture screenshot anyway
        page.screenshot(path="debug_restore.png")
        browser.close()
        return

    # 1. Switch to "Auto" (AI Robot) tab
    print("Navigating to Auto tab...")
    try:
        auto_nav = page.locator("button.nav-btn").filter(has_text="Auto")
        auto_nav.click(timeout=5000)
    except Exception as e:
        print(f"Click failed: {e}")
        page.screenshot(path="debug_click_fail.png")

    # 2. Check for "One Click Setup" Heading
    print("Checking One Click Setup...")
    try:
        expect(page.get_by_role("heading", name="One Click Setup")).to_be_visible(timeout=5000)
        print("One Click Setup Visible!")
    except:
        print("One Click Setup NOT Visible")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

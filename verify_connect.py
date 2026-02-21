from playwright.sync_api import sync_playwright, expect
import os
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the local server
    page.goto("http://localhost:8080/index.html")

    # 1. Check Input is Gone
    print("Checking if input is gone...")
    expect(page.locator("#api-token-input")).to_have_count(0)

    # 2. Check Auto-Connect
    print("Checking auto-connection (green status)...")
    status = page.locator("#connection-status")
    # Expect it to eventually have the green class
    expect(status).to_have_class(re.compile(r"bg-green-500"), timeout=15000)

    # 3. Check Account Selector
    print("Checking account selector...")
    selector = page.locator("#account-selector")
    expect(selector).to_be_visible()

    # Take screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")
    page.screenshot(path="/home/jules/verification/connected.png")
    print("Verification complete.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

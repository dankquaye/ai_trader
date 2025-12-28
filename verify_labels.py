from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the local server
    page.goto("http://localhost:8080/index.html")

    # Wait for DOM
    page.wait_for_load_state("domcontentloaded")

    print("Verifying accessibility attributes...")

    # 1. Header Inputs
    expect(page.locator("#api-token-input")).to_have_attribute("aria-label", "API Token")
    expect(page.locator("#account-selector")).to_have_attribute("aria-label", "Account Type")
    print("Header inputs verified.")

    # 2. Asset Selector
    expect(page.locator("#asset-selector")).to_have_attribute("aria-label", "Select Asset")
    print("Asset selector verified.")

    # 3. Trading Controls Labels
    expect(page.get_by_text("Duration (t)")).to_have_attribute("for", "duration")
    expect(page.get_by_text("Stake ($)")).to_have_attribute("for", "stake")
    print("Trading control labels verified.")

    # 4. AI Robot Labels (checking a few)
    # Note: These might be hidden by default (display:none), but they exist in DOM.
    # Playwright's locator assertions work on hidden elements for attributes?
    # Yes, checking attribute doesn't require visibility.
    expect(page.locator("label:text('Strategy Type')")).to_have_attribute("for", "bot-strategy")
    expect(page.locator("label:text('Risk Level')")).to_have_attribute("for", "bot-risk")
    print("AI Robot labels verified.")

    # 5. Backtest Labels
    expect(page.locator("label:text('Asset')").last).to_have_attribute("for", "bt-asset") # 'Asset' appears twice? No, Asset Selector has no label text.
    # Check specifically in backtest section if needed.

    # 6. Modal Close
    expect(page.locator(".modal-close").first).to_have_attribute("aria-label", "Close Modal")
    print("Modal close verified.")

    # Take screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    page.screenshot(path="/home/jules/verification/labels_check.png")
    print("Screenshot taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:8080/index.html")
    page.wait_for_load_state("domcontentloaded")

    # Navigate to History tab
    history_nav = page.locator("button.nav-btn").filter(has_text="History")
    expect(history_nav).to_be_visible()
    history_nav.click()

    # The empty state should not be visible right away until we trigger the function
    # Let's run `updateTradeHistory([], 0, 0, 0)` via page.evaluate
    page.evaluate("window.updateTradeHistory([], 0, 0, 0)")

    # Check for empty state text
    empty_state_text = page.locator("td").filter(has_text="No trades have been executed yet.")
    expect(empty_state_text).to_be_visible()

    expect(page.locator("td").locator("i.fa-inbox")).to_be_visible()

    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    page.screenshot(path="/home/jules/verification/history_empty_state.png")
    print("Screenshot taken.")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)

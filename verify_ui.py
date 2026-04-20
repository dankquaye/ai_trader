from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate to the local server
    page.goto("http://localhost:3000/index.html")

    # Wait for DOM
    page.wait_for_load_state("domcontentloaded")

    # 1. Switch to "Auto" (AI Robot) tab
    print("Navigating to Auto tab...")
    # The nav buttons have icons and text, let's find by text "Auto"
    auto_nav = page.locator("button.nav-btn").filter(has_text="Auto")
    expect(auto_nav).to_be_visible()
    auto_nav.click()

    # 2. Check for "One Click Setup" Heading and Presets
    print("Checking One Click Setup...")
    # 'One Click Setup' is an h3
    expect(page.get_by_role("heading", name="One Click Setup")).to_be_visible()

    # Check for preset buttons
    expect(page.get_by_role("button", name="Conservative AI")).to_be_visible()
    expect(page.get_by_role("button", name="Balanced AI")).to_be_visible()
    expect(page.get_by_role("button", name="Growth AI")).to_be_visible()

    # 3. Switch to "Test" (Backtest) tab
    print("Navigating to Backtest tab...")
    test_nav = page.locator("button.nav-btn").filter(has_text="Test")
    expect(test_nav).to_be_visible()
    test_nav.click()

    # 4. Check Backtest UI
    print("Checking Backtest UI...")
    expect(page.get_by_role("heading", name="Strategy Backtester")).to_be_visible()
    expect(page.get_by_role("button", name="Run Simulation")).to_be_visible()

    # Take screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    page.screenshot(path="/home/jules/verification/dashboard.png")
    print("Screenshot taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

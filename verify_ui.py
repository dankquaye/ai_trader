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

    # Check for preset buttons
    expect(page.get_by_role("button", name="Conservative AI")).to_be_visible()
    expect(page.get_by_role("button", name="Balanced AI")).to_be_visible()
    expect(page.get_by_role("button", name="Growth AI")).to_be_visible()

    # 3. Check for New Features
    print("Checking New Features...", flush=True)

    # Check Notification Checkbox
    print("Checking Notification Checkbox...", flush=True)
    expect(page.locator("#enable-notifications")).to_be_visible()

    # Check Strategy Dropdown for 'Candlestick Patterns'
    print("Checking Strategy Dropdown...", flush=True)
    strategy_select = page.locator("#bot-strategy")
    expect(strategy_select).to_be_visible()
    expect(strategy_select).to_contain_text("Candlestick Patterns")

    # 4. Switch to "Test" (Backtest) tab
    print("Navigating to Backtest tab...", flush=True)
    test_nav = page.locator("button.nav-btn").filter(has_text="Test")
    expect(test_nav).to_be_visible()
    test_nav.click()

    # 5. Check Backtest UI
    print("Checking Backtest UI...", flush=True)
    expect(page.get_by_role("heading", name="Strategy Backtester")).to_be_visible()
    expect(page.get_by_role("button", name="Run Simulation")).to_be_visible()

    # Take screenshot
    if not os.path.exists("verification"):
        os.makedirs("verification")

    print("Taking screenshot...", flush=True)
    page.screenshot(path="verification/dashboard_v2.png")
    print("Screenshot taken.", flush=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

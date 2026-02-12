from playwright.sync_api import sync_playwright, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080/index.html")

    # Wait for bot to be initialized
    page.wait_for_function("window.bot !== undefined")

    # Inject dummy trade
    page.evaluate("window.bot.tradeHistory.push({ time: '12:00:00', symbol: 'TEST_100', type: 'CALL', stake: 10, profit: 9.5, status: 'WIN', grade: 'A', reasoning: { finalScore: 0.9 } });")

    # Open Modal via function call
    page.evaluate("openModal(0)")

    # Verify Modal Visibility (opacity-0 removed)
    modal = page.locator("#reasoning-modal")
    expect(modal).not_to_have_class(re.compile(r"opacity-0"))
    expect(modal).not_to_have_class(re.compile(r"pointer-events-none"))
    print("Modal Opened successfully (visible and interactive).")

    # Verify Close Button Accessibility
    close_btn = modal.locator("button.modal-close").first
    expect(close_btn).to_be_visible()
    expect(close_btn).to_have_attribute("aria-label", "Close modal")
    print("Close button is accessible (button tag + aria-label).")

    # Click Close Button
    close_btn.click()

    # Verify Modal Closed
    expect(modal).to_have_class(re.compile(r"opacity-0"))
    expect(modal).to_have_class(re.compile(r"pointer-events-none"))
    print("Modal Closed successfully.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

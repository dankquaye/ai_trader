from playwright.sync_api import sync_playwright, expect
import re
import os

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

    # Verify Modal Visibility
    modal = page.locator("#reasoning-modal")
    expect(modal).not_to_have_class(re.compile(r"opacity-0"))

    # Highlight the close button
    close_btn = modal.locator("button.modal-close").first
    # highlight() is not standard in python sync api, we can use eval to style it border red
    close_btn.evaluate("el => el.style.border = '2px solid red'")

    # Take screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    page.screenshot(path="/home/jules/verification/modal.png")
    print("Screenshot taken at /home/jules/verification/modal.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

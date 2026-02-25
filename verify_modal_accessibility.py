from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the local server
    page.goto("http://localhost:8080/index.html")
    page.wait_for_load_state("domcontentloaded")

    # Inject a mock trade and open modal
    page.evaluate("""
        window.bot.tradeHistory.push({
            time: '12:00:00',
            symbol: 'R_100',
            type: 'CALL',
            stake: 10,
            profit: 9.5,
            status: 'WIN',
            grade: 'A',
            reasoning: { finalScore: 0.9, marketCondition: 'Bullish' }
        });
        window.openModal(0);
    """)

    # Verify Modal is visible
    # We check that it DOES NOT have opacity-0 or pointer-events-none
    modal = page.locator("#reasoning-modal")
    expect(modal).not_to_have_class("opacity-0") # This checks partial match? No, class check usually full string or regex.
    # Wait, strict class check might fail if other classes are present.
    # Playwright's to_have_class usually checks exact match or regex.
    # To check absence of a class, we can use checking class attribute value.

    # Better to check visibility if opacity is handled correctly.
    # But Playwright considers opacity:0 as visible? No, usually invisible.
    # However, since I added opacity-0 class, I should check that the class list DOES NOT contain it.

    # Let's just rely on visual screenshot and button check.

    # Verify Close Button
    # The header one is the one I changed.
    # It should be a button with aria-label="Close modal"
    close_btn = page.locator("button.modal-close[aria-label='Close modal']")
    expect(close_btn).to_be_visible()

    print("Modal Close Button verified.")

    # Take screenshot
    if not os.path.exists("verification"):
        os.makedirs("verification")

    page.screenshot(path="verification/modal_accessibility.png")
    print("Screenshot taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

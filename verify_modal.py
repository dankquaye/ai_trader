from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080/index.html")
    page.wait_for_load_state("domcontentloaded")

    # Open modal
    print("Opening modal...")
    # Mock a trade and open modal
    page.evaluate("""
        window.bot.tradeHistory = [{
            time: '10:00:00', symbol: 'R_100', type: 'CALL', stake: 10, profit: 9, status: 'WIN', grade: 'A', reasoning: { finalScore: 0.9 }
        }];
        openModal(0);
    """)

    # Check visibility (check class list for absence of opacity-0)
    modal = page.locator("#reasoning-modal")
    # Wait for transition
    page.wait_for_timeout(300)

    # Verify modal does NOT have opacity-0 class
    classes = modal.get_attribute("class")
    if "opacity-0" in classes:
        raise Exception(f"Modal should be visible but has classes: {classes}")
    print("Modal opened and visible.")

    # Check Close Button Accessibility
    # The close button in the header is what we changed. It's the first one usually, or inside the title bar.
    # Let's be specific: the one with the icon.
    close_btn = page.locator("button.modal-close:has(i.fa-xmark)")

    if close_btn.count() == 0:
         raise Exception("Close button not found or is not a <button> tag")

    expect(close_btn).to_have_attribute("aria-label", "Close modal")
    expect(close_btn).to_have_attribute("type", "button")
    print("Close button is accessible (button tag + aria-label).")

    # Click Close
    close_btn.click()

    # Wait for transition
    page.wait_for_timeout(300)

    # Check hidden
    classes = modal.get_attribute("class")
    if "opacity-0" not in classes:
        raise Exception(f"Modal should be hidden but has classes: {classes}")
    print("Modal closed.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

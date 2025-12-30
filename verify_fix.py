from playwright.sync_api import sync_playwright, expect
import os
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the local server
    page.goto("http://localhost:8080/index.html")
    page.wait_for_load_state("domcontentloaded")

    print("Page loaded.")

    # 1. Verify Navigation (Check if setupEventListeners works)
    print("Testing Navigation to Auto tab...")
    auto_btn = page.locator("button.nav-btn").filter(has_text="Auto")
    auto_section = page.locator("#ai-robot")

    # Ensure button is visible
    expect(auto_btn).to_be_visible()

    # Click it
    auto_btn.click()

    # Check if section becomes visible (it has 'hidden' class initially)
    # The listener removes 'hidden'.
    expect(auto_section).not_to_have_class("hidden")
    print("Navigation works! setupEventListeners is active.")

    # 2. Verify Modal Accessibility
    print("Testing Modal Accessibility...")

    # Open modal manually via JS since we might not have trade history
    page.evaluate("openModal('test')") # Passing a dummy ID might fail if logic checks existence
    # Let's mock the trade history or just modify DOM to show modal
    # openModal takes an index. Let's push a dummy trade first.
    page.evaluate("""
        bot.tradeHistory.push({
            time: '2023-10-27', symbol: 'R_100', type: 'CALL', stake: 10, profit: 5, status: 'WIN', grade: 'A',
            reasoning: { finalScore: 0.9, ai: {buy: 0.9, sell: 0.1} }
        });
        openModal(0);
    """)

    # Check if modal is visible
    modal = page.locator("#reasoning-modal")
    expect(modal).not_to_have_class("hidden")
    expect(modal).not_to_have_class("opacity-0")
    expect(modal).not_to_have_class("pointer-events-none")
    print("Modal opened.")

    # Check Close Button
    close_btn = page.locator("button.modal-close").first
    expect(close_btn).to_be_visible()

    # Check ARIA label
    label = close_btn.get_attribute("aria-label")
    print(f"Close button aria-label: {label}")
    if label != "Close modal":
        raise Exception("Close button missing correct aria-label")

    # Check Focus Trap (Simple check: is focus on the close button?)
    # We added `closeBtn.focus()` in openModal
    # Note: Focus check in headless might be tricky, but we can check document.activeElement
    is_focused = page.evaluate("document.activeElement === document.querySelector('.modal-close')")
    print(f"Close button focused: {is_focused}")

    # Verify clicking close button works
    close_btn.click()
    expect(modal).to_have_class(re.compile(r"hidden"))
    print("Modal closed.")

    # Take screenshot
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    # Open modal again for screenshot
    page.evaluate("openModal(0)")
    page.screenshot(path="/home/jules/verification/modal_fix.png")
    print("Screenshot taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

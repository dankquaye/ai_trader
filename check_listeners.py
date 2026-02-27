
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8081")

    # Wait for the DOM
    page.wait_for_load_state("domcontentloaded")

    # Force reload to ensure js is fresh
    page.reload()
    page.wait_for_load_state("domcontentloaded")

    # 1. Navigation Test
    print("Testing Navigation...")
    ai_nav = page.locator("button[data-target='ai-robot']")

    # Force click
    ai_nav.click(force=True)

    # Wait for the section to be visible
    # Note: 'hidden' class is removed in app.js.
    # Tailwind's hidden is display: none.
    # Check if 'hidden' class is REMOVED
    page.wait_for_function("!document.getElementById('ai-robot').classList.contains('hidden')", timeout=5000)
    print("Navigation to AI Robot successful.")

    # 2. Modal Accessibility Test
    print("Testing Modal Accessibility...")

    # Verify initial state
    modal = page.locator("#reasoning-modal")
    # Should have 'invisible', 'opacity-0', 'pointer-events-none'
    classes = modal.get_attribute("class")
    if "invisible" not in classes or "opacity-0" not in classes:
        print(f"FAIL: Modal should be hidden initially. Classes: {classes}")
        return

    if modal.get_attribute("aria-hidden") != "true":
        print(f"FAIL: Modal should have aria-hidden='true'. Found: {modal.get_attribute('aria-hidden')}")
        return

    # Open Modal (Hack: Inject a trade into history and click it)
    page.evaluate("""
        window.bot.tradeHistory = [{
            time: '10:00:00', symbol: 'R_100', type: 'CALL', stake: 10, profit: 5, status: 'WIN', grade: 'A',
            reasoning: { finalScore: 0.9, trend: {buy: 1}, momentum: {buy: 1}, volatility: 0.8 }
        }];
        window.updateTradeHistory(window.bot.tradeHistory, 5, 1, 0);
    """)

    # Click the "Details" button in the history table
    # The history table is in the #history section, but updateTradeHistory updates the DOM regardless of visibility
    # However, to click it, we might need to go to History tab OR just click it if it's in the DOM.
    # Actually, we can just call openModal(0) directly to test the modal logic itself.
    print("Opening modal via JS...")
    page.evaluate("openModal(0)")

    # Wait for modal to be visible (invisible class removed)
    # Using specific class check as Playwright 'visible' might be tricky with opacity transitions
    page.wait_for_function("!document.getElementById('reasoning-modal').classList.contains('invisible')", timeout=2000)

    # Check aria-hidden
    if modal.get_attribute("aria-hidden") != "false":
        print("FAIL: Modal aria-hidden should be 'false' when open.")
        return

    # Check Close Button focus (simulated check)
    # Playwright's page.evaluate("document.activeElement")
    active_el = page.evaluate("document.activeElement.className")
    if "modal-close" not in active_el:
         print(f"WARNING: Focus might not have moved to close button. Active element class: {active_el}")

    # Close Modal
    print("Closing modal...")
    # Click the close button inside the title bar
    close_btn = page.locator("#reasoning-modal .modal-close").first
    close_btn.click(force=True)

    # Wait for invisible class (added after 300ms)
    # Note: wait_for_selector waits for element to appear in DOM.
    # To check for class presence, we can use CSS selector
    page.wait_for_function("document.getElementById('reasoning-modal').classList.contains('invisible')", timeout=2000)

    if modal.get_attribute("aria-hidden") != "true":
         print("FAIL: Modal aria-hidden should be 'true' after close.")
         return

    print("Modal Accessibility Logic Verified.")
    browser.close()

with sync_playwright() as p:
    run(p)

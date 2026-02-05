from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console logs
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    page.goto("http://localhost:8080/index.html")
    page.wait_for_load_state("domcontentloaded")

    print("1. Checking #btn-pause-bot accessibility...")
    pause_btn = page.locator("#btn-pause-bot")
    try:
        expect(pause_btn).to_have_attribute("aria-label", "Pause Bot")
        print("PASS: #btn-pause-bot has aria-label")
    except Exception as e:
        print(f"FAIL: #btn-pause-bot missing aria-label: {e}")
        raise e

    print("2. Opening Modal...")
    page.evaluate("""
        if (!window.bot.tradeHistory) window.bot.tradeHistory = [];
        window.bot.tradeHistory.push({
            time: '12:00:00',
            symbol: 'R_100',
            type: 'CALL',
            stake: 10,
            profit: 9.5,
            status: 'WIN',
            grade: 'A',
            reasoning: { finalScore: 0.9 }
        });
        window.openModal(window.bot.tradeHistory.length - 1);
    """)

    try:
        page.wait_for_function("!document.getElementById('reasoning-modal').classList.contains('opacity-0')")
        print("PASS: Modal opened")
    except Exception as e:
        print(f"FAIL: Modal did not open: {e}")
        raise e

    # Debug: Check how many close buttons found
    count = page.evaluate("ui.modal.closes.length")
    print(f"DEBUG: ui.modal.closes.length = {count}")

    print("3. Checking Modal Close Button...")
    close_btn = page.locator("button.modal-close[aria-label='Close modal']").first

    try:
        expect(close_btn).to_be_visible()
        print("PASS: Close button is visible, is a <button>, and has aria-label")
    except Exception as e:
        print(f"FAIL: Close button check failed: {e}")
        raise e

    print("4. Closing Modal...")
    close_btn.click()

    try:
        page.wait_for_function("document.getElementById('reasoning-modal').classList.contains('opacity-0')", timeout=5000)
        print("PASS: Modal closed")
    except Exception as e:
        print(f"FAIL: Modal did not close: {e}")
        # Debug: check if class still missing
        classes = page.evaluate("document.getElementById('reasoning-modal').className")
        print(f"DEBUG: Modal classes: {classes}")
        raise e

    print("Verified: Accessibility improvements are functional.")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)


from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8081")

    # Wait for the DOM
    page.wait_for_load_state("domcontentloaded")

    # Inject a trade to make history available
    page.evaluate("""
        window.bot.tradeHistory = [{
            time: '12:00:00', symbol: 'R_100', type: 'CALL', stake: 10, profit: 5, status: 'WIN', grade: 'A',
            reasoning: { finalScore: 0.95, trend: {buy: 1}, momentum: {buy: 1}, volatility: 0.8 }
        }];
        window.updateTradeHistory(window.bot.tradeHistory, 5, 1, 0);
    """)

    # Open Modal via function
    page.evaluate("openModal(0)")

    # Wait for modal to be visible
    page.wait_for_selector("#reasoning-modal:not(.invisible)")

    # Take screenshot of open modal
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    page.screenshot(path="/home/jules/verification/modal_open.png")
    print("Screenshot taken: modal_open.png")

    browser.close()

with sync_playwright() as p:
    run(p)

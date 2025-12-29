from playwright.sync_api import sync_playwright, expect
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:8080/index.html")
        page.wait_for_load_state("domcontentloaded")

        # Verify API Token Input has aria-label
        token_input = page.locator("#api-token-input")
        expect(token_input).to_have_attribute("aria-label", "Deriv API Token")
        print("✅ API Token Input has aria-label")

        # Verify Account Selector has aria-label
        account_selector = page.locator("#account-selector")
        expect(account_selector).to_have_attribute("aria-label", "Account Type")
        print("✅ Account Selector has aria-label")

        # Verify Connection Status has role status
        status = page.locator("#connection-status")
        expect(status).to_have_attribute("role", "status")
        expect(status).to_have_attribute("aria-label", "Connection Status: Disconnected")
        print("✅ Connection Status has correct role and label")

        # Verify Duration Label
        duration_label = page.locator("label[for='duration']")
        expect(duration_label).to_be_visible()
        print("✅ Duration Label has 'for' attribute")

        # Verify Stake Label
        stake_label = page.locator("label[for='stake']")
        expect(stake_label).to_be_visible()
        print("✅ Stake Label has 'for' attribute")

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        sys.exit(1)
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)

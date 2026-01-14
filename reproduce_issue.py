from playwright.sync_api import sync_playwright, expect
import os
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080/index.html")

    print("Checking Support Form accessibility...")

    # Check Support Form Inputs
    support_nav = page.locator("button.nav-btn").filter(has_text="Help")
    if support_nav.count() > 0:
        support_nav.click()
        page.wait_for_timeout(500) # Wait for tab switch

        # Find inputs in the support section
        support_section = page.locator("#support")
        inputs = support_section.locator("input, textarea")

        count = inputs.count()
        print(f"Found {count} inputs in Support section.")

        issues_found = 0
        for i in range(count):
            inp = inputs.nth(i)
            # Check if it has a label
            label = inp.evaluate("el => el.labels && el.labels.length > 0")
            aria_label = inp.get_attribute("aria-label")
            placeholder = inp.get_attribute("placeholder")

            if not label and not aria_label:
                print(f"❌ Input {i} (placeholder='{placeholder}') has NO label or aria-label.")
                issues_found += 1
            else:
                print(f"✅ Input {i} has accessible name.")

        # Check Modal Close Buttons
        print("\nChecking Modal Close Buttons...")
        close_buttons = page.locator(".modal-close")
        count = close_buttons.count()
        for i in range(count):
            btn = close_buttons.nth(i)
            tag_name = btn.evaluate("el => el.tagName.toLowerCase()")
            aria_label = btn.get_attribute("aria-label")
            text_content = btn.text_content().strip()

            if tag_name != "button":
                print(f"❌ Modal Close Button {i} is a <{tag_name}>, not a <button>.")
                issues_found += 1
            elif not aria_label and not text_content:
                print(f"❌ Modal Close Button {i} is missing aria-label and has no text content.")
                issues_found += 1
            else:
                 print(f"✅ Modal Close Button {i} is accessible (Label: '{aria_label or text_content}')")

        # Check Pause Bot Button
        print("\nChecking Pause Bot Button...")
        pause_btn = page.locator("#btn-pause-bot")
        if pause_btn.count() > 0:
            aria_label = pause_btn.get_attribute("aria-label")
            if not aria_label:
                print("❌ Pause Bot Button is missing aria-label.")
                issues_found += 1
            else:
                print(f"✅ Pause Bot Button has aria-label: '{aria_label}'")

        if issues_found > 0:
            print(f"\nFound {issues_found} accessibility issues.")
        else:
            print("\nNo accessibility issues found! 🎨")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

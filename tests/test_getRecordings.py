import os
import pytest
import re
import selenium

from collections import defaultdict
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import (
    NoSuchElementException,
    ElementNotVisibleException,
    WebDriverException,
)

from lectureDL import getRecordingsPage

TESTS_DIR = 'tests'

settings = defaultdict(lambda: None, {
    'hide_window': False,
})


@pytest.fixture
def driver():
    chrome_options = Options()
    window_size = settings.get('window_size', '1600,900')
    chrome_options.add_argument('--window-size=' + window_size)
    if settings['hide_window']:
        print('Running in headless (hidden window) mode.')
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')  # TODO: Remove this
    driver = webdriver.Chrome('ChromeDriver/chromedriver 2.31',
                              chrome_options=chrome_options)
    yield driver
    print('Quitting driver')
    driver.quit()

def test_getRecordingsPage(driver):
    for i in os.listdir(TESTS_DIR):
        if not re.match(r'^test_getRecordings[0-9]+.html$', i):
            continue
        i = 'file://' + os.path.join(os.getcwd(), TESTS_DIR, i)
        print(i)
        driver.get(i)
        recs_list, recs_ul = getRecordingsPage(driver)
        print(recs_list)
        print(recs_ul)
        assert 0

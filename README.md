# Unimelb Lecture Downloader

This is a program that allows you to easily download all your lectures for
all your subjects. It does this by piloting the browser and navigating
through the LMS on your behalf.

## What it does:
- Logs in to the Unimelb LMS.
- Builds a list of the subjects.
- For each subject, navigates through to the Echocenter (Lecture Capture System).
- Builds a list of the lectures.
- For each lecture, queue up a download. The lectures are downloaded in a separate thread while the main thread continues to collect links by navigating through the LMS.
- Downloads all of the queued downloads to the appropriate folders.

## Features
The lecture downloader is able to:

- ~ Download only some of your subjects.
- ~ Download video or audio copies of the lectures.
- ~ Download specific weeks.
- ~ Download from the current week onwards.
- ~ Choose where to download the lectures to.
- ~ Autogenerate folders for each subject.
- ~ Assign week numbers based on date and appends lecture numbers if there are more than one lecture per week - formatted eg. "LING30001 Week 1 Lecture 02.m4v"
- Find pre-existing folders for each subject (given appropriate naming, see the **Naming your folders** section below).
- Skip lectures that you've already downloaded.
- Resume downloads that were cancelled partway through.
- Display a progress bar as you download each lecture.
- ~ Read the username and password from the settings file.
- ~ Run in headless mode (where the Chrome window is hidden).
- ~ Run with different settings files with minimal modification, for example if you are both a student and a tutor and you want to download the lectures for both.

The features with the `~` are configurable through the settings file(s).

**Note that you do not *need* to use a settings file, you can run the program
without the settings file and it will just fall back to defaults and ask you
for any required information.**

## Setup:
lectureDL is written in [Python 3](http://python.org/downloads) and uses the [Selenium library](http://selenium-python.readthedocs.io) coupled with [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/).

### Pre-installation steps
- Make sure you have Chrome installed.
- Get the latest Chromedriver for your system from [here.](https://sites.google.com/a/chromium.org/chromedriver/downloads) You might have to modify the code to point to this Chromedriver. For some easy instructions:
    - Download Chromedriver and drag it into this folder.
    - Go to the line `driver = webdriver.Chrome('ChromeDriver/chromedriver 2.31', chrome_options=chrome_options)` and change it to `driver = webdriver.Chrome('chromedriver', chrome_options=chrome_options)`
    - In the future you might need to download a new Chromedriver, so make sure you keep track of which is which (perhaps by renaming it to `chromedriver <version>`, like `chromedriver2.32`).
- Edit the settings. See the **Configuration** section.
- Make sure your clock is correct. If it is the wrong day, the script will crash.

### MacOS
Prerequsities:

- Make sure you have [brew](https://brew.sh) installed.
- Python 3.6 or greater. It's easiest to install this with the installer from [https://www.python.org](https://www.python.org).

Setup instructions:
```
python3.6 -m venv myvenv
source myvenv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python lectureDL.py  # Success!!!
```

### Linux
These steps have been tested on Ubuntu 16.04, adapt accordingly to your system.

Prerequsities:
- Python 3.6 or greater. Follow the instructions in [this](https://askubuntu.com/questions/865554/how-do-i-install-python-3-6-using-apt-get) Stack Overflow article.

Setup instructions:
```
# Install Python 3.6 virtualenv stuff
sudo apt-get install python3.6-venv
# Now just follow the MacOS instructions
```

## How to use
TODO youtube vid
Emphasise that you need to bring the terminal back up to the front. Don't enter the password manually.

## Configuration
TODO

## Additional notes

### Differences in this fork from original
See the file `other/initial_differences.md`. There have been many more improvements since that markdown file was written.

### To do list
See the file `other/todo.md`.

### Setup for a new semester
See the file `other/heads_up_2017_07_29.md`.

### Improving reliability
Note: I'd recommend hiding subjects that are not active this semester because the script may try to find lecture recordings for past semesters. These days this is probably not necessary, but if you're having issues this might help.

![Subject list](other/subj_list_screenshot.png?raw=true "Click on the gear to hide subjects")

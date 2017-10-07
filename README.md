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
- Find pre-existing folders for each subject (given appropriate naming, pretty much just make sure that your subject folder names have the subject code in them).
- Skip lectures that you've already downloaded.
- Resume downloads that were cancelled partway through.
- Display a progress bar as you download each lecture.
- ~ Read the username and password from the settings file.
- ~ Run in headless mode (where the Chrome window is hidden).
- ~ Run with different settings files with minimal modification, for example if you are both a student and a tutor and you want to download the lectures for both.

The features with the `~` are configurable through the settings file(s).

**Note that you do *not* need to use a settings file, you can run the program
without the settings file and it will just fall back to defaults and ask you
for any required information.**

## Setup:
lectureDL is written in [Python 3](http://python.org/downloads) and uses [Selenium](http://selenium-python.readthedocs.io), coupled with [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/).

Clone or download the zip of this repo to get started.

### Pre-installation steps
- Make sure you have Chrome installed and updated.
- Get the latest Chromedriver for your system from [here.](https://sites.google.com/a/chromium.org/chromedriver/downloads) You might have to modify the code to point to this Chromedriver. For some easy instructions:
    - Download Chromedriver and drag it into this folder.
    - Go to `setting_base.py` and change the value for `'driver_relative_path'` to the name of your chromedriver download (probably just `chromedriver` by default).
    - If you put it in the `ChromeDriver` folder, you'll need to make this value `ChromeDriver/chromedriver` instead.
    - In the future you might need to download a new Chromedriver, so make sure you keep track of which is which (perhaps by renaming it to `chromedriver <version>`, like `chromedriver2.32`).
- Edit the settings, see the **Configuration** section. Or just delete `settings.py` and let it ask you for the information that it needs.
- Make sure your clock is correct. If it is the wrong date, the script will crash.

### MacOS
Prerequsities:

- You probably want to have [brew](https://brew.sh) installed.
- Python 3.6 or greater. Install this with brew if possible, though it's also fine to use the installer from [https://www.python.org](https://www.python.org).

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
TODO youtube tutorial vid maybe.

Emphasise that you need to bring the terminal back up to the front. Don't enter the password manually, but do it through the terminal window.

## Configuration
You'll notice there are 3 settings files.

### `settings_base.py`
This file is for storing settings that you want for all your different downloading
profiles. This is only really relevant if you want to download from different LMS
accounts, for example if you're both a tutor and a student.

### `settings_example.py`
This is where settings specific to a particular login go. Besides your username
and password, there are other settings here. All the settings options are commented,
so it should be pretty easy to change them to what you want.

`settings_example.py` imports the settings from `settings_base.py` first, and
then applies the settings from itself, overwriting the `settings_base.py` settings
if there are clashes. If you only had one login, you could just put all your
settings in this file and do away with `settings_base.py`.

### `settings.py`
This is the file that `lectureDL.py` looks for when it starts. If you had two
settings files called `settings_tutoring.py` and `settings_personal.py`, you
could select which one you want to use here by changing the first line to
`from settings_tutoring import *` or `from settings_personal import *` accordingly.

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

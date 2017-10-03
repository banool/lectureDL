
import os

from collections import defaultdict
from settings_base import _settings_base, getLectureName

settings = {
    # Your LMS username and password.
    'username': 'porteousd',
    'password': 'mysecurepassword1234',
    # The weeks of lectures you want to download.
    'date_range': '1-12',
    # Where your uni folder exists.
    'uni_location': os.path.join(os.path.expanduser('~'), 'Downloads/Uni'),
    # If you've selected a uni_location that doesn't have subfolders for each
    # subject in it, set this option to True and it'll make them automatically.
    'auto_create_subfolders': True,
    # The name of the folder inside each subject's folder for holding the
    # lectures. Your folder structure might look like:
    # Uni/
    #     COMP300026 - Models of Computation/
    #         Assignment 1/
    #         Lectures/
    #     HIST10001 - Intro to Learning About Old Stuff/
    #         Lectures/
    #         Slides/
    #     Other Junk/
    #         blahblahblah.txt
    #     SPAN30016 - Spanish 7/
    #         Lectures/
    #         Readings/
    'lecture_subfolder_name': 'Lectures',
    # The format string for the subject folder names.
    # Currently: CODE - Name e.g. COMP10001 - Foundations of Algorithms
    # Ignored if 'auto_create_folders' is False.
    'default_auto_create_format': '{code} - {name}',
    # Which subjects to download. An empty string '' means all.
    # Use numbers otherwise, 1 being the first subject in the list e.g. 1,3,4
    'subject_choices': '',
}

# Merge settings_base and settings.
# If there is a key clash, we prefer the value in settings over _settings_base.
settings = defaultdict(lambda: None, {**_settings_base, **settings})

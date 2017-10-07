
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
    # The name of the folder inside each subject's folder for holding the lecs.
    # Note the example folder structure at the bottom of the file.
    'lecture_subfolder_name': 'Lectures',
    # The format string for the subject folder names.
    # Currently: CODE - Name e.g. COMP10001 - Foundations of Algorithms
    # Ignored if 'auto_create_folders' is False.
    # If false, the subject folder only needs to include the subject code.
    'default_auto_create_format': '{code} - {name}',
}

# Merge settings_base and settings.
# If there is a key clash, we prefer the value in settings over _settings_base.
settings = defaultdict(lambda: None, {**_settings_base, **settings})


# Example directory structure:
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
# Note that if you have auto_create_subfolders on, you don't need to make
# any of these subfolders yourself, just make sure uni_location exists.
# With auto_create_subfolders off, directory structure may look like this:
# Uni/
#     COMP300026 - MOC/
#         Assignment 1/
#         Lectures/
#     COMP300020 - DP/               
#         Declarative Programming Assignment 1/
#         Lectures/
#     Other Junk/
#         blahblahblah.txt
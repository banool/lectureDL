import os

from collections import defaultdict
from settings_base import _settings_base, getLectureName

settings = {
    'username': 'porteousd',
    'password': os.environ['UNIMELBPASS'],
    'date_range': '8-12',
    'lecture_subfolder_name': 'Lectures',
    'uni_location': os.path.join(os.path.expanduser('~'), 'Dropbox/uni2017'),
    'subject_folders': {
        'SWEN30006': 'SWEN30006 - SMD',
        'COMP30020': 'COMP30020 - DP',
        'COMP30026': 'COMP30026 - MOC',
        'INFO20003': 'INFO20003 - DBS',
    }
}

# Merge settings_base and settings.
# If there is a clash in keys, we use the value in settings.
settings = defaultdict(lambda: None, {**_settings_base, **settings})

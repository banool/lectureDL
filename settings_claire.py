import os

from collections import defaultdict
from settings_base import _settings_base, getLectureName

settings = {
    'username': 'channon',
    'password': os.environ['CLAIREPASS'],
    'date_range': '1-12',
    'lecture_subfolder_name': 'Lectures',
    'uni_location': os.path.join(os.path.expanduser('~'), 'Dropbox/uni2017/other/claire'),
    'auto_create_subfolders': True,
    # Ignored if 'auto_create_folders' is False.
    'default_auto_create_format': '{code} - {name}',
    'subject_choices': '',
}

# Merge settings_base and settings.
# If there is a clash in keys, we use the value in settings.
settings = defaultdict(lambda: None, {**_settings_base, **settings})

# Don't import this directly.

def getLectureName(lecture):
    ''' Sets the naming convention for lecture files.
    Current preference: COMP30022 Week 09 Lecture 1
    f'{lecture.subjCode} Week {lecture.week:02} Lecture {lecture.lecOfWeek}'
    Another preference: Models of Computation - L09
    f'{lec.subjName} - L{lec.recNum:02}'
    '''
    return f'{lecture.subjCode} Week {lecture.week:02} Lecture {lecture.lecOfWeek}'

_settings_base = {
    # Whether to download video or audio.
    'media_type': 'video',
    # Which subjects to download. An empty string '' means all.
    # Use numbers otherwise, 1 being the first subject in the list e.g. 1,3,4
    'subject_choices': '',
    # If True, set lower week to current week (i.e. If in week 5 = 5-12).
    # Generally set this option to True unless you forgot to run the script
    # for a whole week or you're running this for the first time.
    'update_lower_week': True,
    # Whether to hide the Chrome window or not.
    'hide_window': False,  # This is headless Chrome mode.
    # This is relative to where lectureDL.py is in the file system.
    'driver_relative_path': 'chromedriver',
}

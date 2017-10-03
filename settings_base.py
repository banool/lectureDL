# Don't import this directly.

def getLectureName(lecture):
    # My personal preference: COMP30022 Week 09 Lecture 1
    return f'{lecture.subjCode} Week {lecture.week:02} Lecture {lecture.lecOfWeek}'

_settings_base = {
    # Whether to download video or audio.
    'media_type': 'video',
    # If True, set lower week to current week (i.e. If in week 5 = 5-12).
    # Generally set this option to True unless you forgot to run the script
    # for a whole week or you're running this for the first time.
    'update_lower_week': False,
    # Whether to hide the Chrome window or not.
    'hide_window': False,  # This is headless Chrome mode.
}

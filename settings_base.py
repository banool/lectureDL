# Don't import this directly.

def getLectureName(lecture):
    # My personal preference: COMP30022 Week 09 Lecture 1
    return f"{lecture.subjCode} Week {lecture.week:02} Lecture {lecture.lecOfWeek}"

_settings_base = {
    'media_type': 'video',
    'subject_choices': '',
    # If True, set lower week to current week (i.e. week 5 = 5-12).
    'update_lower_week': False,
    'hide_window': False,  # This is headless Chrome mode.
}
